import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, Cell, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { COGNITIVE_SKILLS } from '../components/study/SessionConfigHelpers';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SUBJECTS = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'Otras'];
const SUBJ_SHORT = {
  'Neurociencias': 'Neuro',
  'Cuidados de la Salud': 'Cuidados',
  'Ciencias Biomédicas': 'Biomed.',
  'Otras': 'Otras',
};

const TYPES = [
  'multiple_choice', 'true_false', 'fill_blank', 'order_sequence',
  'matching', 'development', 'clinical_case', 'flashcard',
];
const TYPE_LABEL = {
  multiple_choice: 'Opción Múltiple', true_false: 'V/F', fill_blank: 'Completar',
  order_sequence: 'Ordenar', matching: 'Matching', development: 'Desarrollo',
  clinical_case: 'Caso Clínico', flashcard: 'Flashcard',
};
const TYPE_SHORT = {
  multiple_choice: 'Op.Múlt.', true_false: 'V/F', fill_blank: 'Complet.',
  order_sequence: 'Ordenar', matching: 'Matching', development: 'Desarro.',
  clinical_case: 'C.Clínico', flashcard: 'Flashcard',
};
const TYPE_COLOR = {
  multiple_choice: '#3B82F6', true_false: '#22C55E', fill_blank: '#A855F7',
  order_sequence: '#F97316', matching: '#EC4899', development: '#14B8A6',
  clinical_case: '#EF4444', flashcard: '#EAB308',
};
const SKILL_SHORT = {
  'Conceptual': 'Concept.', 'Procedimental': 'Proced.', 'Aplicación': 'Aplic.',
  'Comparación': 'Compar.', 'Causa y efecto': 'C.Efecto', 'Memorización': 'Memor.',
  'Resolución de problemas': 'Resoluc.', 'Análisis': 'Análisis', 'Síntesis': 'Síntesis',
  'Evaluación': 'Evalúa.', 'Interpretación': 'Interp.', 'Definición': 'Defin.',
  'Ejemplificación': 'Ejempl.',
};
const SKILL_COLORS = [
  '#6366F1', '#22C55E', '#EAB308', '#A855F7', '#EF4444',
  '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#8B5CF6',
  '#F59E0B', '#10B981', '#3B82F6',
];
const BAR_COLORS = ['#6366F1', '#22C55E', '#F97316', '#EC4899'];

// ─────────────────────────────────────────────
// MINI-DONUT (pure SVG)
// ─────────────────────────────────────────────
function MiniDonut({ accuracy, total, label, color, index, emoji = '' }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, accuracy)) / 100) * circ;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center gap-1.5 p-3 bg-card border border-border rounded-2xl
                 hover:shadow-lg hover:border-primary/30 transition-all cursor-default"
    >
      <div className="relative w-[72px] h-[72px]">
        <svg className="w-full h-full" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
          {/* track */}
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
          {/* fill */}
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[13px] font-extrabold leading-none" style={{ color }}>
            {total > 0 ? `${accuracy}%` : '—'}
          </span>
        </div>
      </div>
      <p className="text-[10px] font-semibold text-center leading-tight">{emoji && `${emoji} `}{label}</p>
      <p className="text-[9px] text-muted-foreground">{total > 0 ? `${total} resp.` : 'sin datos'}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// HEATMAP
// ─────────────────────────────────────────────
function cellStyle(errorRate) {
  if (errorRate < 0) return 'bg-muted/30 text-muted-foreground/50';
  if (errorRate <= 15) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
  if (errorRate <= 35) return 'bg-green-400/20 text-green-700 dark:text-green-400 border border-green-400/30';
  if (errorRate <= 55) return 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 border border-yellow-400/30';
  if (errorRate <= 75) return 'bg-orange-400/20 text-orange-700 dark:text-orange-400 border border-orange-400/30';
  return 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30';
}

