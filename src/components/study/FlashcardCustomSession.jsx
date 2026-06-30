import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Palette, CheckSquare, Square, RotateCcw, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUBJECTS } from './SessionConfigHelpers';

const PASTEL_COLORS = [
  { name: 'Rosa', bg: '#FFD6E0' },
  { name: 'Lavanda', bg: '#E8D5FF' },
  { name: 'Menta', bg: '#C8F5DC' },
  { name: 'Melocotón', bg: '#FFE4CC' },
  { name: 'Celeste', bg: '#CCE8FF' },
  { name: 'Limón', bg: '#FFFACC' },
  { name: 'Turquesa', bg: '#CCF2F4' },
  { name: 'Coral', bg: '#FFDDD6' },
  { name: 'Lila', bg: '#EED9F5' },
  { name: 'Verde', bg: '#D5F5E3' },
  { name: 'Blanco', bg: '#FFFFFF' },
  { name: 'Hueso', bg: '#F5F0E8' },
];

const DEFAULT_FRONT = '#CCE8FF';
const DEFAULT_BACK = '#D5F5E3';
const MAX_SELECT = 5;

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PASTEL_COLORS.map(c => (
        <button key={c.bg} type="button" title={c.name}
          onClick={() => onChange(c.bg)}
          style={{ backgroundColor: c.bg }}
          className={`h-7 w-7 rounded-full border-2 transition-all ${value === c.bg ? 'border-gray-700 scale-110' : 'border-transparent hover:scale-105'}`} />
      ))}
    </div>
  );
}

// Phase 1: select flashcard questions
function SelectPhase({ onNext, onBack }) {
  const [allQ, setAllQ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [subject, setSubject] = useState('');

  useEffect(() => {
    base44.entities.Question.list('-created_date', 1000).then(qs => {
      setAllQ(qs.filter(q => q.type === 'flashcard' && (!q.status || q.status === 'active')));
      setLoading(false);
    });
  }, []);

  const filtered = subject ? allQ.filter(q => q.subject === subject) : allQ;

  const toggle = (q) => {
    setSelected(prev => {
      if (prev.find(s => s.id === q.id)) return prev.filter(s => s.id !== q.id);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, q];
    });
  };

  const selectAll = () => {
    const toAdd = filtered.filter(q => !selected.find(s => s.id === q.id));
    const canAdd = MAX_SELECT - selected.length;
    if (canAdd <= 0) return;
    setSelected(prev => [...prev, ...toAdd.slice(0, canAdd)]);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" /> Flashcards con Personalización Visual
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paso 1 de 3 — Elegí hasta {MAX_SELECT} flashcards para personalizar y estudiar.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Subject filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Filtrar:</span>
          {['', ...SUBJECTS].map(s => (
            <button key={s || 'todas'} onClick={() => setSubject(s)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${subject === s ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-muted-foreground'}`}>
              {s || 'Todas'}
            </button>
          ))}
        </div>

        {/* Selected count + select all */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${selected.length === MAX_SELECT ? 'text-green-600' : 'text-muted-foreground'}`}>
            {selected.length}/{MAX_SELECT} seleccionadas
          </span>
          <button onClick={selectAll} disabled={selected.length >= MAX_SELECT}
            className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline">
            Seleccionar primeras {MAX_SELECT}
          </button>
        </div>

        {/* Question list */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando flashcards...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay flashcards {subject ? `de "${subject}"` : ''} en el banco de preguntas.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {filtered.map(q => {
              const isSelected = !!selected.find(s => s.id === q.id);
              const disabled = !isSelected && selected.length >= MAX_SELECT;
              return (
                <button key={q.id} type="button" onClick={() => !disabled && toggle(q)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-all flex items-start gap-3 ${isSelected ? 'border-primary bg-primary/5' : disabled ? 'border-border opacity-40 cursor-not-allowed' : 'border-border hover:border-muted-foreground'}`}>
                  <span className="text-primary shrink-0 mt-0.5">
                    {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </span>
                  <span className="text-sm line-clamp-2">{q.question}</span>
                </button>
              );
            })}
          </div>
        )}

        <Button onClick={() => onNext(selected)} disabled={selected.length === 0} className="w-full gap-2">
          Continuar — Personalizar estilos →
        </Button>
      </div>
    </div>
  );
}

