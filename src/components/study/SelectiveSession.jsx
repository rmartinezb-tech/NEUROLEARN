import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import StudyEngine from './StudyEngine';
import { Search, CheckCheck, ChevronLeft, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function SelectiveSession({ profile, onBack }) {
  const [allQuestions, setAllQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('select'); // select | config | study
  const [config, setConfig] = useState({ blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1 });

  useEffect(() => {
    base44.entities.Question.list('-created_date', 1000).then(qs => {
      setAllQuestions(qs.filter(q => !q.status || q.status === 'active'));
      setLoading(false);
    });
  }, []);

  const filtered = allQuestions.filter(q =>
    q.statement?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(q => q.id)));
  };

  const selectedQuestions = allQuestions.filter(q => selected.has(q.id));

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

  if (phase === 'study') {
    return <StudyEngine questions={selectedQuestions} profile={profile} sessionType="selective"
      config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
      onBack={() => setPhase('config')} />;
  }

  if (phase === 'config') {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <button onClick={() => setPhase('select')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Volver a selección
        </button>
        <div>
          <h2 className="text-xl font-bold">⚙️ Configurar Sesión Selectiva</h2>
          <p className="text-sm text-muted-foreground mt-1">{selected.size} preguntas seleccionadas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <R k="blockMinutes" label="Tiempo por bloque (min)" min={5} max={90} step={5} />
            <R k="pauseMinutes" label="Pausa entre bloques (min)" min={1} max={30} step={1} />
            <R k="cycles" label="Ciclos por bloque" min={1} max={5} step={1} />
            <R k="blocks" label="N° de bloques" min={1} max={8} step={1} />
          </div>
          <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
            📊 {selected.size} preguntas · {config.blocks} bloque(s) × {config.cycles} ciclo(s) · {config.blockMinutes}min / {config.pauseMinutes}min pausa
          </div>
          <Button onClick={() => setPhase('study')} className="w-full gap-2 py-5">
            <Play className="h-4 w-4" /> Iniciar sesión selectiva
          </Button>
        </div>
      </div>
    );
  }

  // Phase = select
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-space font-bold">Sesión Selectiva</h1>
          <p className="text-sm text-muted-foreground mt-1">En el Estudio Selectivo tú eliges exactamente qué preguntas quieres trabajar.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar preguntas..." className="pl-10 rounded-xl" />
          </div>
          <Button variant="outline" onClick={toggleAll} className="rounded-xl shrink-0">
            <CheckCheck className="mr-2 h-4 w-4" /> {selected.size === filtered.length && filtered.length > 0 ? 'Deseleccionar' : 'Seleccionar todo'}
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {filtered.map(q => (
                <button key={q.id} onClick={() => { const n = new Set(selected); n.has(q.id) ? n.delete(q.id) : n.add(q.id); setSelected(n); }}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${selected.has(q.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'}`}>
                  <Checkbox checked={selected.has(q.id)} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{q.statement}</p>
                    <p className="text-xs text-muted-foreground">{q.subject} · {q.type}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay preguntas disponibles</p>}
            </div>
          </ScrollArea>
        )}
      </div>

      <Button onClick={() => {
        if (selected.size === 0) { toast.error('Selecciona al menos 1 pregunta'); return; }
        setPhase('config');
      }} className="w-full rounded-xl" size="lg" disabled={selected.size === 0}>
        Configurar sesión con {selected.size} pregunta{selected.size !== 1 ? 's' : ''} →
      </Button>
    </div>
  );
}
