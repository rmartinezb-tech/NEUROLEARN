import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { NumericInput, DurationBadge, AvailableBadge, SubjectToggle, TypeToggle, useAvailableCount } from './SessionConfigHelpers';

function interleave(questions) {
  const result = [];
  let pool = [...questions];
  let lastSubject = null;
  while (pool.length > 0) {
    const idx = pool.findIndex(q => q.subject !== lastSubject);
    if (idx >= 0) { result.push(pool.splice(idx, 1)[0]); }
    else { result.push(pool.shift()); }
    lastSubject = result[result.length - 1].subject;
  }
  return result;
}

export default function PersonalizedSession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subjects: [], types: [], questionCount: 20,
    blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
  });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => setConfig(c => ({
    ...c, subjects: c.subjects.includes(s) ? c.subjects.filter(x => x !== s) : [...c.subjects, s]
  }));
  const toggleType = (t) => setConfig(c => ({
    ...c, types: c.types.includes(t) ? c.types.filter(x => x !== t) : [...c.types, t]
  }));

  const { count: availableCount, loading: countLoading } = useAvailableCount(async () => {
    let qs = await base44.entities.Question.list('-created_date', 1000);
    qs = qs.filter(q => (!q.status || q.status === 'active') && (config.subjects.length === 0 || config.subjects.includes(q.subject)));
    if (config.types.length > 0) qs = qs.filter(q => config.types.includes(q.type));
    return qs.length;
  }, [config.subjects.join(','), config.types.join(',')]);

  const notEnoughSubjects = config.subjects.length < 2;
  const canStart = !notEnoughSubjects && availableCount !== null && availableCount >= config.questionCount && availableCount > 0;

  const start = async () => {
    setLoading(true);
    let allQ = await base44.entities.Question.list('-created_date', 1000);
    allQ = allQ.filter(q => (!q.status || q.status === 'active') && config.subjects.includes(q.subject));
    if (config.types.length > 0) allQ = allQ.filter(q => config.types.includes(q.type));

    const count = Math.min(config.questionCount, allQ.length);
    const perSubject = Math.floor(count / config.subjects.length);
    let selected = [];
    config.subjects.forEach(s => {
      const sub = allQ.filter(q => q.subject === s).sort(() => Math.random() - 0.5);
      selected.push(...sub.slice(0, perSubject));
    });
    const remaining = count - selected.length;
    if (remaining > 0) {
      const extra = allQ.filter(q => !selected.find(s => s.id === q.id)).sort(() => Math.random() - 0.5).slice(0, remaining);
      selected.push(...extra);
    }
    setQuestions(interleave(selected));
    setLoading(false);
  };

  if (questions) {
    return (
      <StudyEngine questions={questions} profile={profile} sessionType="personalized"
        config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
        interleaved={true} onBack={() => setQuestions(null)} />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <h2 className="text-xl font-bold">🔀 Sesión Personalizada (Entrelazada)</h2>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Subjects */}
        <div>
          <label className="text-sm font-medium block mb-1">
            Materias <span className="text-muted-foreground font-normal">(elegí exactamente 2)</span>
            <span className={`ml-2 text-xs font-semibold ${config.subjects.length === 2 ? 'text-green-500' : 'text-amber-500'}`}>
              {config.subjects.length}/2
            </span>
          </label>
          <SubjectToggle subjects={config.subjects} onToggle={toggleSubject} max={2} />
        </div>

        {/* Types */}
        <div>
          <label className="text-sm font-medium block mb-2">Tipos de preguntas <span className="text-muted-foreground font-normal">(vacío = todos)</span></label>
          <TypeToggle types={config.types} onToggle={toggleType} />
        </div>

        {/* Available count */}
        {!notEnoughSubjects && (
          <AvailableBadge count={availableCount} requested={config.questionCount} loading={countLoading} />
        )}
        {notEnoughSubjects && (
          <div className="bg-muted rounded-xl p-3 text-sm text-muted-foreground text-center">
            Seleccioná 2 materias para ver las preguntas disponibles
          </div>
        )}

        {/* Numeric config */}
        <div className="grid grid-cols-1 gap-4">
          <NumericInput label="N° de preguntas por sesión" value={config.questionCount}
            onChange={v => setConfig(c => ({ ...c, questionCount: v }))} min={2} max={200} step={2} />
          <NumericInput label="Tiempo por bloque (min)" value={config.blockMinutes}
            onChange={v => setConfig(c => ({ ...c, blockMinutes: v }))} min={5} max={120} step={5} />
          <NumericInput label="Pausa entre bloques (min)" value={config.pauseMinutes}
            onChange={v => setConfig(c => ({ ...c, pauseMinutes: v }))} min={1} max={30} step={1} />
          <NumericInput label="Ciclos por bloque" value={config.cycles}
            onChange={v => setConfig(c => ({ ...c, cycles: v }))} min={1} max={10} step={1} />
          <NumericInput label="N° de bloques" value={config.blocks}
            onChange={v => setConfig(c => ({ ...c, blocks: v }))} min={1} max={8} step={1} />
        </div>

        <DurationBadge blocks={config.blocks} blockMinutes={config.blockMinutes} pauseMinutes={config.pauseMinutes} />

        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading || !canStart || countLoading}>
          {loading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : notEnoughSubjects
              ? 'Seleccioná 2 materias para continuar'
              : !canStart && !countLoading
                ? '⚠️ Ajustá filtros o cantidad'
                : <><Play className="h-4 w-4" /> Iniciar sesión entrelazada</>}
        </Button>
      </div>
    </div>
  );
}