function HeatmapTable({ rows, cols, getData, colLabels, rowLabels }) {
  if (cols.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full text-xs border-separate" style={{ borderSpacing: '3px' }}>
        <thead>
          <tr>
            <th className="text-left px-2 py-1 text-muted-foreground font-medium min-w-[80px]">Materia</th>
            {cols.map(col => (
              <th key={col} className="px-1 py-1 text-center text-muted-foreground font-medium whitespace-nowrap"
                style={{ minWidth: 68 }}>
                {colLabels?.[col] ?? col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row}>
              <td className="px-2 py-1 font-semibold text-xs whitespace-nowrap">
                {rowLabels?.[row] ?? row}
              </td>
              {cols.map(col => {
                const val = getData(row, col);
                return (
                  <td key={col} className="p-0.5">
                    <div className={`rounded-lg p-2 text-center font-bold text-xs ${cellStyle(val)}`}
                      style={{ minWidth: 58 }}>
                      {val >= 0 ? `${val}%` : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// RECHARTS TOOLTIP
// ─────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs space-y-0.5">
      <p className="font-semibold text-sm mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name ?? p.dataKey}: <strong>{p.value}{p.name?.includes('%') ? '%' : ''}</strong>
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// DIAGNOSTIC BANNER
// ─────────────────────────────────────────────
function DiagBanner({ sessions, totalAnswers, totalQuestions, questionsWithSubject, questionsWithSkill }) {
  const ok = totalAnswers > 0;
  const [open, setOpen] = useState(!ok); // auto-expand when no data
  return (
    <div className={`border rounded-xl text-xs overflow-hidden transition-all ${ok ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-left" onClick={() => setOpen(o => !o)}>
        {ok
          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          : <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />}
        <span className="font-medium flex-1">
          {ok
            ? `${totalAnswers.toLocaleString()} respuestas procesadas de ${sessions} sesiones — datos disponibles`
            : `${sessions} sesiones cargadas pero sin respuestas individuales registradas`}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
              <div><span className="font-semibold text-foreground">{sessions}</span> sesiones cargadas</div>
              <div><span className="font-semibold text-foreground">{totalAnswers.toLocaleString()}</span> respuestas en logs</div>
              <div><span className="font-semibold text-foreground">{totalQuestions.toLocaleString()}</span> preguntas en banco</div>
              <div><span className="font-semibold text-foreground">{questionsWithSubject}</span> preguntas con materia</div>
              <div><span className="font-semibold text-foreground">{questionsWithSkill}</span> preguntas con hab. cognitiva</div>
              {sessions === 0 && (
                <div className="col-span-2 sm:col-span-4 mt-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-[11px] space-y-1">
                  <p className="font-semibold">🔍 ¿Por qué no hay datos?</p>
                  <p>No se encontraron sesiones guardadas para tu usuario. Las sesiones de tipo <strong>Materia Única</strong>, <strong>Por Dificultad</strong> y <strong>Habilidades Cognitivas</strong> no se guardaban antes de ejecutar la migración SQL.</p>
                  <p>✅ <strong>Solución:</strong> Completá una nueva sesión de estudio — ahora sí se guardará correctamente.</p>
                  <p className="opacity-70">Abrí la consola del navegador (F12 → Console) para ver los logs de diagnóstico <code>[Analytics]</code>.</p>
                </div>
              )}
              {sessions > 0 && !ok && (
                <div className="col-span-2 sm:col-span-4 mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-[11px] space-y-1">
                  <p className="font-semibold">📋 Hay {sessions} sesiones pero sin respuestas individuales registradas.</p>
                  <p>Estas sesiones fueron guardadas antes de que el sistema registrara respuestas por pregunta. <strong>Completá nuevas sesiones</strong> para poblar el dashboard.</p>
                  <p className="opacity-70">Abrí la consola (F12 → Console) para ver los logs <code>[Analytics]</code>.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Analytics() {
  const { profile } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [questionMap, setQuestionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile?.user_id) {
      console.warn('[Analytics] profile.user_id no disponible:', profile);
      return;
    }

    const loadData = () => {
      setLoading(true);
      console.log('[Analytics] Cargando datos para user_id:', profile.user_id);
      Promise.all([
        base44.entities.StudySession.filter({ user_id: profile.user_id }, '-created_date', 500),
        base44.entities.Question.list('-created_date', 5000),
      ])
        .then(([sess, qs]) => {
          const sessArr = sess ?? [];
          const qsArr = qs ?? [];
          console.log('[Analytics] Sesiones cargadas:', sessArr.length);
          console.log('[Analytics] Preguntas cargadas:', qsArr.length);
          const withLog = sessArr.filter(s => Array.isArray(s.answers_log) && s.answers_log.length > 0);
          console.log('[Analytics] Sesiones con answers_log:', withLog.length);
          if (sessArr.length > 0) {
            console.log('[Analytics] Tipos de sesión en DB:', [...new Set(sessArr.map(s => s.session_type))]);
          }
          setSessions(sessArr);
          const map = {};
          qsArr.forEach(q => { if (q.id) map[String(q.id)] = q; });
          setQuestionMap(map);
        })
        .catch(err => {
          console.error('[Analytics] Error cargando datos:', err);
          setError(err?.message || 'Error al cargar datos');
        })
        .finally(() => setLoading(false));
    };

    loadData();
    // Auto-refresh whenever a study session is added/updated
    const unsub = base44.entities.StudySession.subscribe(() => loadData());
    return unsub;
  }, [profile?.user_id]); // eslint-disable-line

  // ── All individual answers, enriched with session reference ──
  const allAnswers = useMemo(() =>
    sessions.flatMap(s => {
      const log = Array.isArray(s.answers_log) ? s.answers_log : [];
      return log.map(a => ({ ...a, question_id: String(a.question_id ?? ''), _session: s }));
    })
  , [sessions]);

  // ── Lookup helper (tolerant of undefined) ──
  const getQ = (qid) => questionMap[String(qid)] ?? null;

  // ── Counts for diagnostic ──
  const diagCounts = useMemo(() => {
    const qs = Object.values(questionMap);
    return {
      sessions: sessions.length,
      totalAnswers: allAnswers.length,
      totalQuestions: qs.length,
      questionsWithSubject: qs.filter(q => q.subject).length,
      questionsWithSkill: qs.filter(q => q.cognitive_skill).length,
    };
  }, [sessions, allAnswers, questionMap]);

  // ── Global accuracy ──
  const globalAccuracy = useMemo(() => {
    if (!allAnswers.length) return 0;
    return Math.round((allAnswers.filter(a => a.answered_correctly).length / allAnswers.length) * 100);
  }, [allAnswers]);

  // ── Evocation: ONLY development + clinical_case ──
  const evocationData = useMemo(() => {
    const evocTypes = new Set(['development', 'clinical_case']);
    const evocAnswers = allAnswers.filter(a => {
      const q = getQ(a.question_id);
      return q && evocTypes.has(q.type);
    });
    const correct = evocAnswers.filter(a => a.answered_correctly).length;
    const total = evocAnswers.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { points: Math.floor(correct / 5), correct, total, pct };
  }, [allAnswers, questionMap]); // eslint-disable-line

  // ── Subject accuracy (bar chart) ──
  const subjectData = useMemo(() =>
    SUBJECTS.map((subj, i) => {
      const answers = allAnswers.filter(a => getQ(a.question_id)?.subject === subj);
      const correct = answers.filter(a => a.answered_correctly).length;
      const total = answers.length;
      return {
        name: SUBJ_SHORT[subj],
        fullName: subj,
        'Precisión (%)': total > 0 ? Math.round((correct / total) * 100) : 0,
        total,
        correct,
        fill: BAR_COLORS[i],
      };
    })
  , [allAnswers, questionMap]); // eslint-disable-line

  // ── Radar ──
  const radarData = useMemo(() => [
    { skill: 'Precisión',   value: globalAccuracy },
    { skill: 'Evocación',   value: Math.min(evocationData.pct, 100) },
    { skill: 'Elaboración', value: Math.min((profile?.elaboration_points || 0) * 5, 100) },
    { skill: 'Espaciado',   value: Math.min((profile?.unique_study_days || 0) * 5, 100) },
    { skill: 'Entrelazado', value: Math.min((profile?.interleaved_sessions || 0) * 10, 100) },
  ], [globalAccuracy, evocationData, profile]);

  // ── Line chart: sessions over time ──
  const lineData = useMemo(() =>
    [...sessions]
      .filter(s => s.status === 'completed')
      .reverse()
      .slice(0, 40)
      .map((s, i) => ({
        '#': i + 1,
        'XP': s.xp_earned ?? 0,
        'Precisión (%)': s.accuracy ?? 0,
      }))
  , [sessions]);

  // ── Donuts by QUESTION TYPE ──
  const typeDonutData = useMemo(() =>
    TYPES.map(type => {
      const answers = allAnswers.filter(a => getQ(a.question_id)?.type === type);
      const correct = answers.filter(a => a.answered_correctly).length;
      const total = answers.length;
      return {
        type,
        label: TYPE_LABEL[type],
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        incorrect: total - correct,
        total,
        color: TYPE_COLOR[type],
      };
    }).filter(d => d.total > 0)
  , [allAnswers, questionMap]); // eslint-disable-line

  // ── Donuts by COGNITIVE SKILL ──
  const skillDonutData = useMemo(() =>
    COGNITIVE_SKILLS.map((skill, i) => {
      const answers = allAnswers.filter(a => getQ(a.question_id)?.cognitive_skill === skill);
      const correct = answers.filter(a => a.answered_correctly).length;
      const total = answers.length;
      return {
        skill,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        total,
        color: SKILL_COLORS[i % SKILL_COLORS.length],
      };
    }).filter(d => d.total > 0)
  , [allAnswers, questionMap]); // eslint-disable-line

  // ── Heatmap 1: Subject × Type ──
  const heatmap1 = useMemo(() => {
    const map = {};
    SUBJECTS.forEach(subj => {
      map[subj] = {};
      TYPES.forEach(type => {
        const ans = allAnswers.filter(a => {
          const q = getQ(a.question_id);
          return q && q.subject === subj && q.type === type;
        });
        map[subj][type] = ans.length > 0
          ? Math.round((ans.filter(a => !a.answered_correctly).length / ans.length) * 100)
          : -1;
      });
    });
    return map;
  }, [allAnswers, questionMap]); // eslint-disable-line

  // ── Heatmap 2: Subject × Cognitive Skill (only active skills) ──
  const activeSkills = useMemo(() =>
    COGNITIVE_SKILLS.filter(skill =>
      allAnswers.some(a => getQ(a.question_id)?.cognitive_skill === skill)
    )
  , [allAnswers, questionMap]); // eslint-disable-line

  const heatmap2 = useMemo(() => {
    const map = {};
    SUBJECTS.forEach(subj => {
      map[subj] = {};
      activeSkills.forEach(skill => {
        const ans = allAnswers.filter(a => {
          const q = getQ(a.question_id);
          return q && q.subject === subj && q.cognitive_skill === skill;
        });
        map[subj][skill] = ans.length > 0
          ? Math.round((ans.filter(a => !a.answered_correctly).length / ans.length) * 100)
          : -1;
      });
    });
    return map;
  }, [allAnswers, questionMap, activeSkills]); // eslint-disable-line

  // ── Forgetting curve (Ebbinghaus estimate) ──
  const forgettingData = useMemo(() => {
    const completed = sessions
      .filter(s => s.status === 'completed' && s.completed_at)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
    let lastDate = null;
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - (29 - i) * 86400000);
      const onDay = completed.some(s => new Date(s.completed_at).toDateString() === date.toDateString());
      let retention;
      if (onDay) { retention = 100; lastDate = new Date(date); }
      else if (lastDate) {
        const daysSince = Math.floor((date - lastDate) / 86400000);
        retention = Math.round(100 * Math.exp(-0.3 * daysSince));
      } else { retention = 0; }
      return {
        date: date.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        retention,
      };
    });
  }, [sessions]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando sesiones y preguntas…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <p className="font-semibold">Error al cargar los datos</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const hasAnswers = allAnswers.length > 0;
  const newXp = profile?.xp || 0;
  let displayLevel = profile?.level || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">
      <h1 className="text-2xl font-space font-bold">📊 Analytics Dashboard</h1>

      {/* ── Diagnostic banner ── */}
      <DiagBanner {...diagCounts} />

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Precisión Global', value: `${globalAccuracy}%`, emoji: '🎯',
            sub: `${allAnswers.length.toLocaleString()} resp.` },
          { label: 'Puntos Evocación', value: evocationData.points, emoji: '🧠',
            sub: `${evocationData.correct} correctas (dev+cc)` },
          { label: 'Elaboración', value: profile?.elaboration_points ?? 0, emoji: '💡', sub: 'pts' },
          { label: 'Sesiones', value: completedSessions.length, emoji: '📚', sub: 'completadas' },
          { label: 'Días de Estudio', value: profile?.unique_study_days ?? 0, emoji: '📅', sub: 'días únicos' },
        ].map((k, i) => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-card border border-border rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
            <div className="text-2xl mb-1">{k.emoji}</div>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs font-medium text-foreground mt-0.5">{k.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Subject accuracy bar + Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Bar chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm">📚 Rendimiento por Materia</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            % de aciertos calculado de TODAS las respuestas individuales registradas
          </p>
          {!hasAnswers ? (
            <div className="py-14 text-center space-y-2">
              <p className="text-3xl">📭</p>
              <p className="text-sm text-muted-foreground">Sin datos de sesiones todavía.</p>
              <p className="text-xs text-muted-foreground/70">
                Completá una sesión de estudio y volvé aquí.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectData} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<ChartTip />}
                    formatter={(v, name, props) => [
                      `${v}% (${props.payload.correct}/${props.payload.total} resp.)`, 'Precisión'
                    ]} />
                  <Bar dataKey="Precisión (%)" radius={[8, 8, 0, 0]}>
                    {subjectData.map((entry, i) => (
                      <Cell key={`subj-${i}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {subjectData.every(d => d.total === 0) && (
                <p className="text-center text-xs text-amber-600 mt-2">
                  ⚠️ Hay respuestas pero ninguna pregunta tiene materia asignada. Asigná materias en el Banco de Preguntas.
                </p>
              )}
            </>
          )}
        </div>

        {/* Radar */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm">🧠 Mapa de Habilidades</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            <strong>Evocación</strong> = % correcto solo en Desarrollo y Caso Clínico
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
              <Radar dataKey="value" name="Valor"
                stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
              <Tooltip formatter={v => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Line chart: evolution ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4">📈 Evolución de XP y Precisión (últimas 40 sesiones)</h3>
        {lineData.length < 2 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Completá al menos 2 sesiones para ver tu evolución.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={lineData} margin={{ top: 4, right: 12, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="#" tick={{ fontSize: 10 }}
                label={{ value: 'Sesión', position: 'insideBottomRight', offset: -6, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="XP" stroke="#6366F1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Precisión (%)" stroke="#22C55E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── DONUTS: tipo de pregunta + habilidad cognitiva (uno debajo del otro) ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm">🍩 Tasa de Aciertos por Tipo de Pregunta</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          % de respuestas correctas para cada formato · Acumulado de todas las sesiones
        </p>
        {!hasAnswers ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Completá sesiones de estudio para ver las donuts.
          </p>
        ) : typeDonutData.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Hay respuestas pero las preguntas no tienen tipo asignado en el banco.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {typeDonutData.map((d, i) => (
              <MiniDonut key={d.type} label={d.label} accuracy={d.accuracy}
                total={d.total} color={d.color} index={i} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm">🎯 Tasa de Aciertos por Habilidad Cognitiva</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Solo habilidades con preguntas respondidas · % = correctas / total de esa habilidad
        </p>
        {skillDonutData.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-muted-foreground text-sm">Sin datos de habilidades cognitivas aún.</p>
            <p className="text-xs text-muted-foreground/60">
              Asigná habilidades cognitivas a las preguntas en el Banco de Preguntas y completá sesiones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {skillDonutData.map((d, i) => (
              <MiniDonut key={d.skill} label={d.skill} accuracy={d.accuracy}
                total={d.total} color={d.color} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── HEATMAPS: tipo de pregunta + habilidad cognitiva (uno debajo del otro) ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm">🔥 Heatmap: Tasa de Error · Materia × Tipo de Pregunta</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Acumulado de <strong>todas las sesiones</strong> ·{' '}
          <span className="text-emerald-600 font-medium">Verde</span> = pocos errores ·{' '}
          <span className="text-red-600 font-medium">Rojo</span> = muchos errores ·{' '}
          <span className="text-muted-foreground font-medium">—</span> = sin datos
        </p>
        {!hasAnswers ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Sin datos. El heatmap se activa al completar sesiones.
          </p>
        ) : (
          <>
            <HeatmapTable
              rows={SUBJECTS}
              cols={TYPES}
              getData={(subj, type) => heatmap1[subj]?.[type] ?? -1}
              colLabels={TYPE_SHORT}
              rowLabels={SUBJ_SHORT}
            />
            {SUBJECTS.every(s => TYPES.every(t => (heatmap1[s]?.[t] ?? -1) < 0)) && (
              <p className="text-center text-xs text-amber-600 mt-3">
                ⚠️ Hay respuestas pero las preguntas no tienen materia/tipo asignados en el banco.
              </p>
            )}
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm">🧩 Heatmap: Tasa de Error · Materia × Habilidad Cognitiva</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Acumulado de todas las sesiones · Solo muestra habilidades con preguntas respondidas
        </p>
        {activeSkills.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-muted-foreground text-sm">Sin datos de habilidades cognitivas aún.</p>
            <p className="text-xs text-muted-foreground/60">
              Asigná habilidades a las preguntas en el Banco de Preguntas, luego completá sesiones.
            </p>
          </div>
        ) : (
          <HeatmapTable
            rows={SUBJECTS}
            cols={activeSkills}
            getData={(subj, skill) => heatmap2[subj]?.[skill] ?? -1}
            colLabels={SKILL_SHORT}
            rowLabels={SUBJ_SHORT}
          />
        )}
      </div>

      {/* ── Evocation detail card (justo antes de curva del olvido) ── */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-2">🧠 Detalle de Evocación</h3>
        <p className="text-xs text-muted-foreground mb-4">
          La evocación se construye <strong>exclusivamente</strong> con preguntas de{' '}
          <strong>Desarrollo</strong> y <strong>Caso Clínico</strong>. 1 punto = 5 respuestas correctas de esos tipos.
          V/F, Opción Múltiple y todos los demás tipos <strong>no generan puntos de evocación</strong>.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-card/70 rounded-xl p-3">
            <p className="text-2xl font-bold text-primary">{evocationData.points}</p>
            <p className="text-xs text-muted-foreground">Puntos de evocación</p>
          </div>
          <div className="bg-card/70 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-500">{evocationData.correct}</p>
            <p className="text-xs text-muted-foreground">Respuestas correctas</p>
          </div>
          <div className="bg-card/70 rounded-xl p-3">
            <p className="text-2xl font-bold">
              {evocationData.total > 0 ? `${evocationData.pct}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Precisión en evocación</p>
          </div>
        </div>
        {evocationData.total === 0 && (
          <p className="text-center text-xs text-muted-foreground/70 mt-3">
            Respondé preguntas de Desarrollo o Caso Clínico para acumular puntos de evocación.
          </p>
        )}
      </div>

      {/* ── Forgetting curve ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4">📉 Curva del Olvido (Ebbinghaus) — últimos 30 días</h3>
        {forgettingData.every(d => d.retention === 0) ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Completá sesiones en los últimos 30 días para ver tu curva del olvido.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={forgettingData} margin={{ top: 4, right: 12, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => [`${v}%`, 'Retención estimada']} />
              <Line type="monotone" dataKey="retention" stroke="#A855F7" strokeWidth={2.5}
                dot={false} name="Retención %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
