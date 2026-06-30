import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Palette, CheckSquare, Square, RotateCcw, Play, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUBJECTS } from './SessionConfigHelpers';

// ---- Constants ----

const PASTEL_COLORS = [
  { name: 'Rosa',      bg: '#FFD6E0' },
  { name: 'Lavanda',   bg: '#E8D5FF' },
  { name: 'Menta',     bg: '#C8F5DC' },
  { name: 'Melocotón', bg: '#FFE4CC' },
  { name: 'Celeste',   bg: '#CCE8FF' },
  { name: 'Limón',     bg: '#FFFACC' },
  { name: 'Turquesa',  bg: '#CCF2F4' },
  { name: 'Coral',     bg: '#FFDDD6' },
  { name: 'Lila',      bg: '#EED9F5' },
  { name: 'Verde',     bg: '#D5F5E3' },
  { name: 'Blanco',    bg: '#FFFFFF' },
  { name: 'Hueso',     bg: '#F5F0E8' },
];

const FONTS = [
  { name: 'Predeterminado', value: 'inherit' },
  { name: 'Arial',          value: 'Arial, sans-serif' },
  { name: 'Georgia',        value: 'Georgia, serif' },
  { name: 'Courier New',    value: '"Courier New", monospace' },
  { name: 'Trebuchet',      value: '"Trebuchet MS", sans-serif' },
  { name: 'Times New Roman',value: '"Times New Roman", serif' },
  { name: 'Comic Sans',     value: '"Comic Sans MS", cursive' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Sin resaltar', value: '' },
  { name: 'Amarillo',     value: '#FFFF88' },
  { name: 'Verde',        value: '#90EE90' },
  { name: 'Celeste',      value: '#ADD8E6' },
  { name: 'Rosa',         value: '#FFB6C1' },
  { name: 'Naranja',      value: '#FFD580' },
];

const MAX_SELECT = 5;

const DEFAULT_SIDE = {
  bg: '#CCE8FF', font: 'inherit', size: 16,
  bold: false, italic: false, underline: false, highlight: '',
};
const DEFAULT_BACK = { ...DEFAULT_SIDE, bg: '#D5F5E3' };

// helper to get question front text regardless of field name
const qText = q => q.statement || q.question || '';

// random side style
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function randomSide() {
  return {
    bg: pick(PASTEL_COLORS).bg,
    font: pick(FONTS).value,
    size: pick([13, 14, 15, 16, 17, 18, 20, 22]),
    bold: Math.random() > 0.55,
    italic: Math.random() > 0.72,
    underline: Math.random() > 0.85,
    highlight: Math.random() > 0.7 ? pick(HIGHLIGHT_COLORS.slice(1)).value : '',
  };
}

// ---- Shared sub-components ----

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PASTEL_COLORS.map(c => (
        <button key={c.bg} type="button" title={c.name}
          onClick={() => onChange(c.bg)}
          style={{ backgroundColor: c.bg }}
          className={`h-7 w-7 rounded-full border-2 transition-all ${value === c.bg ? 'border-gray-700 scale-110 shadow-sm' : 'border-transparent hover:scale-105 hover:border-gray-400'}`} />
      ))}
    </div>
  );
}

function HighlightPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {HIGHLIGHT_COLORS.map(c => (
        <button key={c.value || '_none'} type="button" title={c.name}
          onClick={() => onChange(c.value)}
          className={`h-6 w-6 rounded border-2 transition-all relative ${value === c.value ? 'border-gray-700 scale-110' : 'border-border hover:scale-105'}`}
          style={{ backgroundColor: c.value || '#fff' }}>
          {!c.value && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground font-bold">✕</span>}
        </button>
      ))}
    </div>
  );
}

