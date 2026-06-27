import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle, Play, ChevronRight, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUBJECTS = [
  { id: 'identidad', name: 'Identidad Personal', emoji: '🧬', color: '#a78bfa',
    competencies: ['Autoconocimiento y rol médico','Ética clínica','Gestión del bienestar','Identidad profesional','Comunicación auténtica'],
    connections: ['taller','cuidados'], desc: 'Formación del profesional integral, ético y consciente de su rol.' },
  { id: 'taller', name: 'Taller de Arte', emoji: '🎨', color: '#f59e0b',
    competencies: ['Escritura Académica','Lectura Crítica','Análisis Crítico','Comunicación empática','Trabajo colaborativo'],
    connections: ['identidad','neuro'], desc: 'Expresión, creatividad y comunicación aplicadas a la medicina narrativa.' },
  { id: 'biomed', name: 'Ciencias Biomédicas', emoji: '🔬', color: '#22c55e',
    competencies: ['Análisis de Modelos','Energía y Equilibrio','Biología y Química','Física aplicada','Casos Biomédicos'],
    connections: ['neuro','lab','ia'], desc: 'Bases científicas fundamentales del cuerpo humano y la enfermedad.' },
  { id: 'ia', name: 'IA en Salud', emoji: '🤖', color: '#06b6d4',
    competencies: ['Diagnóstico asistido por IA','Machine Learning clínico','Ética de datos en salud','Evaluación de herramientas digitales'],
    connections: ['biomed','lab','neuro'], desc: 'Tecnología inteligente aplicada al diagnóstico y cuidado de la salud.' },
  { id: 'neuro', name: 'Neurociencias', emoji: '🧠', color: '#6366f1',
    competencies: ['Bases neurobiológicas','Cognición clínica','Neuroplasticidad','Estrategias de aprendizaje','Metacognición'],
    connections: ['biomed','ia','identidad'], desc: 'Cerebro, conducta y aprendizaje aplicados a la formación médica.' },
  { id: 'cuidados', name: 'Cuidados en Salud', emoji: '💊', color: '#ec4899',
    competencies: ['Historia del Cuidado','Práctica en contextos complejos','Trabajo interdisciplinario','Toma de Decisiones','Comunicación terapéutica'],
    connections: ['identidad','taller','lab'], desc: 'Prácticas de cuidado centradas en la persona y el equipo de salud.' },
  { id: 'lab', name: 'Laboratorio', emoji: '🧪', color: '#f97316',
    competencies: ['Técnica experimental','Interpretación de resultados','Bioseguridad','Integración diagnóstica','Análisis estadístico'],
    connections: ['biomed','ia','cuidados'], desc: 'Técnicas de laboratorio clínico aplicadas al diagnóstico.' },
];

const PROFILES = {
  ciencias: { name: 'Perfil Ciencias', emoji: '🔬', order: ['biomed','ia','neuro','lab','cuidados','taller','identidad'], highlight: ['biomed','ia','neuro'] },
  humanidades: { name: 'Perfil Humanidades', emoji: '📚', order: ['identidad','taller','cuidados','biomed','neuro','ia','lab'], highlight: ['identidad','taller','cuidados'] },
  tecnologia: { name: 'Perfil Tecnología', emoji: '💻', order: ['ia','lab','neuro','biomed','cuidados','identidad','taller'], highlight: ['ia','lab','neuro'] },
};

// Positions for the 7 subjects in a circular tree layout
const NODE_POSITIONS = {
  identidad: { x: 50, y: 15 },
  taller:    { x: 80, y: 30 },
  biomed:    { x: 80, y: 60 },
  ia:        { x: 60, y: 80 },
  neuro:     { x: 20, y: 60 },
  cuidados:  { x: 20, y: 30 },
  lab:       { x: 50, y: 50 },
};

