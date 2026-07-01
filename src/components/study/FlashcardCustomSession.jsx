import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Palette, CheckSquare, Square, RotateCcw, Play, Shuffle, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUBJECTS, NumericInput, DurationBadge } from './SessionConfigHelpers';

// ── Constants ────────────────────────────────────────────────────────────────

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

const DEFAULT_SIDE = { bg: '#CCE8FF', font: 'inherit', size: 16, bold: false, italic: false, underline: false, highlight: '' };
const DEFAULT_BACK = { ...DEFAULT_SIDE, bg: '#D5F5E3' };

const qText = q => q.statement || q.question || '';

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

// ── Visual sub-components ────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PASTEL_COLORS.map(c => (
        <button key={c.bg} type="button" title={c.name} onClick={() => onChange(c.bg)}
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
        <button key={c.value || '_none'} type="button" title={c.name} onClick={() => onChange(c.value)}
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
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Color de fondo</p>
        <ColorPicker value={side.bg} onChange={bg => set('bg', bg)} />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fuente</p>
        <div className="flex flex-wrap gap-1">
          {FONTS.map(f => (
            <button key={f.value} type="button" onClick={() => set('font', f.value)}
              style={{ fontFamily: f.value !== 'inherit' ? f.value : undefined }}
              className={`px-2 py-1 rounded-lg text-xs border transition-all ${side.font === f.value ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-muted-foreground'}`}>
              {f.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Tamaño: <span className="text-foreground">{side.size}px</span>
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">12</span>
          <input type="range" min={12} max={28} step={1} value={side.size}
            onChange={e => set('size', Number(e.target.value))} className="flex-1 accent-primary" />
          <span className="text-xs text-muted-foreground">28</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Formato</p>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'bold',      label: 'N', title: 'Negrita',   style: { fontWeight: 'bold' } },
            { key: 'italic',    label: 'C', title: 'Cursiva',   style: { fontStyle: 'italic' } },
            { key: 'underline', label: 'S', title: 'Subrayado', style: { textDecoration: 'underline' } },
          ].map(f => (
            <button key={f.key} type="button" title={f.title} onClick={() => set(f.key, !side[f.key])} style={f.style}
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
        <span style={{ backgroundColor: side.highlight, borderRadius: '3px', padding: '1px 4px' }}>{text}</span>
      ) : text}
    </p>
  );
}

