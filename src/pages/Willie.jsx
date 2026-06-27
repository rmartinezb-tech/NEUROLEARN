import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, RotateCcw, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const SUBJECT_SUGGESTIONS = ['Neurociencias', 'Ciencias Biomédicas', 'IA en Salud', 'Cuidados en Salud', 'Identidad Personal', 'Laboratorio', 'Taller de Arte'];
const QUICK_PROMPTS = [
  '¿Qué tema me recomiendas repasar hoy?',
  'Hazme 5 preguntas de Neurociencias',
  '¿Cómo puedo mejorar mi memoria?',
  'Explícame la neuroplasticidad',
  'Necesito motivación para estudiar',
  'Hazme preguntas de Ciencias Biomédicas',
];

const SYSTEM_PROMPT = `Eres WILLIE, el asistente de inteligencia artificial del simulador de estudio para estudiantes de bachillerato en medicina. Tu misión es ayudar a los estudiantes a prepararse para sus evaluaciones mediante preguntas, retroalimentación, explicaciones claras y apoyo motivacional. Eres un tutor académico, no un motor de búsqueda.

Personalidad: amigable, paciente, alentador. Usas un lenguaje claro y accesible. Celebras los aciertos y conviertes los errores en oportunidades de aprendizaje. Nunca ridiculizas ni presionas al estudiante. Respondes siempre en español.

Asignaturas con conocimiento especializado:
1. Identidad Personal — autoconocimiento, ética médica, vocación, valores, salud mental, proyecto de vida
2. Taller de Arte — expresión artística en salud, humanidades médicas, creatividad, comunicación visual
3. Ciencias Biomédicas — biología celular, genética, anatomía, fisiología, bioquímica, microbiología, inmunología, farmacología básica
4. IA en Salud — fundamentos de IA, ML en diagnóstico, ética de IA médica, análisis de datos clínicos
5. Neurociencias — SNC y SNP, neuroanatomía, neurofisiología, neuropsicología, plasticidad neural, cognición
6. Cuidados en Salud — enfermería básica, cuidados paliativos, primeros auxilios, comunicación con pacientes
7. Laboratorio — técnicas clínicas, bioseguridad, manejo de muestras, interpretación de resultados

METODOLOGÍA: Al iniciar, pregunta si quiere: (a) sesión de preguntas, (b) explicación de un tema, o (c) revisar un concepto.
- 3 aciertos seguidos → aumenta dificultad
- 2 errores seguidos → simplifica y explica antes de continuar
- Respuesta incorrecta: explica el error, usa "Casi, pero..." o "Buena intuición..."
- Al final de sesión de 10 preguntas: da resumen con aciertos, errores y temas a reforzar

LÍMITES: No diagnostica enfermedades. No hace tareas por el estudiante. Si hay angustia emocional: reconoce y sugiere pausa. Máximo 150 palabras por respuesta en modo simulacro.`;

export default function Willie() {
  const { profile, setProfile } = useOutletContext();
  const [enabled, setEnabled] = useState(profile?.willie_enabled !== false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (enabled && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: `¡Hola${profile?.display_name ? ', ' + profile.display_name : ''}! Soy WILLIE, tu asistente de estudio 🐥\n\n¿Qué quieres hacer hoy?\n• a) Sesión de preguntas\n• b) Explicación de un tema\n• c) Repasar un concepto específico\n\n¿Por qué asignatura empezamos?`,
        time: new Date().toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'}),
      }]);
    }
  }, [enabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleWillie = async (val) => {
    setEnabled(val);
    await base44.entities.UserProfile.update(profile.id, { willie_enabled: val });
    setProfile(prev => ({ ...prev, willie_enabled: val }));
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');

    const userMsg = { role: 'user', text: msg, time: new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'}) };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.slice(-10).map(m => `${m.role === 'user' ? 'Estudiante' : 'WILLIE'}: ${m.text}`).join('\n');
    const contextInfo = profile ? `[Estudiante: ${profile.display_name} | Precisión: ${profile.total_questions_answered > 0 ? Math.round((profile.total_correct/profile.total_questions_answered)*100) : 0}% | Sesiones: ${profile.total_sessions || 0}]` : '';
    const subjectCtx = selectedSubject ? `[Asignatura activa: ${selectedSubject}]` : '';

    const prompt = `${SYSTEM_PROMPT}

${contextInfo}
${subjectCtx}

Historial reciente:
${history}

Responde como WILLIE de forma cálida y pedagógica. Si es una pregunta de estudio, genera preguntas apropiadas. Usa formato claro con negritas cuando sea útil (ej: **término**). Máximo 200 palabras.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: response,
        time: new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'}),
      }]);
    } catch (err) {
      const isLimit = err?.message?.includes('limit');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: isLimit
          ? '⚠️ Se alcanzó el límite de integraciones IA del plan este mes. WILLIE no puede responder temporalmente. Contacta al administrador para actualizar el plan.'
          : `❌ Error al conectar con WILLIE: ${err?.message}`,
        time: new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'}),
      }]);
    }
    setLoading(false);
  };

  const resetChat = () => {
    setMessages([{
      role: 'assistant',
      text: `¡Hola de nuevo! Soy WILLIE. ¿Qué quieres estudiar hoy? 🐥`,
      time: new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'}),
    }]);
  };

  if (!enabled) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="text-6xl mb-4 animate-float">🐥</div>
      <h1 className="text-2xl font-bold mb-2">WILLIE está silenciado</h1>
      <p className="text-muted-foreground mb-6">Reactiva a WILLIE para recibir tutorías y retroalimentación personalizadas</p>
      <Button onClick={() => toggleWillie(true)} className="rounded-xl">Reactivar WILLIE 🐥</Button>
    </div>
  );

  const formatText = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className={`${line === '' ? 'h-2' : ''}`}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2,-2)}</strong>
              : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-float">🐥</span>
          <div>
            <h1 className="text-xl font-space font-bold">WILLIE</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs text-green-400">Asistente IA de Medicina · En línea</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={resetChat} title="Nueva conversación"><RotateCcw className="h-4 w-4" /></Button>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Activo</Label>
            <Switch checked={enabled} onCheckedChange={toggleWillie} />
          </div>
        </div>
      </div>

      {/* Subject selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        <button onClick={() => setSelectedSubject('')}
          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${!selectedSubject ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          Todas
        </button>
        {SUBJECT_SUGGESTIONS.map(s => (
          <button key={s} onClick={() => setSelectedSubject(s)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${selectedSubject === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {m.role === 'assistant' && <div className="text-xl shrink-0 mt-1">🐥</div>}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm space-y-1 ${
              m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'
            }`}>
              {formatText(m.text)}
              <p className="text-xs opacity-50 mt-1">{m.time}</p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start gap-2">
            <div className="text-xl">🐥</div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)} className="text-xs bg-muted px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-primary/10 transition-colors">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pregunta a WILLIE sobre medicina..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="shrink-0 rounded-xl">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
