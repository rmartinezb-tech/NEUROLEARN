import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play, Star } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { toast } from 'sonner';

const SUBJECTS = ['Todas', 'Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'Otras'];

export default function DifficultySession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subject: 'Todas', levels: [], questionCount: 30,
    blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
  });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleLevel = (n) => setConfig(c => ({
    ...c, levels: c.levels.includes(n) ? c.levels.filter(x => x !== n) : [...c.levels, n]
  }));

  const start = async () => {
    if (config.levels.length === 0) { toast.error('Selecciona al menos un nivel de dificultad.'); return; }
    setLoading(true);
    const ratings = profile?.difficulty_ratings || {};
    let allQ = await base44.entities.Question.list('-created_date', 1000);
    allQ = allQ.filter(q => !q.status || q.status === 'active');
    if (config.subject !== 'Todas') allQ = allQ.filter(q => q.subject === config.subject);
    allQ = allQ.filter(q => config.levels.includes(ratings[q.id]));
    if (allQ.length === 0) {
      toast.error('No tenés preguntas clasificadas con ese nivel. Clasificá preguntas desde el Banco de Preguntas (⭐).');
      setLoading(false);
      return;
    }
    if (allQ.length < config.questionCount) {
      toast.info(`Hay ${allQ.length} preguntas con esa dificultad. Se usarán todas.`);
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

  const diffLabels = { 1: 'Muy fácil', 2: 'Fácil', 3: 'Media', 4: 'Difícil', 5: 'Muy difícil' };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <div className="text-center">
        <div className="text-5xl mb-3">⭐</div>
        <h1 className="text-2xl font-space font-bold">Sesión por Dificultad</h1>
        <p className="text-sm text-muted-foreground mt-1">Practica las preguntas que tú mismo clasificaste por dificultad</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <label className="text-sm font-medium block mb-2">Materia</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setConfig(c => ({ ...c, subject: s }))}
                className={`px-3 py-1.5 rounded-xl text-sm border-2 transition-all ${config.subject === s ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">
            Nivel(es) de dificultad personal
            <span className="ml-2 text-xs text-muted-foreground">(tu clasificación personal)</span>
          </label>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => toggleLevel(n)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm transition-all ${config.levels.includes(n) ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= n ? 'text-yellow-400' : 'text-muted-foreground/20'}>★</span>)}
                </div>
                <span>{diffLabels[n]}</span>
                {config.levels.includes(n) && <span className="ml-auto text-primary text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <R k="questionCount" label="N° de preguntas" min={5} max={100} step={5} />
          <R k="blockMinutes" label="Tiempo por bloque (min)" min={5} max={90} step={5} />
          <R k="pauseMinutes" label="Pausa (min)" min={1} max={30} step={1} />
          <R k="cycles" label="Ciclos por bloque" min={1} max={5} step={1} />
          <R k="blocks" label="N° de bloques" min={1} max={8} step={1} />
        </div>

        <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
          ⭐ Niveles: {config.levels.length > 0 ? config.levels.map(l => diffLabels[l]).join(', ') : 'Ninguno'} · {config.questionCount} preguntas · {config.blocks} bloque(s) × {config.cycles} ciclo(s)
        </div>

        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading || config.levels.length === 0}>
          {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Play className="h-4 w-4" /> Iniciar sesión por dificultad</>}
        </Button>
      </div>
    </div>
  );
}
