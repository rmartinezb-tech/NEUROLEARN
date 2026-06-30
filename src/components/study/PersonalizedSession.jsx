import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { toast } from 'sonner';

const SUBJECTS = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'Otras'];
const QTYPES = [
  { v: 'multiple_choice', l: 'Opción Múltiple' }, { v: 'true_false', l: 'Verdadero/Falso' },
  { v: 'fill_blank', l: 'Llenar Espacios' }, { v: 'order_sequence', l: 'Ordenar Secuencia' },
  { v: 'matching', l: 'Matching' }, { v: 'development', l: 'Desarrollo' },
  { v: 'clinical_case', l: 'Caso Clínico' }, { v: 'flashcard', l: 'Flashcard' },
];

function interleave(questions) {
  // Alternate subjects, never two consecutive of same subject
  const result = [];
  let pool = [...questions];
  let lastSubject = null;
  while (pool.length > 0) {
    const idx = pool.findIndex(q => q.subject !== lastSubject);
    if (idx >= 0) {
      result.push(pool.splice(idx, 1)[0]);
    } else {
      result.push(pool.shift());
    }
    lastSubject = result[result.length - 1].subject;
  }
  return result;
}

export default function PersonalizedSession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subjects: [], types: [], questionCount: 20,
    blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
    diffMode: 'standard', diffLevels: [],
  });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => setConfig(c => ({
    ...c, subjects: c.subjects.includes(s) ? c.subjects.filter(x => x !== s) : [...c.subjects, s]
  }));
  const toggleType = (t) => setConfig(c => ({
    ...c, types: c.types.includes(t) ? c.types.filter(x => x !== t) : [...c.types, t]
  }));
  const toggleLevel = (n) => setConfig(c => ({
    ...c, diffLevels: c.diffLevels.includes(n) ? c.diffLevels.filter(x => x !== n) : [...c.diffLevels, n]
  }));

  const start = async () => {
    if (config.subjects.length < 2) {
      toast.error('Selecciona exactamente 2 materias para la sesión entrelazada.');
      return;
    }
    setLoading(true);
    let allQ = await base44.entities.Question.list('-created_date', 1000);
    allQ = allQ.filter(q => (!q.status || q.status === 'active') && config.subjects.includes(q.subject));
    if (config.types.length > 0) allQ = allQ.filter(q => config.types.includes(q.type));
    if (config.diffMode === 'personal' && config.diffLevels.length > 0) {
      const ratings = profile?.difficulty_ratings || {};
      allQ = allQ.filter(q => config.diffLevels.includes(ratings[q.id]));
    }
    // Require at least 1 question per subject
    const bySubject = config.subjects.map(s => allQ.filter(q => q.subject === s));
    if (bySubject.some(qs => qs.length === 0)) {
      toast.error('No hay preguntas de alguna materia con los filtros seleccionados.');
      setLoading(false);
      return;
    }
    if (allQ.length < config.questionCount) {
      toast.info(`Hay ${allQ.length} preguntas disponibles. Se usarán todas.`);
    }
    const count = Math.min(config.questionCount, allQ.length);
    const perSubject = Math.floor(count / config.subjects.length);
    let selected = [];
    config.subjects.forEach(s => {
      const sub = allQ.filter(q => q.subject === s).sort(() => Math.random() - 0.5);
      selected.push(...sub.slice(0, perSubject));
    });
    // Fill remainder
    const remaining = count - selected.length;
    if (remaining > 0) {
      const extra = allQ.filter(q => !selected.find(s => s.id === q.id)).sort(() => Math.random() - 0.5).slice(0, remaining);
      selected.push(...extra);
    }
    const interleaved = interleave(selected);
    setQuestions(interleaved);
    setLoading(false);
  };

  if (questions) {
    return <StudyEngine questions={questions} profile={profile} sessionType="personalized"
      config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
      interleaved={true} onBack={() => setQuestions(null)} />;
  }

  const R = ({ k, label, min, max, step }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={config[k]}
          onChange={e => setConfig(c => ({ ...c, [k]: Number(e.target.value) }))} className="flex-1" />
        <span className="text-sm font-bold w-10 text-right">{config[k]}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <h2 className="text-xl font-bold">🔀 Sesión Personalizada (Entrelazada)</h2>
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <label className="text-sm font-medium block mb-1">
            Materias (elige exactamente 2)
            <span className={`ml-2 text-xs ${config.subjects.length === 2 ? 'text-green-500' : 'text-orange-500'}`}>
              {config.subjects.length}/2 seleccionadas
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => toggleSubject(s)}
                disabled={config.subjects.length >= 2 && !config.subjects.includes(s)}
                className={`p-2.5 rounded-xl text-sm border-2 transition-all disabled:opacity-40 ${config.subjects.includes(s) ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Tipos de preguntas (vacío = todos)</label>
          <div className="grid grid-cols-2 gap-1.5">
            {QTYPES.map(t => (
              <button key={t.v} onClick={() => toggleType(t.v)}
                className={`p-2 rounded-lg text-xs border transition-all ${config.types.includes(t.v) ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Modo de dificultad</label>
          <div className="flex gap-2 mb-2">
            {[{ v: 'standard', l: '🎲 Estándar' }, { v: 'personal', l: '⭐ Personal' }].map(m => (
              <button key={m.v} onClick={() => setConfig(c => ({ ...c, diffMode: m.v }))}
                className={`flex-1 py-2 rounded-xl text-sm border-2 transition-all ${config.diffMode === m.v ? 'border-primary bg-primary/10' : 'border-border'}`}>
                {m.l}
              </button>
            ))}
          </div>
          {config.diffMode === 'personal' && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Nivel(es) de dificultad personal:</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => toggleLevel(n)}
                    className={`h-9 w-9 rounded-xl font-bold border-2 text-sm transition-all ${config.diffLevels.includes(n) ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <R k="questionCount" label="N° de preguntas" min={10} max={200} step={10} />
          <R k="blockMinutes" label="Tiempo por bloque (min)" min={5} max={90} step={5} />
          <R k="pauseMinutes" label="Pausa (min)" min={1} max={30} step={1} />
          <R k="cycles" label="Ciclos por bloque" min={1} max={5} step={1} />
          <R k="blocks" label="N° de bloques" min={1} max={8} step={1} />
        </div>

        <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
          🔀 Entrelazado · {config.questionCount} preguntas · {config.blocks} bloque(s) × {config.cycles} ciclo(s) · {config.blockMinutes}min / {config.pauseMinutes}min pausa
        </div>
        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading || config.subjects.length !== 2}>
          {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Play className="h-4 w-4" /> Iniciar sesión entrelazada</>}
        </Button>
      </div>
    </div>
  );
}
