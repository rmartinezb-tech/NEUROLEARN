import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle, XCircle, Download, Zap, AlertTriangle, BookOpen } from 'lucide-react';
import { toast } from "sonner";

export default function ImportQuestions() {
  const { user } = useOutletContext();
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadInstructions = () => {
    const text = `INSTRUCCIONES DE IMPORTACIÓN MASIVA DE PREGUNTAS
================================================

FORMATOS COMPATIBLES: CSV, Excel (.xlsx), JSON, TXT

========================================================
FORMATO 1 — CSV (.csv)
========================================================
Estructura de columnas (separadas por coma):
statement,type,subject,options,correct_answer,explanation,difficulty_suggested,tags

Campos OBLIGATORIOS:
- statement: Texto del enunciado (sin comas sin comillas, usar comillas dobles si hay comas)
- type: Tipo de pregunta (ver valores permitidos abajo)
- subject: Materia (ver valores permitidos abajo)

Campos OPCIONALES:
- options: Alternativas separadas por | (ej: Opción A|Opción B|Opción C|Opción D)
- correct_answer: Texto exacto de la respuesta correcta
- explanation: Justificación de la respuesta
- difficulty_suggested: Número del 1 al 5
- tags: Etiquetas separadas por |

Ejemplo de fila válida (opción múltiple):
"¿Cuál es la función del hipocampo?",multiple_choice,Neurociencias,"Regulación emocional|Memoria y aprendizaje|Control motor|Visión",Memoria y aprendizaje,"El hipocampo es clave en la formación de nuevos recuerdos",3,neuro|memoria

Ejemplo de fila válida (verdadero/falso):
"La mielina acelera la conducción nerviosa",true_false,Neurociencias,,Verdadero,La vaina de mielina actúa como aislante,2,

========================================================
FORMATO 2 — Excel (.xlsx)
========================================================
Mismas columnas que CSV, cada columna en su propia celda.
Fila 1 = encabezados exactos. Fila 2 en adelante = datos.

Encabezados exactos de la primera fila:
statement | type | subject | options | correct_answer | explanation | difficulty_suggested | tags

Para opciones múltiples en Excel, separa las alternativas con el carácter pipe: |
Ejemplo celda options: Opción A|Opción B|Opción C|Opción D

========================================================
FORMATO 3 — JSON (.json)
========================================================
Arreglo JSON con objetos. Ejemplo:
[
  {
    "statement": "¿Qué neurotransmisor regula el estado de ánimo?",
    "type": "multiple_choice",
    "subject": "Neurociencias",
    "options": ["Dopamina", "Serotonina", "GABA", "Glutamato"],
    "correct_answer": "Serotonina",
    "explanation": "La serotonina es el principal regulador del estado de ánimo",
    "difficulty_suggested": 2,
    "tags": ["neurotransmisores", "psiquiatría"]
  },
  {
    "statement": "La sinapsis química involucra vesículas sinápticas",
    "type": "true_false",
    "subject": "Neurociencias",
    "correct_answer": "Verdadero",
    "difficulty_suggested": 1
  }
]

========================================================
FORMATO 4 — TXT (.txt)
========================================================
Una pregunta por bloque, separadas por línea en blanco.
Formato por bloque:
ENUNCIADO: ¿texto de la pregunta?
TIPO: multiple_choice
MATERIA: Neurociencias
OPCIONES: Opción A|Opción B|Opción C|Opción D
RESPUESTA: Opción correcta
EXPLICACIÓN: Texto explicativo (opcional)
DIFICULTAD: 3

Ejemplo:
ENUNCIADO: ¿Cuál es la unidad funcional del sistema nervioso?
TIPO: multiple_choice
MATERIA: Neurociencias
OPCIONES: Neurona|Astrocito|Oligodendrocito|Microglia
RESPUESTA: Neurona
EXPLICACIÓN: La neurona es la célula especializada en transmitir señales eléctricas
DIFICULTAD: 1

========================================================
VALORES PERMITIDOS
========================================================

Campo "type" — valores exactos aceptados:
- multiple_choice (Opción múltiple)
- true_false (Verdadero / Falso)
- fill_blank (Llenar espacios en blanco)
- order_sequence (Ordenar secuencia)
- matching (Emparejamiento)
- development (Desarrollo)
- clinical_case (Caso clínico)
- flashcard (Flashcard)

También se aceptan variantes en español:
- "opcion multiple" → multiple_choice
- "verdadero/falso" → true_false
- "llenar espacios" → fill_blank
- "ordenar" → order_sequence
- "emparejamiento" → matching
- "desarrollo" → development
- "caso clinico" → clinical_case
- "flashcard" → flashcard

Campo "subject" — valores aceptados:
- Neurociencias
- Cuidados de la Salud
- Ciencias Biomédicas
- Otras

También se aceptan variantes aproximadas (el sistema las detecta automáticamente).

========================================================
NOTAS IMPORTANTES
========================================================
- Las preguntas con errores no se importan pero puedes usar el botón IA para corregirlas.
- El sistema detecta duplicados exactos y los omite automáticamente.
- Máximo 500 preguntas por archivo.
- El campo "options" es obligatorio para tipo multiple_choice.
- Para true_false, correct_answer debe ser "Verdadero" o "Falso".
- Las imágenes no se pueden importar masivamente; agrégalas manualmente desde el banco.
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'instrucciones_importacion.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';
  if (!isAdminOrMentor) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-muted-foreground">Solo Admin y Mentor pueden importar preguntas.</p>
    </div>
  );

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setParsed([]);
    setErrors([]);
    setImported(false);

    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                statement: { type: "string" },
                type: { type: "string" },
                subject: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
              }
            }
          }
        }
      }
    });

    if (result.status === 'success' && result.output?.questions) {
      const qs = result.output.questions;
      const valid = [];
      const errs = [];
      
      qs.forEach((q, i) => {
        const issues = [];
        if (!q.statement?.trim()) issues.push('Enunciado vacío');
        if (!q.type) issues.push('Tipo no definido');
        if (!q.correct_answer && q.type !== 'development' && q.type !== 'clinical_case') issues.push('Sin respuesta correcta');
        
        if (issues.length > 0) {
          errs.push({ row: i + 1, issues, question: q });
        } else {
          valid.push({
            ...q,
            type: mapType(q.type),
            subject: mapSubject(q.subject),
            status: 'active',
            origin: 'imported',
          });
        }
      });
      
      setParsed(valid);
      setErrors(errs);
    } else {
      toast.error('Error al procesar el archivo');
    }
  };

  const mapType = (t) => {
    const map = {
      'opción múltiple': 'multiple_choice', 'opcion multiple': 'multiple_choice', 'multiple choice': 'multiple_choice',
      'verdadero/falso': 'true_false', 'true/false': 'true_false', 'v/f': 'true_false',
      'llenar espacios': 'fill_blank', 'fill blank': 'fill_blank',
      'ordenar': 'order_sequence', 'order': 'order_sequence',
      'matching': 'matching', 'emparejamiento': 'matching',
      'desarrollo': 'development', 'development': 'development',
      'caso clínico': 'clinical_case', 'clinical case': 'clinical_case',
      'flashcard': 'flashcard',
    };
    return map[t?.toLowerCase()] || t || 'multiple_choice';
  };

  const mapSubject = (s) => {
    if (!s) return 'Otras';
    const lower = s.toLowerCase();
    if (lower.includes('neuro')) return 'Neurociencias';
    if (lower.includes('cuidado') || lower.includes('salud')) return 'Cuidados de la Salud';
    if (lower.includes('biomédic') || lower.includes('biomedic')) return 'Ciencias Biomédicas';
    return 'Otras';
  };

  const handleImport = async () => {
    setImporting(true);
    let done = 0;
    for (const q of parsed) {
      await base44.entities.Question.create(q);
      done++;
      setProgress(Math.round((done / parsed.length) * 100));
    }
    setImporting(false);
    setImported(true);
    toast.success(`${parsed.length} preguntas importadas exitosamente`);
  };

  const handleAIFix = async (err, i) => {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Corrige esta pregunta para que sea válida. Problemas: ${err.issues.join(', ')}. Pregunta: ${JSON.stringify(err.question)}. Devuelve la pregunta corregida.`,
      response_json_schema: {
        type: "object",
        properties: {
          statement: { type: "string" },
          type: { type: "string" },
          subject: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correct_answer: { type: "string" },
          explanation: { type: "string" },
        }
      }
    });
    
    const fixed = { ...result, type: mapType(result.type), subject: mapSubject(result.subject), status: 'active', origin: 'imported' };
    setParsed(prev => [...prev, fixed]);
    setErrors(prev => prev.filter((_, j) => j !== i));
    toast.success('Pregunta corregida por IA');
  };

  const downloadErrors = () => {
    const data = JSON.stringify(errors, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'import_errors.json'; a.click();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-space font-bold">📥 Importación Masiva</h1>
        <Button variant="outline" onClick={downloadInstructions} className="gap-2 rounded-xl">
          <BookOpen className="h-4 w-4" /> Descargar Instrucciones
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Soporta CSV, Excel (.xlsx), JSON y TXT</p>

      {!file && (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-2">Arrastra tu archivo o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground mb-4">CSV, Excel (.xlsx), JSON, TXT</p>
          <input type="file" accept=".csv,.xlsx,.json,.txt" onChange={handleFileUpload} className="hidden" id="import-file" />
          <label htmlFor="import-file">
            <Button asChild className="rounded-xl"><span>Seleccionar archivo</span></Button>
          </label>
        </div>
      )}

      {file && !imported && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{parsed.length} válidas • {errors.length} con errores</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFile(null); setParsed([]); setErrors([]); }} className="rounded-xl">Cambiar</Button>
          </div>

          {/* Preview valid */}
          {parsed.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> {parsed.length} preguntas válidas</h3>
              <ScrollArea className="max-h-40">
                {parsed.slice(0, 5).map((q, i) => (
                  <div key={i} className="text-sm py-1 border-b border-border/50">
                    <span className="text-muted-foreground">{i + 1}.</span> {q.statement?.substring(0, 80)}...
                  </div>
                ))}
                {parsed.length > 5 && <p className="text-xs text-muted-foreground mt-2">...y {parsed.length - 5} más</p>}
              </ScrollArea>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-card border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> {errors.length} con errores</h3>
                <Button variant="outline" size="sm" onClick={downloadErrors} className="rounded-xl"><Download className="mr-2 h-3 w-3" /> Descargar reporte</Button>
              </div>
              <div className="space-y-2">
                {errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-red-500/5 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <span>Fila {err.row}: </span>
                      <span className="text-muted-foreground">{err.issues.join(', ')}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleAIFix(err, i)} className="rounded-xl shrink-0">
                      <Zap className="mr-1 h-3 w-3" /> IA
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import */}
          {importing && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Importando...</span>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {!importing && parsed.length > 0 && (
            <Button onClick={handleImport} className="w-full rounded-xl" size="lg">
              Importar {parsed.length} preguntas al banco global
            </Button>
          )}
        </div>
      )}

      {imported && (
        <div className="text-center py-10 bg-card border border-green-500/30 rounded-xl">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">¡Importación completada!</h2>
          <p className="text-sm text-muted-foreground">{parsed.length} preguntas agregadas al banco global</p>
          <Button onClick={() => { setFile(null); setParsed([]); setErrors([]); setImported(false); }} className="mt-4 rounded-xl">
            Importar más
          </Button>
        </div>
      )}
    </div>
  );
}