const CONNECTIONS = [
  ['identidad','taller'],['identidad','cuidados'],['taller','neuro'],
  ['biomed','neuro'],['biomed','lab'],['biomed','ia'],
  ['ia','lab'],['ia','neuro'],['cuidados','lab'],['cuidados','taller'],
];

function TreeNode({ subj, status, profile, isHighlighted, isSelected, onClick }) {
  const pos = NODE_POSITIONS[subj.id];
  const statusStyle = {
    completed: { stroke: subj.color, fill: subj.color + '33', glow: true },
    active: { stroke: subj.color, fill: subj.color + '22', glow: true },
    available: { stroke: subj.color + '99', fill: 'transparent', glow: false },
    locked: { stroke: '#334155', fill: '#0f172a', glow: false },
  };
  const st = statusStyle[status] || statusStyle.available;

  return (
    <g onClick={() => onClick(subj)} style={{ cursor: 'pointer' }}>
      {st.glow && (
        <circle cx={`${pos.x}%`} cy={`${pos.y}%`} r="28" fill={subj.color} fillOpacity="0.07">
          <animate attributeName="r" values="26;32;26" dur="3s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.07;0.12;0.07" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={`${pos.x}%`} cy={`${pos.y}%`} r={isSelected ? "22" : "18"}
        fill={st.fill} stroke={isSelected ? subj.color : st.stroke}
        strokeWidth={isSelected ? "3" : "2"}
        style={{ transition: 'all 0.3s' }} />
      <text cx={`${pos.x}%`} cy={`${pos.y}%`} textAnchor="middle" dominantBaseline="middle" fontSize="16">{subj.emoji}</text>
      <text cx={`${pos.x}%`} cy={`${pos.y + 9}%`} textAnchor="middle" dominantBaseline="middle" fontSize="8"
        fill={status === 'locked' ? '#475569' : '#94a3b8'}
        style={{ fontFamily: 'monospace' }}>
        {subj.name.split(' ')[0]}
      </text>
      {status === 'completed' && (
        <text cx={`${pos.x + 3}%`} cy={`${pos.y - 3}%`} textAnchor="middle" fontSize="8" fill="#22c55e">✓</text>
      )}
      {status === 'locked' && (
        <text cx={`${pos.x + 3}%`} cy={`${pos.y - 3}%`} textAnchor="middle" fontSize="8" fill="#475569">🔒</text>
      )}
    </g>
  );
}

export default function LearningPaths() {
  const { profile } = useOutletContext();
  const [selectedProfile, setSelectedProfile] = useState('humanidades');
  const [selectedSubj, setSelectedSubj] = useState(null);
  const [progress, setProgress] = useState({ identidad: 45, taller: 20, biomed: 0, ia: 0, neuro: 65, cuidados: 30, lab: 0 });
  const [activeTab, setActiveTab] = useState('tree');

  const prof = PROFILES[selectedProfile];

  const getStatus = (subjId) => {
    const p = progress[subjId] || 0;
    if (p >= 80) return 'completed';
    if (p > 0) return 'active';
    const idx = prof.order.indexOf(subjId);
    if (idx === 0) return 'available';
    const prevId = prof.order[idx - 1];
    if ((progress[prevId] || 0) >= 30) return 'available';
    return 'locked';
  };

  const markProgress = (subjId, val) => {
    setProgress(prev => ({ ...prev, [subjId]: Math.min(100, (prev[subjId] || 0) + val) }));
  };

  const globalPct = Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / (SUBJECTS.length * 100) * 100);

  const tabs = [{ id: 'tree', label: '🌲 Árbol' }, { id: 'panel', label: '📊 Panel' }, { id: 'profile', label: '👤 Perfil' }];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-3">🌲 Rutas de Aprendizaje</h1>
        <p className="text-muted-foreground mt-1">Programa de Medicina — Árbol de competencias personalizado</p>
      </motion.div>

      {/* Global progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Avance global</p>
          <p className="text-2xl font-bold text-primary">{globalPct}%</p>
          <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${globalPct}%` }} />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Asignaturas activas</p>
          <p className="text-2xl font-bold">{Object.values(progress).filter(v => v > 0).length}/7</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Competencias logradas</p>
          <p className="text-2xl font-bold">{Object.values(progress).filter(v => v >= 80).length * 5}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Perfil activo</p>
          <p className="text-lg font-bold">{prof.emoji} {prof.name.replace('Perfil ', '')}</p>
        </div>
      </div>

      {/* WILLIE recommendation */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-4">
        <div className="text-3xl">🐥</div>
        <div>
          <p className="font-semibold text-sm">El sistema detecta</p>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const next = prof.order.find(id => getStatus(id) === 'available');
              const subj = SUBJECTS.find(s => s.id === next);
              return subj ? `Próxima asignatura recomendada: ${subj.emoji} ${subj.name}. Tu perfil ${prof.name} prioriza esta ruta.` : 'Continúa avanzando en tu ruta de aprendizaje.';
            })()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

          {activeTab === 'tree' && (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Tree */}
              <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden" style={{ minHeight: 480 }}>
                <div className="p-3 border-b border-border text-xs text-muted-foreground flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Logrado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" /> En progreso</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-muted-foreground inline-block" /> Disponible</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-700 inline-block" /> Bloqueado</span>
                </div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height: 400 }}>
                  {/* Connections */}
                  {CONNECTIONS.map(([a, b]) => {
                    const pa = NODE_POSITIONS[a]; const pb = NODE_POSITIONS[b];
                    const stA = getStatus(a); const stB = getStatus(b);
                    const isActive = stA !== 'locked' && stB !== 'locked';
                    const isHighConn = selectedSubj && (selectedSubj.id === a || selectedSubj.id === b);
                    return (
                      <line key={`${a}-${b}`}
                        x1={`${pa.x}%`} y1={`${pa.y}%`} x2={`${pb.x}%`} y2={`${pb.y}%`}
                        stroke={isHighConn ? '#6366f1' : isActive ? '#334155' : '#1e293b'}
                        strokeWidth={isHighConn ? "0.8" : "0.5"}
                        strokeDasharray={isActive ? "none" : "2,2"}
                        opacity={isHighConn ? 1 : 0.5} />
                    );
                  })}
                  {/* Nodes */}
                  {SUBJECTS.map(s => (
                    <TreeNode key={s.id} subj={s} status={getStatus(s.id)}
                      profile={selectedProfile}
                      isHighlighted={prof.highlight.includes(s.id)}
                      isSelected={selectedSubj?.id === s.id}
                      onClick={setSelectedSubj} />
                  ))}
                  {/* Root label */}
                  <text x="50%" y="2%" textAnchor="middle" fontSize="6" fill="#6b7280" style={{ fontFamily: 'monospace' }}>
                    {prof.emoji} {prof.name}
                  </text>
                  {/* Top node (cima) */}
                  <circle cx="50%" cy="2%" r="8" fill="none" stroke="#4CAF50" strokeWidth="0.5" strokeDasharray="2,2">
                    <animate attributeName="r" values="7;10;7" dur="4s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>

              {/* Detail panel */}
              <div className="w-full lg:w-72 space-y-4">
                {selectedSubj ? (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{selectedSubj.emoji}</span>
                        <div>
                          <h3 className="font-bold text-sm">{selectedSubj.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            getStatus(selectedSubj.id) === 'completed' ? 'bg-green-500/20 text-green-400' :
                            getStatus(selectedSubj.id) === 'active' ? 'bg-primary/20 text-primary' :
                            getStatus(selectedSubj.id) === 'available' ? 'bg-muted text-muted-foreground' :
                            'bg-slate-700/50 text-slate-500'
                          }`}>{getStatus(selectedSubj.id) === 'completed' ? 'Logrado' : getStatus(selectedSubj.id) === 'active' ? 'En progreso' : getStatus(selectedSubj.id) === 'available' ? 'Disponible' : 'Bloqueado'}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedSubj(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedSubj.desc}</p>
                    <div>
                      <p className="text-xs font-semibold mb-2">Competencias</p>
                      {selectedSubj.competencies.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedSubj.color }} />
                          <span className="text-xs">{c}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Progreso</span>
                        <span className="font-bold">{progress[selectedSubj.id] || 0}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress[selectedSubj.id] || 0}%`, backgroundColor: selectedSubj.color }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Conexiones activas</p>
                      <div className="flex gap-1 flex-wrap">
                        {selectedSubj.connections.map(cid => {
                          const cs = SUBJECTS.find(s => s.id === cid);
                          return cs ? <span key={cid} className="text-xs px-2 py-0.5 rounded-full bg-muted">{cs.emoji} {cs.name.split(' ')[0]}</span> : null;
                        })}
                      </div>
                    </div>
                    {(getStatus(selectedSubj.id) === 'available' || getStatus(selectedSubj.id) === 'active') && (
                      <Button size="sm" className="w-full gap-2" onClick={() => markProgress(selectedSubj.id, 15)}>
                        <Play className="h-3 w-3" /> Continuar nodo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground text-center">Toca un nodo del árbol para ver su detalle</p>
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium mb-1">💡 Recomendación activa</p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const avail = SUBJECTS.filter(s => getStatus(s.id) === 'available');
                          return avail.length > 0 ? `Hay ${avail.length} asignatura(s) disponibles para explorar: ${avail.map(s=>s.emoji).join(' ')}` : 'Continúa avanzando en tu ruta actual.';
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Subject bars */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold">Progreso por asignatura</p>
                  {SUBJECTS.map(s => (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">{s.emoji} <span className="truncate max-w-[100px]">{s.name}</span></span>
                        <span>{progress[s.id] || 0}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress[s.id]||0}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'panel' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {SUBJECTS.map((s, i) => {
                  const status = getStatus(s.id);
                  const p = progress[s.id] || 0;
                  return (
                    <div key={s.id} className={`bg-card border rounded-xl p-4 transition-all ${selectedSubj?.id === s.id ? 'border-primary' : 'border-border'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{s.emoji}</span>
                          <div>
                            <h3 className="font-semibold text-sm">{s.name}</h3>
                            <p className="text-xs text-muted-foreground">{s.competencies.length} competencias · {prof.order.indexOf(s.id)+1}° en tu ruta</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: s.color }}>{p}%</p>
                          <p className="text-xs text-muted-foreground capitalize">{status === 'active' ? 'En progreso' : status === 'completed' ? 'Logrado ✓' : status === 'available' ? 'Disponible' : 'Bloqueado'}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: s.color }} />
                      </div>
                      {(status === 'available' || status === 'active') && (
                        <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => markProgress(s.id, 10)}>
                          <Play className="h-3 w-3" /> Continuar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="font-semibold">Selecciona tu perfil académico</h2>
              <p className="text-sm text-muted-foreground">El perfil define qué asignaturas se recomiendan primero. Puedes explorar cualquiera independientemente.</p>
              <div className="grid gap-4">
                {Object.entries(PROFILES).map(([key, p]) => (
                  <button key={key} onClick={() => setSelectedProfile(key)}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${selectedProfile === key ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{p.emoji}</span>
                      <div>
                        <h3 className="font-bold">{p.name}</h3>
                        {selectedProfile === key && <span className="text-xs text-primary">Activo</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ruta sugerida:</p>
                      <div className="flex gap-1 flex-wrap">
                        {p.order.map((id, i) => {
                          const s = SUBJECTS.find(s => s.id === id);
                          return (
                            <span key={id} className="text-xs flex items-center gap-0.5">
                              {s?.emoji}<span className={`${p.highlight.includes(id) ? 'font-bold' : 'text-muted-foreground'} text-xs`}>{s?.name.split(' ')[0]}</span>
                              {i < p.order.length - 1 && <span className="text-muted-foreground"> →</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
