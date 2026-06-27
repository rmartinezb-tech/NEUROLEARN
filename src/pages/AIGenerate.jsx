import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Save, Sparkles } from 'lucide-react';
import { toast } from "sonner";

const typeLabels = {
  multiple_choice: 'Opción Múltiple', true_false: 'V/F', fill_blank: 'Llenar Espacios',
  flashcard: 'Flashcard', development: 'Desarrollo',
};

export default function AIGenerate() {
  const { user } = useOutletContext();
  const [text, setText] = useState('');
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState('Neurociencias');
  const [types, setTypes] = useState(['multiple_choice']);
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';
  if (!isAdminOrMentor) return (
    <div className="text-center py-20"><div className="text-5xl mb-4">🔒</div><p className="text-muted-foreground">Solo Admin y Mentor pueden generar preguntas con IA.</p></div>
  );

  const toggleType = (t) => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const generate = async () => {
    if (!text.trim()) { toast.error('Pega texto para generar preguntas'); return; }
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera ${count} preguntas de estudio a partir del siguiente texto. Materia: ${subject}. Tipos permitidos: ${types.join(', ')}. Distribuye dificultad 1-5 balanceada. Distractores plausibles para opción múltiple. Sin redundancia.\n\nTEXTO:\n${text}`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  statement: { type: "string" },
                  type: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" },
                  difficulty_suggested: { type: "number" },
                }
              }
            }
          }
        }
      });
      if (result?.questions) {
        setGenerated(result.questions.map(q => ({ ...q, subject, status: 'active', origin: 'ai', type: types.includes(q.type) ? q.type : types[0] })));
      }
    } catch (err) {
      toast.error(err?.message?.includes('limit') ? 'Se alcanzó el límite de integraciones IA del plan. Contacta al administrador para actualizar el plan.' : `Error: ${err?.message}`);
    }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const q of generated) await base44.entities.Question.create(q);
    toast.success(`${generated.length} preguntas agregadas al banco global`);
    setGenerated([]);
    setSaving(false);
  };

  const regenerateOne = async (idx) => {
    const q = generated[idx];
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Regenera esta pregunta con una versión diferente manteniendo el mismo tema y tipo. Pregunta: ${q.statement}. Tipo: ${q.type}. Materia: ${subject}.`,
        response_json_schema: {
          type: "object",
          properties: {
            statement: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correct_answer: { type: "string" },
            explanation: { type: "string" },
          }
        }
      });
      setGenerated(prev => prev.map((g, i) => i === idx ? { ...g, ...result } : g));
    } catch (err) {
      toast.error(err?.message?.includes('limit') ? 'Límite de IA alcanzado.' : `Error: ${err?.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-space font-bold mb-2">⚡ Generar Preguntas con IA</h1>
      <p className="text-sm text-muted-foreground mb-6">Pega texto libre y la IA generará preguntas automáticamente</p>

      {generated.length === 0 ? (
        <div className="space-y-4">
          <div>
            <Label>Texto fuente</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Pega aquí tus apuntes, resúmenes o texto de estudio..." className="mt-1 rounded-xl min-h-[200px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cantidad (máx. 50)</Label>
              <Input type="number" value={count} onChange={e => setCount(parseInt(e.target.value) || 5)} min={1} max={50} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Materia</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Neurociencias">Neurociencias</SelectItem>
                  <SelectItem value="Cuidados de la Salud">Cuidados de la Salud</SelectItem>
                  <SelectItem value="Ciencias Biomédicas">Ciencias Biomédicas</SelectItem>
                  <SelectItem value="Otras">Otras</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tipos de pregunta</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(typeLabels).map(([k, v]) => (
                <button key={k} onClick={() => toggleType(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${types.includes(k) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{v}</button>
              ))}
            </div>
          </div>
          <Button onClick={generate} className="w-full rounded-xl" size="lg" disabled={loading || !text.trim()}>
            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Generando...' : 'Generar Preguntas'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{generated.length} preguntas generadas</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGenerated([])} className="rounded-xl">Volver</Button>
              <Button onClick={saveAll} className="rounded-xl" disabled={saving}>
                {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                Agregar al banco global
              </Button>
            </div>
          </div>
          {generated.map((q, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{typeLabels[q.type] || q.type}</span>
                <Button variant="ghost" size="sm" onClick={() => regenerateOne(i)} className="h-7"><RotateCcw className="h-3 w-3 mr-1" />Regenerar</Button>
              </div>
              <p className="font-medium text-sm">{q.statement}</p>
              {q.options?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, j) => (
                    <div key={j} className={`text-xs p-2 rounded-lg ${opt === q.correct_answer ? 'bg-green-500/10 text-green-700 font-medium' : 'bg-muted/50'}`}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </div>
                  ))}
                </div>
              )}
              {q.explanation && <p className="text-xs text-muted-foreground mt-2">💡 {q.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
