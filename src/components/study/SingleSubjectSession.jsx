import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { NumericInput, DurationBadge, AvailableBadge, TypeToggle, useAvailableCount, SUBJECTS } from './SessionConfigHelpers';

export default function SingleSubjectSession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subject: 'Neurociencias', types: [], questionCount: 20,
    blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
  });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleType = (t) => setConfig(c => ({
    ...c, types: c.types.includes(t) ? c.types.filter(x => x !== t) : [...c.types, t]
  }));

  // Live question count
  const { count: availableCount, loading: countLoading } = useAvailableCount(async () => {
    let qs = await base44.entities.Question.filter({ subject: config.subject, status: 'active' }, '-created_date', 500);
    if (config.types.length > 0) qs = qs.filter(q => config.types.includes(q.type));
    return qs.length;
  }, [config.subject, config.types.join(',')]);

  const canStart = availableCount !== null && availableCount >= config.questionCount && availableCount > 0;

  const start = async () => {
    setLoading(true);
    let allQ = await base44.entities.Question.filter({ subject: config.subject, status: 'active' }, '-created_date', 500);
    if (config.types.length > 0) allQ = allQ.filter(q => config.types.includes(q.type));
    const selected = allQ.sort(() => Math.random() - 0.5).slice(0, config.questionCount);
    setQuestions(selected);
    setLoading(false);
  };

  if (questions) {
    return (
      <StudyEngine questions={questions} profile={profile} sessionType="single_subject"
        config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
        onBack={() => setQuestions(null)} />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <h2 className="text-xl font-bold">🎯 Sesión de Materia Única</h2>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Subject */}
        <div>
          <label className="text-sm font-medium block mb-2">Materia</label>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map(s => (
              <button key={s} type="button" onClick={() => setConfig(c => ({ ...c, subject: s }))}
                className={`p-2.5 rounded-xl text-sm border-2 transition-all ${config.subject === s ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Types */}
        <div>
          <label className="text-sm font-medium block mb-2">Tipos de preguntas <span className="text-muted-foreground font-normal">(vacío = todos)</span></label>
          <TypeToggle types={config.types} onToggle={toggleType} />
        </div>

        {/* Available count */}
        <AvailableBadge count={availableCount} requested={config.questionCount} loading={countLoading} />

        {/* Numeric config */}
        <div className="grid grid-cols-1 gap-4">
          <NumericInput label="N° de preguntas por sesión" value={config.questionCount}
            onChange={v => setConfig(c => ({ ...c, questionCount: v }))} min={1} max={200} step={1} />
          <div className="grid grid-cols-2 gap-4">
            <NumericInput label="Tiempo por bloque (min)" value={config.blockMinutes}
              onChange={v => setConfig(c => ({ ...c, blockMinutes: v }))} min={5} max={120} step={5} />
            <NumericInput label="Pausa entre bloques (min)" value={config.pauseMinutes}
              onChange={v => setConfig(c => ({ ...c, pauseMinutes: v }))} min={1} max={30} step={1} />
            <NumericInput label="Ciclos por bloque" value={config.cycles}
              onChange={v => setConfig(c => ({ ...c, cycles: v }))} min={1} max={10} step={1} />
            <NumericInput label="N° de bloques" value={config.blocks}
              onChange={v => setConfig(c => ({ ...c, blocks: v }))} min={1} max={8} step={1} />
          </div>
        </div>

        {/* Duration estimate */}
        <DurationBadge blocks={config.blocks} blockMinutes={config.blockMinutes} pauseMinutes={config.pauseMinutes} />

        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading || !canStart || countLoading}>
          {loading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : !canStart && !countLoading
              ? '⚠️ Ajustá los filtros o la cantidad'
              : <><Play className="h-4 w-4" /> Iniciar sesión</>}
        </Button>
      </div>
    </div>
  );
}