function SideEditor({ side, onChange }) {
  const set = (key, val) => onChange({ ...side, [key]: val });

  return (
    <div className="space-y-3.5">
      {/* Background color */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Color de fondo</p>
        <ColorPicker value={side.bg} onChange={bg => set('bg', bg)} />
      </div>

      {/* Font family */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fuente</p>
        <div className="flex flex-wrap gap-1">
          {FONTS.map(f => (
            <button key={f.value} type="button"
              onClick={() => set('font', f.value)}
              style={{ fontFamily: f.value !== 'inherit' ? f.value : undefined }}
              className={`px-2 py-1 rounded-lg text-xs border transition-all ${side.font === f.value ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-muted-foreground'}`}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Tamaño: <span className="text-foreground">{side.size}px</span>
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">12</span>
          <input type="range" min={12} max={28} step={1} value={side.size}
            onChange={e => set('size', Number(e.target.value))}
            className="flex-1 accent-primary" />
          <span className="text-xs text-muted-foreground">28</span>
        </div>
      </div>

      {/* Format toggles */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Formato</p>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'bold',      label: 'N',  title: 'Negrita',   style: { fontWeight: 'bold' } },
            { key: 'italic',    label: 'C',  title: 'Cursiva',   style: { fontStyle: 'italic' } },
            { key: 'underline', label: 'S',  title: 'Subrayado', style: { textDecoration: 'underline' } },
          ].map(f => (
            <button key={f.key} type="button" title={f.title}
              onClick={() => set(f.key, !side[f.key])}
              style={f.style}
              className={`h-8 w-8 rounded-lg border-2 text-sm transition-all ${side[f.key] ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}>
              {f.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs text-muted-foreground">Destacado:</span>
            <HighlightPicker value={side.highlight} onChange={v => set('highlight', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Render text with all style options applied
function StyledText({ text, side, className = '' }) {
  return (
    <p style={{
      fontFamily: side.font !== 'inherit' ? side.font : undefined,
      fontSize: `${side.size}px`,
      fontWeight: side.bold ? 'bold' : 'normal',
      fontStyle: side.italic ? 'italic' : 'normal',
      textDecoration: side.underline ? 'underline' : 'none',
    }} className={className}>
      {side.highlight ? (
        <span style={{
          backgroundColor: side.highlight,
          borderRadius: '3px',
          padding: '1px 4px',
        }}>{text}</span>
      ) : text}
    </p>
  );
}

// ---- Phase 1: Select questions ----

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
          Paso 1 de 3 — Solo funciona con preguntas tipo Flashcard. Elegí hasta {MAX_SELECT}.
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

        {/* Count + select all */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${selected.length === MAX_SELECT ? 'text-green-600' : 'text-muted-foreground'}`}>
            {selected.length}/{MAX_SELECT} seleccionadas
          </span>
          <button onClick={selectAll} disabled={selected.length >= MAX_SELECT}
            className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline">
            Seleccionar primeras {MAX_SELECT}
          </button>
        </div>

        {/* List */}
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
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-all flex items-start gap-3
                    ${isSelected ? 'border-primary bg-primary/5' : disabled ? 'border-border opacity-40 cursor-not-allowed' : 'border-border hover:border-muted-foreground'}`}>
                  <span className="text-primary shrink-0 mt-0.5">
                    {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </span>
                  <span className="text-sm line-clamp-2">{qText(q) || <em className="text-muted-foreground">Sin texto</em>}</span>
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

// ---- Phase 2: Style editor ----

function StylePhase({ questions, onNext, onBack }) {
  const [styles, setStyles] = useState(() =>
    Object.fromEntries(questions.map(q => [q.id, { front: { ...DEFAULT_SIDE }, back: { ...DEFAULT_BACK } }]))
  );
  const [activeTabs, setActiveTabs] = useState(() =>
    Object.fromEntries(questions.map(q => [q.id, 'front']))
  );

  const setSide = (qId, side, newSide) => setStyles(prev => ({
    ...prev, [qId]: { ...prev[qId], [side]: newSide }
  }));

  const randomizeAll = () => {
    setStyles(Object.fromEntries(questions.map(q => [q.id, { front: randomSide(), back: randomSide() }])));
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver a selección
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Personalizar estilos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Paso 2 de 3 — Configurá color, fuente, tamaño y formato de cada tarjeta.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={randomizeAll} className="gap-1.5 shrink-0 mt-1">
          <Shuffle className="h-3.5 w-3.5" /> Aleatorio
        </Button>
      </div>

      <div className="space-y-4 pb-4">
        {questions.map((q, i) => {
          const activeTab = activeTabs[q.id];
          const side = styles[q.id][activeTab];
          const frontS = styles[q.id].front;
          const backS = styles[q.id].back;

          return (
            <div key={q.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Question header */}
              <div className="px-4 pt-3 pb-2 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold line-clamp-2">
                  <span className="text-muted-foreground font-normal mr-1.5">{i + 1}.</span>
                  {qText(q) || <em className="text-muted-foreground">Sin texto</em>}
                </p>
              </div>

              {/* Live mini-preview */}
              <div className="px-4 pt-3 flex gap-2">
                {[['front', frontS, 'Frente'], ['back', backS, 'Reverso']].map(([side_key, ss, label]) => (
                  <div key={side_key} style={{ backgroundColor: ss.bg }}
                    className="flex-1 rounded-xl py-2.5 px-2 text-center border border-black/10 shadow-sm">
                    <StyledText
                      text={label}
                      side={{ ...ss, size: Math.min(ss.size, 12) }}
                      className="text-black/80 leading-tight" />
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex mt-3 mx-4 border-b border-border">
                {[['front', '▶ Frente (Pregunta)'], ['back', '◀ Reverso (Respuesta)']].map(([s, label]) => (
                  <button key={s} type="button"
                    onClick={() => setActiveTabs(t => ({ ...t, [q.id]: s }))}
                    className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 -mb-px
                      ${activeTab === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Editor */}
              <div className="p-4">
                <SideEditor side={side} onChange={newSide => setSide(q.id, activeTab, newSide)} />
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={() => onNext(styles)} className="w-full gap-2 py-5">
        <Play className="h-4 w-4" /> Comenzar estudio
      </Button>
    </div>
  );
}

// ---- Phase 3: Study with custom styles ----

function StudyPhase({ questions, styles, onBack }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const cardStyle = styles[q?.id] || { front: { ...DEFAULT_SIDE }, back: { ...DEFAULT_BACK } };
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
        <span>{results.filter(Boolean).length} correctas · {results.filter(b => !b).length} incorrectas</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full"
          animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.div key={`front-${idx}`}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
            style={{ backgroundColor: cardStyle.front.bg }}
            className="rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center border border-black/10 shadow-lg gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-2">Pregunta</p>
            <StyledText text={qText(q)} side={cardStyle.front} className="text-black" />
            <Button onClick={() => setFlipped(true)} variant="outline"
              className="mt-4 bg-white/60 hover:bg-white/80 border-black/20 text-black gap-2">
              <RotateCcw className="h-4 w-4" /> Ver respuesta
            </Button>
          </motion.div>
        ) : (
          <motion.div key={`back-${idx}`}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
            style={{ backgroundColor: cardStyle.back.bg }}
            className="rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center border border-black/10 shadow-lg gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-2">Respuesta</p>
            <StyledText text={q.flashcard_back || q.correct_answer || ''} side={cardStyle.back} className="text-black" />
            <div className="flex gap-3 mt-4">
              <Button onClick={() => answer(false)}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-sm">
                ✗ No lo sabía
              </Button>
              <Button onClick={() => answer(true)}
                className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 shadow-sm">
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

// ---- Root component ----

export default function FlashcardCustomSession({ profile, onBack }) {
  const [phase, setPhase] = useState(1);
  const [selectedQ, setSelectedQ] = useState([]);
  const [cardStyles, setCardStyles] = useState({});

  if (phase === 1) return (
    <SelectPhase onBack={onBack} onNext={q => { setSelectedQ(q); setPhase(2); }} />
  );
  if (phase === 2) return (
    <StylePhase questions={selectedQ} onBack={() => setPhase(1)} onNext={s => { setCardStyles(s); setPhase(3); }} />
  );
  return <StudyPhase questions={selectedQ} styles={cardStyles} onBack={onBack} />;
}
