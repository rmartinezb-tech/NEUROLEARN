import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
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

export default function SingleSubjectSession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subject: 'Neurociencias', types: [], questionCount: 60,
    blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
    difficulty: 'all',
  });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleType = (t) => setConfig(c => ({
    ...c, types: c.types.includes(t) ? c.types.filter(x => x !== t) : [...c.types, t]
  }));

  const start = async () => {
    setLoading(true);
    let allQ = await base44.entities.Question.filter({ subject: config.subject }, '-created_date', 1000);
    if (config.types.length > 0) allQ = allQ.filter(q => config.types.includes(q.type));
    if (config.difficulty !== 'all') {
      const map = { easy: [1, 2], medium: [3], hard: [4, 5] };
      const range = map[config.difficulty] || [];
      allQ = allQ.filter(q => range.includes(q.difficulty_suggested));
    }
    if (allQ.length < config.questionCount) {
      toast.error(`Solo hay ${allQ.length} preguntas con esos parámetros. Necesitas al menos ${config.questionCount}.`);
      setLoading(false);
      return;
    }
    const selected = allQ.sort(() => Math.random() - 0.5).slice(0, config.questionCount);
    setQuestions(selected);
    setLoading(false);
  };

  if (questions) {
    return <StudyEngine questions={questions} profile={profile} sessionType="personalized"
      config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
      onBack={() => setQuestions(null)} />;
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
      <h2 className="text-xl font-bold">🎯 Sesión de Materia Única</h2>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Materia (una)</label>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setConfig(c => ({ ...c, subject: s }))}
                className={`p-2.5 rounded-xl text-sm border-2 transition-all ${config.subject === s ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
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
          <label className="text-xs font-medium text-muted-foreground block mb-1">Dificultad</label>
          <select value={config.difficulty} onChange={e => setConfig(c => ({ ...c, difficulty: e.target.value }))}
            className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
            <option value="all">Variada (todas)</option>
            <option value="easy">Fácil (1-2)</option>
            <option value="medium">Media (3)</option>
            <option value="hard">Difícil (4-5)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <R k="questionCount" label="N° de preguntas" min={5} max={200} step={5} />
          <R k="blockMinutes" label="Tiempo por bloque (min)" min={5} max={90} step={5} />
          <R k="pauseMinutes" label="Pausa entre bloques (min)" min={1} max={30} step={1} />
          <R k="cycles" label="Ciclos por bloque" min={1} max={5} step={1} />
          <R k="blocks" label="N° de bloques" min={1} max={8} step={1} />
        </div>
        <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
          📊 {config.questionCount} preguntas · {config.blocks} bloque(s) × {config.cycles} ciclo(s) · {config.blockMinutes}min trabajo / {config.pauseMinutes}min pausa
          · ~{config.blocks * config.blockMinutes + (config.blocks - 1) * config.pauseMinutes} min total
        </div>
        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading}>
          {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Play className="h-4 w-4" /> Iniciar sesión</>}
        </Button>
      </div>
    </div>
  );
}
