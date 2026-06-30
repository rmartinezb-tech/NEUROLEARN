import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { NumericInput, DurationBadge, AvailableBadge, SubjectToggle, TypeToggle, useAvailableCount } from './SessionConfigHelpers';

export default function DifficultySession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subjects: [], types: [], questionCount: 20,
    blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
    minStars: 1, maxStars: 5,
  });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => setConfig(c => ({
    ...c, subjects: c.subjects.includes(s) ? c.subjects.filter(x => x !== s) : [...c.subjects, s]
  }));
  const toggleType = (t) => setConfig(c => ({
    ...c, types: c.types.includes(t) ? c.types.filter(x => x !== t) : [...c.types, t]
  }));

  const ratings = profile?.difficulty_ratings || {};

  const filterQuestions = (qs) => {
    let filtered = qs.filter(q => (!q.status || q.status === 'active'));
    if (config.subjects.length > 0) filtered = filtered.filter(q => config.subjects.includes(q.subject));
    if (config.types.length > 0) filtered = filtered.filter(q => config.types.includes(q.type));
    filtered = filtered.filter(q => {
      const r = ratings[q.id];
      return r >= config.minStars && r <= config.maxStars;
    });
    return filtered;
  };

  const { count: availableCount, loading: countLoading } = useAvailableCount(async () => {
    const qs = await base44.entities.Question.list('-created_date', 1000);
    return filterQuestions(qs).length;
  }, [config.subjects.join(','), config.types.join(','), config.minStars, config.maxStars]);

  const canStart = availableCount !== null && availableCount >= config.questionCount && availableCount > 0;

  const start = async () => {
    setLoading(true);
    const allQ = await base44.entities.Question.list('-created_date', 1000);
    const filtered = filterQuestions(allQ);
    const selected = filtered.sort(() => Math.random() - 0.5).slice(0, config.questionCount);
    setQuestions(selected);
    setLoading(false);
  };

  if (questions) {
    return (
      <StudyEngine questions={questions} profile={profile} sessionType="difficulty"
        config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
        onBack={() => setQuestions(null)} />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <h2 className="text-xl font-bold">⭐ Sesión por Dificultad</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Practica preguntas según tu clasificación de estrellas en el Banco de Preguntas.
      </p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Difficulty range */}
        <div>
          <label className="text-sm font-medium block mb-3">Rango de dificultad personal</label>
          <div className="bg-muted rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Dificultad mínima</span>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    onClick={() => setConfig(c => ({ ...c, minStars: n, maxStars: Math.max(n, c.maxStars) }))}
                    className={`h-8 w-8 rounded-lg text-sm transition-all font-bold ${config.minStars === n ? 'bg-yellow-400 text-white' : 'bg-card border border-border hover:border-yellow-400'}`}>
                    {n}★
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Dificultad máxima</span>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    onClick={() => setConfig(c => ({ ...c, maxStars: n, minStars: Math.min(n, c.minStars) }))}
                    className={`h-8 w-8 rounded-lg text-sm transition-all font-bold ${config.maxStars === n ? 'bg-yellow-400 text-white' : 'bg-card border border-border hover:border-yellow-400'}`}>
                    {n}★
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Rango seleccionado: {'★'.repeat(config.minStars)} — {'★'.repeat(config.maxStars)} ({config.minStars}-{config.maxStars} estrellas)
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Clasificá tus preguntas con estrellas en el Banco de Preguntas para poder filtrarlas aquí.
          </p>
        </div>

        {/* Subjects */}
        <div>
          <label className="text-sm font-medium block mb-2">Materias <span className="text-muted-foreground font-normal">(vacío = todas)</span></label>
          <SubjectToggle subjects={config.subjects} onToggle={toggleSubject} />
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
            <NumericInput label="Pausa (min)" value={config.pauseMinutes}
              onChange={v => setConfig(c => ({ ...c, pauseMinutes: v }))} min={1} max={30} step={1} />
            <NumericInput label="Ciclos por bloque" value={config.cycles}
              onChange={v => setConfig(c => ({ ...c, cycles: v }))} min={1} max={10} step={1} />
            <NumericInput label="N° de bloques" value={config.blocks}
              onChange={v => setConfig(c => ({ ...c, blocks: v }))} min={1} max={8} step={1} />
          </div>
        </div>

        <DurationBadge blocks={config.blocks} blockMinutes={config.blockMinutes} pauseMinutes={config.pauseMinutes} />

        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading || !canStart || countLoading}>
          {loading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : !canStart && !countLoading
              ? '⚠️ Ajustá filtros o cantidad'
              : <><Play className="h-4 w-4" /> Iniciar sesión</>}
        </Button>
      </div>
    </div>
  );
}
