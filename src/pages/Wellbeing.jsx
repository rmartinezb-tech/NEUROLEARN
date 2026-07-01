import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Send, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMOTIONS = [
  { id: 'motivated', emoji: '🚀', label: 'Motivado/a' },
  { id: 'calm', emoji: '🌿', label: 'Tranquilo/a' },
  { id: 'tired', emoji: '🔋', label: 'Cansado/a' },
  { id: 'anxious', emoji: '⚡', label: 'Ansioso/a' },
  { id: 'frustrated', emoji: '🌊', label: 'Frustrado/a' },
  { id: 'distracted', emoji: '🌪️', label: 'Disperso/a' },
  { id: 'okay', emoji: '🎯', label: 'Bien pero distraído/a' },
];

const PHASE_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#94a3b8'];

function BoxBreathing({ onClose }) {
  const phases = [
    { label: 'Inhala', sub: 'por la nariz', dur: 4, side: 0 },
    { label: 'Sostén', sub: 'retén el aire', dur: 4, side: 1 },
    { label: 'Exhala', sub: 'por la boca', dur: 4, side: 2 },
    { label: 'Sostén', sub: 'vacía los pulmones', dur: 4, side: 3 },
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [sec, setSec] = useState(4);
  const [cycles, setCycles] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);
  const totalCycles = 4;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSec(s => {
        const dur = phases[phaseIdx].dur;
        if (s <= 1) {
          const next = (phaseIdx + 1) % 4;
          if (next === 0) setCycles(c => c + 1);
          setPhaseIdx(next);
          setProgress(0);
          return phases[next].dur;
        }
        setProgress(((dur - s + 1) / dur) * 100);
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phaseIdx, running]);

  const phase = phases[phaseIdx];
  const color = PHASE_COLORS[phaseIdx];

  // SVG geometry
  const size = 220;
  const pad = 44;
  const inner = size - pad * 2;
  const corners = [
    [pad, pad],
    [pad + inner, pad],
    [pad + inner, pad + inner],
    [pad, pad + inner],
  ];
  const c0 = corners[phase.side];
  const c1 = corners[(phase.side + 1) % 4];
  const sp = progress / 100;
  const px = c0[0] + (c1[0] - c0[0]) * sp;
  const py = c0[1] + (c1[1] - c0[1]) * sp;

  const sideLabels = [
    { x: size / 2, y: pad - 16, label: 'INHALA', anchor: 'middle', idx: 0 },
    { x: pad + inner + 20, y: size / 2, label: 'SOSTÉN', anchor: 'start', idx: 1 },
    { x: size / 2, y: pad + inner + 20, label: 'EXHALA', anchor: 'middle', idx: 2 },
    { x: pad - 20, y: size / 2, label: 'SOSTÉN', anchor: 'end', idx: 3 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>

        <h3 className="font-bold text-lg mb-0.5">Box Breathing</h3>
        <p className="text-xs text-muted-foreground mb-5">4 lados · 4 segundos · {totalCycles} ciclos</p>

        {/* Phase label */}
        <motion.div key={phaseIdx} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-1">
          <p className="text-2xl font-bold" style={{ color }}>{phase.label}</p>
          <p className="text-xs text-muted-foreground">{phase.sub}</p>
        </motion.div>

        {/* Countdown */}
        <motion.div key={`${phaseIdx}-${sec}`} initial={{ scale: 1.25, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }} className="mb-4">
          <span className="text-6xl font-mono font-bold tabular-nums" style={{ color }}>{phase.dur - sec + 1}</span>
        </motion.div>

        {/* SVG square */}
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="mx-auto mb-4 overflow-visible">
          {/* Base square */}
          <rect x={pad} y={pad} width={inner} height={inner} rx="10"
            fill="none" stroke="hsl(var(--border))" strokeWidth="2" />

          {/* Active side glow */}
          {[0, 1, 2, 3].map(i => {
            const ca = corners[i];
            const cb = corners[(i + 1) % 4];
            const active = i === phaseIdx;
            return (
              <line key={i}
                x1={ca[0]} y1={ca[1]} x2={cb[0]} y2={cb[1]}
                stroke={active ? PHASE_COLORS[i] : 'hsl(var(--border))'}
                strokeWidth={active ? 3 : 1.5}
                strokeLinecap="round"
                style={active ? { filter: `drop-shadow(0 0 5px ${PHASE_COLORS[i]})` } : {}}
              />
            );
          })}

          {/* Corner dots */}
          {corners.map((c, i) => (
            <circle key={i} cx={c[0]} cy={c[1]} r="4"
              fill={i === phaseIdx || i === (phaseIdx + 1) % 4 ? color : 'hsl(var(--border))'}
              style={i === phaseIdx ? { filter: `drop-shadow(0 0 4px ${color})` } : {}}
            />
          ))}

          {/* Side labels */}
          {sideLabels.map(l => (
            <text key={l.idx} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="middle"
              fontSize="8" fontWeight={l.idx === phaseIdx ? 'bold' : 'normal'}
              fill={l.idx === phaseIdx ? PHASE_COLORS[l.idx] : 'hsl(var(--muted-foreground))'}>
              {l.label}
            </text>
          ))}

          {/* Moving dot */}
          <circle cx={px} cy={py} r="12" fill={color} fillOpacity="0.2" />
          <circle cx={px} cy={py} r="7" fill={color}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>

        {/* Cycle progress */}
        <div className="flex justify-center gap-2 mb-5">
          {Array.from({ length: totalCycles }, (_, i) => (
            <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${
              i < cycles ? 'w-6 bg-green-500' : i === cycles ? 'w-2.5 border-2 border-primary bg-primary/20' : 'w-2.5 border border-border bg-transparent'
            }`} />
          ))}
        </div>

        {cycles >= totalCycles ? (
          <div className="space-y-3">
            <p className="text-green-400 text-sm font-medium">✨ Lo lograste. Tu sistema nervioso te lo agradece.</p>
            <Button onClick={onClose} className="w-full rounded-xl">Terminar</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setRunning(r => !r)} className="w-full rounded-xl">
            {running ? '⏸ Pausar' : '▶ Reanudar'}
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function BreathingCircle({ onClose, name, phases, description }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [sec, setSec] = useState(phases[0].dur);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSec(s => {
        if (s <= 1) {
          const next = (phaseIdx + 1) % phases.length;
          if (next === 0) setCycles(c => c + 1);
          setPhaseIdx(next);
          return phases[next].dur;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phaseIdx]);

  const phase = phases[phaseIdx];
  const scale = phase.label === 'Inhala' ? 1.5 : phase.label === 'Exhala' ? 0.8 : 1.2;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center space-y-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4"><X className="h-4 w-4 text-muted-foreground" /></button>
        <h3 className="font-bold">{name}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="text-3xl font-bold text-primary">{sec}s</div>
        <motion.div animate={{ scale }} transition={{ duration: phase.dur, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-full border-4 border-primary/40 bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-sm font-semibold text-primary">{phase.label}</span>
        </motion.div>
        <div className="flex justify-center gap-1.5">
          {Array.from({length:5},(_,i)=>(
            <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i<cycles?'bg-green-500 border-green-500':'border-border'}`} />
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={onClose}>Terminar ejercicio</Button>
      </motion.div>
    </div>
  );
}

function WillieChat({ profile, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hola, ${profile?.display_name || ''}. Soy WILLIE. Estoy aquí para acompañarte. ¿Cómo puedo ayudarte hoy?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    const history = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'WILLIE'}: ${m.text}`).join('\n');
    const prompt = `Eres WILLIE, un asistente de bienestar cálido, empático y asertivo para estudiantes de medicina. Ofreces apoyo emocional, sugerencias de estudio, motivación y recursos de regulación emocional (respiración, movimiento, reflexión). No eres terapeuta pero eres un acompañante presente. Nunca minimizas ni juzgas. Si el usuario expresa malestar severo, validas y sugieres hablar con alguien de confianza.

Historial de conversación:
${history}

Usuario: ${userMsg}

Responde de forma cálida y asertiva en máximo 3 oraciones. Si ofreces opciones, usa máximo 3.`;
    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setLoading(false);
  };

  const quickActions = ['Quiero estudiar', '🌬️ Ayúdame a respirar', '💬 Solo quiero hablar', '🎯 Necesito motivación'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md flex flex-col" style={{ height: '70vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐥</span>
            <div><p className="font-semibold text-sm">WILLIE</p><p className="text-xs text-green-400">● En línea</p></div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
              }`}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {quickActions.map(a => (
            <button key={a} onClick={() => { setInput(a); }} className="text-xs bg-muted px-2.5 py-1 rounded-full hover:bg-primary/10 transition-colors">{a}</button>
          ))}
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Escribe algo a WILLIE..."
            className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary border border-transparent focus:border" />
          <Button size="icon" onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </motion.div>
    </div>
  );
}

function EmergencyMode({ onClose }) {
  const [step, setStep] = useState(null);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">🫶</div>
        <h2 className="text-xl font-bold mb-2">Aquí estoy</h2>
        <p className="text-muted-foreground mb-6">No tienes que estudiar ahora. Elige lo que necesitas:</p>
        {!step ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'breathe', emoji: '🫁', label: 'Respira conmigo' },
              { id: '54321', emoji: '🖐', label: 'Técnica 5-4-3-2-1' },
              { id: 'write', emoji: '✍️', label: 'Escribir cómo me siento' },
              { id: 'help', emoji: '🔗', label: 'Hablar con alguien' },
            ].map(opt => (
              <button key={opt.id} onClick={() => setStep(opt.id)}
                className="p-4 rounded-xl border border-border hover:border-primary hover:bg-muted transition-all text-center">
                <div className="text-3xl mb-2">{opt.emoji}</div>
                <div className="text-sm font-medium">{opt.label}</div>
              </button>
            ))}
          </div>
        ) : step === '54321' ? (
          <div className="text-left space-y-2 text-sm">
            {['👀 5 cosas que puedes ver','✋ 4 cosas que puedes tocar','👂 3 cosas que escuchas','👃 2 cosas que hueles','👅 1 cosa que saboreas'].map(s=><p key={s}>{s}</p>)}
            <Button className="w-full mt-4" onClick={() => setStep(null)}>Volver</Button>
          </div>
        ) : step === 'help' ? (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-lg text-left"><p className="font-semibold">Apoyo profesional</p><p className="text-muted-foreground">Habla con alguien de confianza, un psicólogo o llama a una línea de ayuda.</p></div>
            <Button className="w-full" onClick={() => setStep(null)}>Volver</Button>
          </div>
        ) : step === 'write' ? (
          <div>
            <textarea className="w-full h-28 bg-muted rounded-xl p-3 text-sm resize-none border border-border focus:outline-none" placeholder="Escribe cómo te sientes..." />
            <Button className="w-full mt-3" onClick={() => setStep(null)}>Guardar y volver</Button>
          </div>
        ) : null}
        <button onClick={onClose} className="mt-4 text-sm text-muted-foreground hover:text-foreground">Cerrar</button>
      </motion.div>
    </div>
  );
}

