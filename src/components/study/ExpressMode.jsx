import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { ChevronLeft, Play, Zap } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { toast } from 'sonner';

const SUBJECTS = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'Otras'];

export default function ExpressMode({ profile, onBack }) {
  const [config, setConfig] = useState({ count: 10, subjects: [] });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => {
    setConfig(prev => ({
      ...prev,
      subjects: prev.subjects.includes(s) ? prev.subjects.filter(x => x !== s) : [...prev.subjects, s]
    }));
  };

  const start = async () => {
    setLoading(true);
    let allQ = await base44.entities.Question.list('-created_date', 1000);
    if (config.subjects.length > 0) {
      allQ = allQ.filter(q => config.subjects.includes(q.subject));
    }
    if (allQ.length < config.count) {
      toast.error(`Solo hay ${allQ.length} preguntas disponibles con esos filtros. Selecciona menos o amplía la materia.`);
      setLoading(false);
      return;
    }
    const selected = allQ.sort(() => Math.random() - 0.5).slice(0, config.count);
    setQuestions(selected);
    setLoading(false);
  };

  if (questions) {
    return <StudyEngine questions={questions} profile={profile} sessionType="express"
      config={{ blockMinutes: 10, pauseMinutes: 2, blocks: 1, cycles: 1 }} onBack={onBack} />;
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
      )}
      <div className="text-center">
        <div className="text-5xl mb-3">⚡</div>
        <h1 className="text-2xl font-space font-bold">Modo Express</h1>
        <p className="text-sm text-muted-foreground mt-1">Repaso rápido y sin presión</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Cantidad de preguntas</label>
          <div className="flex items-center gap-3">
            <input type="range" min={5} max={50} step={5} value={config.count}
              onChange={e => setConfig(c => ({ ...c, count: Number(e.target.value) }))} className="flex-1" />
            <span className="text-lg font-bold w-8 text-right">{config.count}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Materias (vacío = todas)</label>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => toggleSubject(s)}
                className={`p-2.5 rounded-xl text-sm border-2 transition-all ${config.subjects.includes(s) ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={start} className="w-full gap-2 py-5" disabled={loading}>
          {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Play className="h-4 w-4" /> Iniciar Express</>}
        </Button>
      </div>
    </div>
  );
}
