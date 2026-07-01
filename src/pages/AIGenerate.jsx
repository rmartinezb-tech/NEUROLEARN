import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Save, Sparkles } from 'lucide-react';
import { toast } from "sonner";
import AIDisclaimerButton from '@/components/questions/AIDisclaimerButton';
import { COGNITIVE_SKILLS, SUBJECTS, QTYPES } from '@/components/study/SessionConfigHelpers';

const VALID_TYPES = new Set([
  'multiple_choice','true_false','fill_blank','order_sequence',
  'matching','development','clinical_case','flashcard',
]);

export default function AIGenerate() {
  const { user } = useOutletContext();
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('Neurociencias');
  const [cognitiveSkill, setCognitiveSkill] = useState('Conceptual');
  // key = type, value = count (key absent = not selected)
  const [typeCounts, setTypeCounts] = useState({ multiple_choice: 5 });
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';
  if (!isAdminOrMentor) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-muted-foreground">Solo Admin y Mentor pueden generar preguntas con IA.</p>
    </div>
  );

  const toggleType = (type) => {
    setTypeCounts(prev => {
      if (type in prev) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: 5 };
    });
  };

  const adjustCount = (type, delta) => {
    setTypeCounts(prev => {
      const next = (prev[type] || 0) + delta;
      if (next < 1) {
        const copy = { ...prev };
        delete copy[type];
        return copy;
      }
      return { ...prev, [type]: Math.min(30, next) };
    });
  };

  const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  const selectedEntries = Object.entries(typeCounts).filter(([, v]) => v > 0);

  const typeLabel = (t) => QTYPES.find(q => q.v === t)?.l || t;

  const generate = async () => {
    if (!text.trim()) { toast.error('Pega texto para generar preguntas'); return; }
    if (selectedEntries.length === 0) { toast.error('Seleccioná al menos un tipo de pregunta'); return; }
    setLoading(true);
    try {
      const distribution = selectedEntries
        .map(([t, c]) => `- ${typeLabel(t)}: ${c} pregunta${c !== 1 ? 's' : ''}`)
        .join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera preguntas de estudio con esta distribución EXACTA de tipos:\n${distribution}\n\nTotal: ${totalCount} preguntas.\nMateria: ${subject}\nHabilidad cognitiva: ${cognitiveSkill}\n\nReglas por tipo:\n- multiple_choice: 4 opciones (A/B/C/D), correct_answer = el texto exacto de la opción correcta.\n- true_false: options=["Verdadero","Falso"], correct_answer="Verdadero" o "Falso".\n- fill_blank: usa ___ para la palabra clave, correct_answer = la palabra/frase.\n- flashcard: statement = frente, correct_answer = reverso (sin options).\n- development / clinical_case: correct_answer = criterio de evaluación esperado.\n- order_sequence: options = pasos desordenados, correct_answer = orden correcto separado por comas.\n- matching: options = pares "A→B", correct_answer = igual.\n\nUsa EXACTAMENTE estos valores en el campo "type": multiple_choice, true_false, fill_blank, order_sequence, matching, development, clinical_case, flashcard.\nDificultad 1-5 balanceada. Sin redundancia.\n\nTEXTO FUENTE:\n${text}`,
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
                },
                required: ["statement", "type", "correct_answer"],
              }
            }
          }
        }
      });

      if (result?.questions?.length) {
        const firstType = selectedEntries[0]?.[0] || 'multiple_choice';
        const normalized = result.questions.map(q => ({
          ...q,
          type: VALID_TYPES.has(q.type) ? q.type : firstType,
          subject,
          cognitive_skill: cognitiveSkill,
          status: 'active',
          origin: 'ai',
          difficulty_suggested: Math.max(1, Math.min(5, Math.round(q.difficulty_suggested) || 3)),
        }));
        setGenerated(normalized);
        toast.success(`${normalized.length} preguntas generadas`);
      } else {
        toast.error('La IA no devolvió preguntas. Intentá con más texto.');
      }
    } catch (err) {
      toast.error(
        err?.message?.includes('limit')
          ? 'Se alcanzó el límite de IA del plan. Contacta al administrador.'
          : `Error: ${err?.message}`
      );
    }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    setSaveProgress({ done: 0, total: generated.length });
    let saved = 0, failed = 0;
    for (const q of generated) {
      try {
        await base44.entities.Question.create(q);
        saved++;
      } catch {
        failed++;
      }
      setSaveProgress(p => ({ ...p, done: p.done + 1 }));
    }
    if (failed === 0) {
      toast.success(`✅ ${saved} preguntas agregadas al banco global`);
    } else {
      toast.warning(`${saved} guardadas, ${failed} fallaron`);
    }
    setGenerated([]);
    setSaving(false);
    setSaveProgress({ done: 0, total: 0 });
  };

  const regenerateOne = async (idx) => {
    const q = generated[idx];
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Regenera esta pregunta con una variante diferente. Mantené tipo "${q.type}" y materia "${q.subject}". Pregunta original: ${q.statement}`,
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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-space font-bold">⚡ Generar Preguntas con IA</h1>
        <AIDisclaimerButton />
      </div>
      <p className="text-sm text-muted-foreground mb-6">Pega texto libre y la IA generará preguntas automáticamente</p>

      {generated.length === 0 ? (
        <div className="space-y-5">
          {/* Texto fuente */}
          <div>
            <Label>Texto fuente</Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Pega aquí tus apuntes, resúmenes o texto de estudio..."
              className="mt-1 rounded-xl min-h-[180px]"
            />
          </div>

          {/* Materia + Habilidad cognitiva */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Materia</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Habilidad Cognitiva</Label>
              <Select value={cognitiveSkill} onValueChange={setCognitiveSkill}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COGNITIVE_SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipos y cantidades */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tipos y cantidad de preguntas</Label>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Total: <strong className="text-foreground">{totalCount}</strong> preguntas
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QTYPES.map(({ v, l }) => {
                const selected = v in typeCounts;
                const count = typeCounts[v] ?? 0;
                return (
                  <div
                    key={v}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      selected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-muted/30 hover:border-primary/30 cursor-pointer'
                    }`}
                    onClick={() => { if (!selected) toggleType(v); }}
                  >
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggleType(v); }}
                      className={`w-5 h-5 rounded border shrink-0 flex items-center justify-center text-[10px] font-bold transition-all ${
                        selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                      }`}
                    >
                      {selected && '✓'}
                    </button>
                    <span className="text-xs font-medium flex-1 leading-tight">{l}</span>
                    {selected && (
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => adjustCount(v, -1)}
                          className="w-6 h-6 rounded border border-border hover:bg-muted flex items-center justify-center text-sm font-bold leading-none"
                        >−</button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">{count}</span>
                        <button
                          type="button"
                          onClick={() => adjustCount(v, 1)}
                          className="w-6 h-6 rounded border border-border hover:bg-muted flex items-center justify-center text-sm font-bold leading-none"
                        >+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            onClick={generate}
            className="w-full rounded-xl"
            size="lg"
            disabled={loading || !text.trim() || totalCount === 0}
          >
            {loading
              ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Generando...' : `Generar ${totalCount > 0 ? totalCount : ''} Preguntas`}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{generated.length} preguntas generadas</p>
            <div className="flex gap-2">
              <AIDisclaimerButton size="sm" />
              <Button variant="outline" onClick={() => setGenerated([])} className="rounded-xl">Volver</Button>
              <Button onClick={saveAll} className="rounded-xl" disabled={saving}>
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {saveProgress.done}/{saveProgress.total}
                  </>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Agregar al banco</>
                )}
              </Button>
            </div>
          </div>

          {generated.map((q, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{typeLabel(q.type)}</span>
                  {q.cognitive_skill && (
                    <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full">{q.cognitive_skill}</span>
                  )}
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{q.subject}</span>
                  {q.difficulty_suggested && (
                    <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full">Dif. {q.difficulty_suggested}</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => regenerateOne(i)} className="h-7 shrink-0">
                  <RotateCcw className="h-3 w-3 mr-1" />Regenerar
                </Button>
              </div>

              <p className="font-medium text-sm">{q.statement}</p>

              {q.options?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, j) => (
                    <div
                      key={j}
                      className={`text-xs p-2 rounded-lg ${
                        opt === q.correct_answer
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-medium'
                          : 'bg-muted/50'
                      }`}
                    >
                      {String.fromCharCode(65 + j)}. {opt}
                    </div>
                  ))}
                </div>
              )}

              {q.correct_answer && !q.options?.length && (
                <p className="text-xs mt-2 bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded-lg">
                  <span className="font-medium">Respuesta: </span>{q.correct_answer}
                </p>
              )}

              {q.explanation && (
                <p className="text-xs text-muted-foreground mt-2">💡 {q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