export default function Wellbeing() {
  const { profile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('checkin');
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [showBoxBreathing, setShowBoxBreathing] = useState(false);
  const [showBreathing478, setShowBreathing478] = useState(false);
  const [showBreathingCoherent, setShowBreathingCoherent] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [showWillie, setShowWillie] = useState(false);
  const [diaryNote, setDiaryNote] = useState('');
  const [diaryEmotion, setDiaryEmotion] = useState(null);
  const [cogLoad, setCogLoad] = useState(null);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [savingDiary, setSavingDiary] = useState(false);

  useEffect(() => {
    if (profile) loadDiary();
  }, [profile]);

  const loadDiary = async () => {
    const entries = await base44.entities.StudyDiary.filter({ user_id: profile.user_id }, '-created_date', 10);
    setDiaryEntries(entries);
  };

  const saveDiary = async () => {
    if (!diaryEmotion) { toast.error('Selecciona una emoción'); return; }
    setSavingDiary(true);
    await base44.entities.StudyDiary.create({
      user_id: profile.user_id,
      emotion: diaryEmotion.id,
      emotion_emoji: diaryEmotion.emoji,
      cog_load: cogLoad || 0,
      note: diaryNote,
      session_date: new Date().toISOString(),
    });
    toast.success('Entrada guardada en el diario ✍️');
    setDiaryNote('');
    setDiaryEmotion(null);
    setCogLoad(null);
    setSavingDiary(false);
    loadDiary();
  };

  const tabs = [
    { id: 'checkin', emoji: '💭', label: 'Chequeo' },
    { id: 'breathe', emoji: '🌬️', label: 'Respiración' },
    { id: 'diary', emoji: '📔', label: 'Diario' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Emergency button */}
      <button onClick={() => setEmergency(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110">
        <Heart className="h-6 w-6" />
      </button>

      {emergency && <EmergencyMode onClose={() => setEmergency(false)} />}
      {showBoxBreathing && <BoxBreathing onClose={() => setShowBoxBreathing(false)} />}
      {showBreathing478 && <BreathingCircle name="Respiración 4-7-8" description="Para ansiedad aguda"
        phases={[{label:'Inhala',dur:4},{label:'Sostén',dur:7},{label:'Exhala',dur:8}]}
        onClose={() => setShowBreathing478(false)} />}
      {showBreathingCoherent && <BreathingCircle name="Coherencia Cardíaca" description="Para dispersión"
        phases={[{label:'Inhala',dur:5},{label:'Exhala',dur:5}]}
        onClose={() => setShowBreathingCoherent(false)} />}
      {showWillie && <WillieChat profile={profile} onClose={() => setShowWillie(false)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">❤️ Bienestar Emocional</h1>
        <p className="text-muted-foreground mt-1">Tu espacio de autocuidado y regulación emocional</p>
      </div>

      {/* WILLIE greeting */}
      <button onClick={() => setShowWillie(true)} className="w-full text-left bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-rose-500/40 transition-all">
        <div className="text-4xl">🐥</div>
        <div className="flex-1">
          <p className="font-semibold">Hablar con WILLIE</p>
          <p className="text-sm text-muted-foreground">Apoyo emocional, estudio, motivación — disponible ahora</p>
        </div>
        <span className="text-xs text-green-400 font-medium">● En línea</span>
      </button>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

          {activeTab === 'checkin' && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-semibold text-lg">¿Cómo te sientes en este momento?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {EMOTIONS.map(e => (
                  <button key={e.id} onClick={() => setSelectedEmotion(e)}
                    className={`p-3 rounded-xl border-2 transition-all text-center hover:scale-105 ${selectedEmotion?.id === e.id ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                    <div className="text-3xl mb-1">{e.emoji}</div>
                    <div className="text-xs font-medium">{e.label}</div>
                  </button>
                ))}
              </div>
              {selectedEmotion && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-muted rounded-xl space-y-3">
                  <p className="font-medium">Es completamente válido sentirse <strong>{selectedEmotion.label.toLowerCase()}</strong> al estudiar.</p>
                  {selectedEmotion.id === 'anxious' && (
                    <Button size="sm" onClick={() => setShowBoxBreathing(true)} className="gap-2">
                      <Wind className="h-4 w-4" /> Box Breathing ahora
                    </Button>
                  )}
                  {selectedEmotion.id === 'frustrated' && (
                    <p className="text-sm text-muted-foreground">Comencemos con algo más sencillo hoy. Cada intento cuenta.</p>
                  )}
                  {selectedEmotion.id === 'tired' && (
                    <p className="text-sm text-muted-foreground">Reconoce tu cuerpo. Una pausa corta puede marcar la diferencia.</p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShowWillie(true)}>Hablar con WILLIE sobre esto</Button>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'breathe' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Técnicas de Respiración Guiada</h2>
              {[
                { name: 'Box Breathing', desc: 'Cuadrado 4-4-4-4. Para estrés general.', action: () => setShowBoxBreathing(true), emoji: '⬛' },
                { name: 'Respiración 4-7-8', desc: 'Para ansiedad aguda.', action: () => setShowBreathing478(true), emoji: '🫁' },
                { name: 'Coherencia Cardíaca', desc: '5-5. Para dispersión y foco.', action: () => setShowBreathingCoherent(true), emoji: '💚' },
              ].map(t => (
                <div key={t.name} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{t.emoji}</span>
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={t.action}>Iniciar</Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'diary' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg">📔 Diario Emocional</h2>
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">¿Cómo entras a la sesión hoy?</label>
                  <div className="flex gap-2 flex-wrap">
                    {EMOTIONS.map(e => (
                      <button key={e.id} onClick={() => setDiaryEmotion(e)}
                        className={`p-2 rounded-xl text-xl hover:scale-110 transition-transform border-2 ${diaryEmotion?.id === e.id ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                        title={e.label}>{e.emoji}</button>
                    ))}
                  </div>
                  {diaryEmotion && <p className="text-xs text-muted-foreground mt-1">Seleccionado: {diaryEmotion.emoji} {diaryEmotion.label}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Nota libre</label>
                  <textarea value={diaryNote} onChange={e => setDiaryNote(e.target.value)} maxLength={300} rows={3}
                    className="w-full bg-muted rounded-xl p-3 text-sm resize-none border border-border focus:outline-none focus:border-primary"
                    placeholder="¿Qué tienes en mente hoy?" />
                  <p className="text-xs text-muted-foreground text-right">{diaryNote.length}/300</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Carga cognitiva percibida</label>
                  <div className="flex gap-2 flex-wrap">
                    {[{v:1,l:'Muy fácil',c:'bg-green-500'},{v:2,l:'Cómodo',c:'bg-green-400'},{v:3,l:'Bien',c:'bg-yellow-400'},{v:4,l:'Costando',c:'bg-orange-400'},{v:5,l:'Saturado/a',c:'bg-red-500'}].map(o => (
                      <button key={o.v} onClick={() => setCogLoad(o.v)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${cogLoad===o.v ? `${o.c} text-white` : 'bg-muted text-muted-foreground'}`}>
                        {o.v} — {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={saveDiary} disabled={!diaryEmotion || savingDiary} className="w-full gap-2">
                  {savingDiary ? '...' : '✍️ Guardar en diario'}
                </Button>
              </div>

              {diaryEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Entradas recientes</h3>
                  {diaryEntries.map(e => (
                    <div key={e.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                      <span className="text-2xl">{e.emotion_emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium">{new Date(e.session_date).toLocaleDateString('es')}</p>
                          {e.cog_load > 0 && <span className="text-xs text-muted-foreground">Carga: {e.cog_load}/5</span>}
                        </div>
                        {e.note && <p className="text-sm text-muted-foreground mt-1">{e.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