// Phase 2: style editor for each card
function StylePhase({ questions, onNext, onBack }) {
  const [styles, setStyles] = useState(() =>
    Object.fromEntries(questions.map(q => [q.id, { front: DEFAULT_FRONT, back: DEFAULT_BACK }]))
  );

  const setColor = (qId, side, color) => setStyles(prev => ({
    ...prev, [qId]: { ...prev[qId], [side]: color }
  }));

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver a selección
      </button>
      <div>
        <h2 className="text-xl font-bold">Personalizar estilos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paso 2 de 3 — Elegí un color para el frente y el reverso de cada flashcard.
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium line-clamp-2">
              <span className="text-muted-foreground">{i + 1}. </span>{q.question}
            </p>

            {/* Preview */}
            <div className="flex gap-2">
              <div style={{ backgroundColor: styles[q.id].front }}
                className="flex-1 rounded-xl p-3 text-center text-xs font-semibold text-black border border-black/10 shadow-sm">
                FRENTE
              </div>
              <div style={{ backgroundColor: styles[q.id].back }}
                className="flex-1 rounded-xl p-3 text-center text-xs font-semibold text-black border border-black/10 shadow-sm">
                REVERSO
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Color del frente</p>
                <ColorPicker value={styles[q.id].front} onChange={c => setColor(q.id, 'front', c)} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Color del reverso</p>
                <ColorPicker value={styles[q.id].back} onChange={c => setColor(q.id, 'back', c)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => onNext(styles)} className="w-full gap-2 py-5">
        <Play className="h-4 w-4" /> Comenzar estudio
      </Button>
    </div>
  );
}

// Phase 3: custom flashcard study
function StudyPhase({ questions, styles, onBack }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]); // array of booleans
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const style = styles[q?.id] || { front: DEFAULT_FRONT, back: DEFAULT_BACK };
  const progress = idx / questions.length;

  const answer = (knew) => {
    const newResults = [...results, knew];
    setResults(newResults);
    if (idx + 1 >= questions.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
    }
  };

  if (done) {
    const correct = results.filter(Boolean).length;
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <div className="text-6xl">
          {correct === questions.length ? '🏆' : correct >= questions.length / 2 ? '🌟' : '💪'}
        </div>
        <h2 className="text-2xl font-bold">¡Sesión completada!</h2>
        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <p className="text-4xl font-bold text-primary">{correct}/{questions.length}</p>
          <p className="text-muted-foreground">flashcards que sabías</p>
        </div>
        <Button onClick={onBack} className="w-full gap-2 py-5">
          <ChevronLeft className="h-4 w-4" /> Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{idx + 1} de {questions.length}</span>
        <span>{results.filter(Boolean).length} correctas</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full"
          animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.div key={`front-${idx}`}
            initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }} transition={{ duration: 0.25 }}
            style={{ backgroundColor: style.front }}
            className="rounded-2xl p-8 min-h-[200px] flex flex-col items-center justify-center text-center border border-black/10 shadow-lg gap-4">
            <p className="text-sm font-bold uppercase tracking-wide text-black/40">PREGUNTA</p>
            <p className="text-lg font-semibold text-black">{q.question}</p>
            <Button onClick={() => setFlipped(true)} variant="outline"
              className="mt-4 bg-white/60 hover:bg-white/80 border-black/20 text-black gap-2">
              <RotateCcw className="h-4 w-4" /> Ver respuesta
            </Button>
          </motion.div>
        ) : (
          <motion.div key={`back-${idx}`}
            initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }} transition={{ duration: 0.25 }}
            style={{ backgroundColor: style.back }}
            className="rounded-2xl p-8 min-h-[200px] flex flex-col items-center justify-center text-center border border-black/10 shadow-lg gap-4">
            <p className="text-sm font-bold uppercase tracking-wide text-black/40">RESPUESTA</p>
            <p className="text-lg text-black">{q.flashcard_back || q.correct_answer}</p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => answer(false)}
                className="bg-red-100 hover:bg-red-200 text-red-700 border-red-200 border">
                ✗ No lo sabía
              </Button>
              <Button onClick={() => answer(true)}
                className="bg-green-100 hover:bg-green-200 text-green-700 border-green-200 border">
                ✓ Lo sabía
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2">
        Salir de la sesión
      </button>
    </div>
  );
}

export default function FlashcardCustomSession({ profile, onBack }) {
  const [phase, setPhase] = useState(1);
  const [selectedQ, setSelectedQ] = useState([]);
  const [cardStyles, setCardStyles] = useState({});

  if (phase === 1) return <SelectPhase onBack={onBack} onNext={(q) => { setSelectedQ(q); setPhase(2); }} />;
  if (phase === 2) return <StylePhase questions={selectedQ} onBack={() => setPhase(1)} onNext={(s) => { setCardStyles(s); setPhase(3); }} />;
  return <StudyPhase questions={selectedQ} styles={cardStyles} onBack={onBack} />;
}