// ── Phase 1: Select questions (no limit) ────────────────────────────────────

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
    setSelected(prev =>
      prev.find(s => s.id === q.id) ? prev.filter(s => s.id !== q.id) : [...prev, q]
    );
  };

  const selectAll = () => {
    const toAdd = filtered.filter(q => !selected.find(s => s.id === q.id));
    setSelected(prev => [...prev, ...toAdd]);
  };

  const clearAll = () => setSelected([]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" /> Flashcards con Personalización Visual
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Paso 1 de 4 — Solo preguntas tipo Flashcard. Sin límite de selección.</p>
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

        {/* Count + actions */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            {selected.length} seleccionada{selected.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-3">
            {selected.length > 0 && (
              <button onClick={clearAll} className="text-xs text-destructive hover:underline">
                Limpiar
              </button>
            )}
            <button onClick={selectAll} className="text-xs text-primary hover:underline">
              Seleccionar todas ({filtered.length})
            </button>
          </div>
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
              return (
                <button key={q.id} type="button" onClick={() => toggle(q)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-all flex items-start gap-3
                    ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}>
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
          Continuar — Configurar sesión →
        </Button>
      </div>
    </div>
  );
}

// ── Phase 2: Session config (NEW) ────────────────────────────────────────────

function ConfigPhase({ questions, onNext, onBack }) {
  const [config, setConfig] = useState({
    blockMinutes: 25, pauseMinutes: 5, blocks: 1, cycles: 2,
  });

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver a selección
      </button>
      <div>
        <h2 className="text-xl font-bold">⚙️ Configurar sesión</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Paso 2 de 4 — {questions.length} flashcards seleccionadas</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 gap-4">
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

        <Button onClick={() => onNext(config)} className="w-full gap-2 py-5">
          Continuar — Personalizar estilos →
        </Button>
      </div>
    </div>
  );
}

// ── Phase 3: Style editor ────────────────────────────────────────────────────

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
        <ChevronLeft className="h-4 w-4" /> Volver a configuración
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Personalizar estilos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Paso 3 de 4 — Color, fuente y formato por tarjeta.</p>
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
              <div className="px-4 pt-3 pb-2 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold line-clamp-2">
                  <span className="text-muted-foreground font-normal mr-1.5">{i + 1}.</span>
                  {qText(q) || <em className="text-muted-foreground">Sin texto</em>}
                </p>
              </div>
              <div className="px-4 pt-3 flex gap-2">
                {[['front', frontS, 'Frente'], ['back', backS, 'Reverso']].map(([sk, ss, label]) => (
                  <div key={sk} style={{ backgroundColor: ss.bg }}
                    className="flex-1 rounded-xl py-2.5 px-2 text-center border border-black/10 shadow-sm">
                    <StyledText text={label} side={{ ...ss, size: Math.min(ss.size, 12) }} className="text-black/80 leading-tight" />
                  </div>
                ))}
              </div>
              <div className="flex mt-3 mx-4 border-b border-border">
                {[['front', '▶ Frente (Pregunta)'], ['back', '◀ Reverso (Respuesta)']].map(([s, label]) => (
                  <button key={s} type="button" onClick={() => setActiveTabs(t => ({ ...t, [q.id]: s }))}
                    className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 -mb-px
                      ${activeTab === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>
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

// ── Phase 4: Study — Anki motor + fatigue + Pomodoro + DB save ───────────────

function StudyPhase({ questions, styles, config, profile, onBack }) {
  // Anki queue: each entry = { q, streak, lapses }
  const [studyQueue, setStudyQueue] = useState(() =>
    questions.map(q => ({ q, streak: 0, lapses: 0 }))
  );
  const [flipped, setFlipped] = useState(false);

  // Block/cycle/timer
  const [block, setBlock]             = useState(1);
  const [cycle, setCycle]             = useState(1);
  const [enginePhase, setEnginePhase] = useState('study'); // study | break | cycle_end | done
  const [blockSecs, setBlockSecs]     = useState(config.blockMinutes * 60);
  const [breakSecs, setBreakSecs]     = useState(config.pauseMinutes * 60);
  const [isPaused, setIsPaused]       = useState(false);

  // Stats
  const [stats, setStats] = useState({
    correct: 0, incorrect: 0, total: 0, xp: 0,
    startTime: Date.now(), answers: [], responseTimes: [],
  });
  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const [fatigueModal, setFatigueModal] = useState(false);
  const sessionSavedRef = useRef(false);
  const lastAnswerTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const breakTimerRef = useRef(null);

  // Current card
  const currentEntry = studyQueue[0] || null;
  const currentQ     = currentEntry?.q || null;
  const cardStyle    = currentQ
    ? (styles[currentQ.id] || { front: { ...DEFAULT_SIDE }, back: { ...DEFAULT_BACK } })
    : { front: { ...DEFAULT_SIDE }, back: { ...DEFAULT_BACK } };

  // How many unique questions have been graduated (removed from queue)
  const uniqueInQueue = new Set(studyQueue.map(e => e.q.id)).size;
  const graduated     = questions.length - uniqueInQueue;

  // ── Block countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (enginePhase !== 'study' || isPaused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setBlockSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); handleBlockTimeout(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [enginePhase, isPaused]); // eslint-disable-line

  // ── Break countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (enginePhase !== 'break') { clearInterval(breakTimerRef.current); return; }
    setBreakSecs(config.pauseMinutes * 60);
    breakTimerRef.current = setInterval(() => {
      setBreakSecs(s => {
        if (s <= 1) { clearInterval(breakTimerRef.current); startNextBlock(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(breakTimerRef.current);
  }, [enginePhase]); // eslint-disable-line

  // ── Queue empty → advance cycle/block/done ───────────────────────────────
  useEffect(() => {
    if (studyQueue.length > 0 || enginePhase !== 'study') return;
    if (cycle < config.cycles) {
      setCycle(c => c + 1);
      setStudyQueue(questions.map(q => ({ q, streak: 0, lapses: 0 })));
      setFlipped(false);
      lastAnswerTimeRef.current = Date.now();
    } else if (block < config.blocks) {
      setEnginePhase('cycle_end');
    } else {
      setEnginePhase('done');
    }
  }, [studyQueue.length, enginePhase, cycle, block, config.cycles, config.blocks]); // eslint-disable-line

  // ── Save session when done ───────────────────────────────────────────────
  useEffect(() => {
    if (enginePhase !== 'done' || sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    const s = statsRef.current;
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    const duration = Math.round((Date.now() - s.startTime) / 60000);
    base44.entities.StudySession.create({
      user_id: profile.user_id,
      session_type: 'flashcard_custom',
      questions_total: s.total,
      questions_correct: s.correct,
      questions_incorrect: s.incorrect,
      accuracy,
      xp_earned: s.xp,
      duration_minutes: duration,
      status: 'completed',
      completed_at: new Date().toISOString(),
      answers_log: s.answers,
      is_interleaved: false,
    }).then(() => {
      const newXp = (profile.xp || 0) + s.xp;
      let level = profile.level || 1;
      while (level < 50 && newXp >= level * 100) level++;
      const today     = new Date().toDateString();
      const lastStudy = profile.last_study_date ? new Date(profile.last_study_date).toDateString() : null;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      return base44.entities.UserProfile.update(profile.id, {
        xp: newXp, level,
        total_sessions:            (profile.total_sessions || 0) + 1,
        total_questions_answered:  (profile.total_questions_answered || 0) + s.total,
        total_correct:             (profile.total_correct || 0) + s.correct,
        last_study_date:           new Date().toISOString(),
        streak_days: lastStudy === today
          ? profile.streak_days
          : (lastStudy === yesterday ? (profile.streak_days || 0) + 1 : 1),
        unique_study_days: lastStudy !== today
          ? (profile.unique_study_days || 0) + 1
          : profile.unique_study_days,
      });
    }).catch(err => console.error('[FlashcardCustom] Error guardando sesión:', err));
  }, [enginePhase]); // eslint-disable-line

  const handleBlockTimeout = () => {
    if (block >= config.blocks) setEnginePhase('done');
    else setEnginePhase('cycle_end');
  };

  const startNextBlock = () => {
    setBlock(b => b + 1);
    setBlockSecs(config.blockMinutes * 60);
    setEnginePhase('study');
    setCycle(1);
    setStudyQueue(questions.map(q => ({ q, streak: 0, lapses: 0 })));
    setFlipped(false);
    lastAnswerTimeRef.current = Date.now();
  };

  const answer = (knew) => {
    const now = Date.now();
    const responseTime = (now - lastAnswerTimeRef.current) / 1000;
    lastAnswerTimeRef.current = now;

    setStats(prev => {
      const newTimes   = [...prev.responseTimes, responseTime].slice(-15);
      const newAnswers = [...prev.answers, { question_id: currentQ.id, answered_correctly: knew, time_seconds: responseTime }];
      const last5 = newAnswers.slice(-5);
      if (last5.length === 5 && last5.every(a => !a.answered_correctly)) {
        setFatigueModal(true);
        setIsPaused(true);
      }
      return {
        ...prev,
        correct:   prev.correct + (knew ? 1 : 0),
        incorrect: prev.incorrect + (knew ? 0 : 1),
        total:     prev.total + 1,
        xp:        prev.xp + (knew ? 8 : 0),
        answers:   newAnswers,
        responseTimes: newTimes,
      };
    });

    // Anki motor: matches StudyEngine logic
    setStudyQueue(prev => {
      const [head, ...rest] = prev;
      if (!head) return prev;
      if (knew) {
        const entry    = { ...head, streak: head.streak + 1 };
        const graduate = entry.lapses === 0 ? entry.streak >= 1 : entry.streak >= 2;
        if (graduate) return rest; // removed — useEffect handles empty queue
        const pos = Math.min(8, rest.length);
        return [...rest.slice(0, pos), entry, ...rest.slice(pos)];
      } else {
        const entry = { ...head, streak: 0, lapses: head.lapses + 1 };
        const pos   = Math.min(3, rest.length);
        return [...rest.slice(0, pos), entry, ...rest.slice(pos)];
      }
    });

    setFlipped(false);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = config.blockMinutes > 0 ? ((config.blockMinutes * 60 - blockSecs) / (config.blockMinutes * 60)) * 100 : 0;
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  // ── Done screen ───────────────────────────────────────────────────────────
  if (enginePhase === 'done') {
    const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <div className="text-6xl">{acc >= 80 ? '🏆' : acc >= 50 ? '🌟' : '💪'}</div>
        <h2 className="text-2xl font-bold">¡Sesión completada!</h2>
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold text-green-500">{stats.correct}</p>
              <p className="text-xs text-muted-foreground">Correctas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{stats.incorrect}</p>
              <p className="text-xs text-muted-foreground">Incorrectas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{acc}%</p>
              <p className="text-xs text-muted-foreground">Precisión</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">+{stats.xp} XP · {stats.total} respuestas en total</p>
        </div>
        <Button onClick={onBack} className="w-full gap-2 py-5">
          <ChevronLeft className="h-4 w-4" /> Volver al menú
        </Button>
      </div>
    );
  }

  // ── Break screen ──────────────────────────────────────────────────────────
  if (enginePhase === 'break') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-20">
        <div className="text-6xl">☕</div>
        <h2 className="text-2xl font-bold">Pausa — Bloque {block} completado</h2>
        <p className="text-muted-foreground">El siguiente bloque comenzará en:</p>
        <div className="text-5xl font-mono font-bold text-primary">{fmt(breakSecs)}</div>
        <Button onClick={() => { clearInterval(breakTimerRef.current); startNextBlock(); }} variant="outline">
          Saltar pausa
        </Button>
      </div>
    );
  }

  // ── Cycle end screen ──────────────────────────────────────────────────────
  if (enginePhase === 'cycle_end') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <div className="text-6xl">🎯</div>
        <h2 className="text-2xl font-bold">Bloque {block} completado</h2>
        <p className="text-muted-foreground">{cycle} ciclo{cycle > 1 ? 's' : ''} completado{cycle > 1 ? 's' : ''}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Precisión</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{stats.correct}/{stats.total}</p>
            <p className="text-xs text-muted-foreground">Correctas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setEnginePhase('done')}>Terminar sesión</Button>
          <Button className="flex-1" onClick={() => setEnginePhase('break')}>Continuar → Pausa ☕</Button>
        </div>
      </div>
    );
  }

  // ── Study screen ──────────────────────────────────────────────────────────
  if (!currentQ) return null;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Fatigue modal */}
      {fatigueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl space-y-5">
            <div className="text-6xl">🥱</div>
            <h3 className="text-xl font-bold">El sistema detecta fatiga</h3>
            <p className="text-sm text-muted-foreground">
              Tus tiempos de respuesta aumentaron y tuviste varios errores seguidos. ¿Querés tomarte una pausa?
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => { setFatigueModal(false); setIsPaused(false); }} className="w-full gap-2 py-4">
                <Play className="h-4 w-4" /> Reanudar estudio
              </Button>
              <Button variant="outline" onClick={onBack} className="w-full gap-2 py-4 text-muted-foreground">
                Salir sin guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Los resultados solo se guardan al completar la sesión.</p>
          </motion.div>
        </div>
      )}

      {/* Header bar with Pomodoro timer */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
              <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - pct / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold font-mono">{fmt(blockSecs)}</span>
            </div>
          </div>
          <div className="text-xs">
            <p className="font-semibold">Bloque {block}/{config.blocks} · Ciclo {cycle}/{config.cycles}</p>
            <p className="text-muted-foreground">{accuracy}% · {graduated}/{questions.length} dominadas</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsPaused(p => !p)}>
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
      </div>

      {/* Paused overlay */}
      {isPaused && !fatigueModal && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center space-y-2">
          <p className="font-semibold">⏸ Sesión en pausa — el tiempo se ha detenido</p>
          <Button size="sm" onClick={() => setIsPaused(false)}>
            <Play className="mr-2 h-3 w-3" /> Reanudar
          </Button>
        </div>
      )}

      {/* Card */}
      {!isPaused && (
        <>
          <AnimatePresence mode="wait">
            {!flipped ? (
              <motion.div key={`front-${currentQ.id}-${cycle}-${block}`}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
                style={{ backgroundColor: cardStyle.front.bg }}
                className="rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center border border-black/10 shadow-lg gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-2">Pregunta</p>
                <StyledText text={qText(currentQ)} side={cardStyle.front} className="text-black" />
                <Button onClick={() => setFlipped(true)} variant="outline"
                  className="mt-4 bg-white/60 hover:bg-white/80 border-black/20 text-black gap-2">
                  <RotateCcw className="h-4 w-4" /> Ver respuesta
                </Button>
              </motion.div>
            ) : (
              <motion.div key={`back-${currentQ.id}-${cycle}-${block}`}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
                style={{ backgroundColor: cardStyle.back.bg }}
                className="rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center border border-black/10 shadow-lg gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-2">Respuesta</p>
                <StyledText text={currentQ.flashcard_back || currentQ.correct_answer || ''} side={cardStyle.back} className="text-black" />
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

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${questions.length > 0 ? (graduated / questions.length) * 100 : 0}%` }} />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {graduated}/{questions.length} dominadas · {studyQueue.length} en cola
          </p>
        </>
      )}

      <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2">
        Salir sin guardar
      </button>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function FlashcardCustomSession({ profile, onBack }) {
  const [phase, setPhase]         = useState(1);
  const [selectedQ, setSelectedQ] = useState([]);
  const [sessionConfig, setSessionConfig] = useState({});
  const [cardStyles, setCardStyles]       = useState({});

  if (phase === 1) return (
    <SelectPhase onBack={onBack}
      onNext={q => { setSelectedQ(q); setPhase(2); }} />
  );
  if (phase === 2) return (
    <ConfigPhase questions={selectedQ} onBack={() => setPhase(1)}
      onNext={cfg => { setSessionConfig(cfg); setPhase(3); }} />
  );
  if (phase === 3) return (
    <StylePhase questions={selectedQ} onBack={() => setPhase(2)}
      onNext={s => { setCardStyles(s); setPhase(4); }} />
  );
  return (
    <StudyPhase questions={selectedQ} styles={cardStyles}
      config={sessionConfig} profile={profile} onBack={onBack} />
  );
}
