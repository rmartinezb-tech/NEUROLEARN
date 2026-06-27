import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#6366F1', '#22C55E', '#EAB308', '#A855F7', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];

const subjects = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'Otras'];
const types = ['multiple_choice', 'true_false', 'fill_blank', 'order_sequence', 'matching', 'development', 'clinical_case', 'flashcard'];
const typeLabels = { multiple_choice: 'Op.Múltiple', true_false: 'V/F', fill_blank: 'Espacios', order_sequence: 'Ordenar', matching: 'Matching', development: 'Desarrollo', clinical_case: 'Caso Clín.', flashcard: 'Flashcard' };

export default function Analytics() {
  const { profile } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const s = await base44.entities.StudySession.filter({ user_id: profile?.user_id }, '-created_date', 50);
      setSessions(s);
      setLoading(false);
    }
    if (profile) load();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Bar chart: accuracy by subject
  const subjectData = subjects.map(s => {
    const relevant = sessions.filter(sess => sess.subjects_covered?.includes(s));
    const avg = relevant.length > 0 ? Math.round(relevant.reduce((a, b) => a + (b.accuracy || 0), 0) / relevant.length) : 0;
    return { name: s.split(' ')[0], accuracy: avg };
  });

  // Line chart: XP over time
  const xpData = sessions.filter(s => s.status === 'completed').slice(0, 20).reverse().map((s, i) => ({
    session: i + 1, xp: s.xp_earned || 0, accuracy: s.accuracy || 0,
  }));

  // Donut: question types
  const typeData = types.map(t => {
    const count = sessions.reduce((a, s) => a + (s.question_types_covered?.filter(qt => qt === t).length || 0), 0);
    return { name: typeLabels[t], value: Math.max(count, 0) };
  }).filter(d => d.value > 0);

  // Radar: skill map
  const accuracy = profile.total_questions_answered > 0 ? Math.round((profile.total_correct / profile.total_questions_answered) * 100) : 0;
  const radarData = [
    { skill: 'Precisión', value: accuracy },
    { skill: 'Evocación', value: Math.min((profile.evocation_points || 0) * 10, 100) },
    { skill: 'Elaboración', value: Math.min((profile.elaboration_points || 0) * 5, 100) },
    { skill: 'Espaciado', value: Math.min((profile.unique_study_days || 0) * 5, 100) },
    { skill: 'Entrelazado', value: Math.min((profile.interleaved_sessions || 0) * 10, 100) },
  ];

  // Heatmap
  const heatmapData = subjects.map(subj => {
    const row = { subject: subj.split(' ')[0] };
    types.forEach(t => {
      const relevant = sessions.filter(s => s.subjects_covered?.includes(subj) && s.question_types_covered?.includes(t));
      row[t] = relevant.length > 0 ? Math.round(relevant.reduce((a, b) => a + (b.accuracy || 0), 0) / relevant.length) : -1;
    });
    return row;
  });

  // Forgetting curve
  const forgettingData = [];
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.completed_at).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
  if (completedSessions.length > 0) {
    let lastSessionDate = null;
    for (let day = 0; day <= 30; day++) {
      const date = new Date(Date.now() - (30 - day) * 86400000);
      const sessionsOnDay = completedSessions.filter(s => new Date(s.completed_at).toDateString() === date.toDateString());
      
      let retention;
      if (sessionsOnDay.length > 0) {
        retention = 100;
        lastSessionDate = date;
      } else if (lastSessionDate) {
        const daysSince = Math.floor((date - lastSessionDate) / 86400000);
        retention = Math.round(100 * Math.exp(-0.3 * daysSince));
      } else {
        retention = 0;
      }
      
      forgettingData.push({ day: day + 1, retention, date: date.toLocaleDateString('es', { day: '2-digit', month: 'short' }) });
    }
  }

  const heatColor = (val) => {
    if (val < 0) return 'bg-muted';
    if (val >= 70) return 'bg-green-500/30 text-green-700';
    if (val >= 30) return 'bg-yellow-500/30 text-yellow-700';
    return 'bg-red-500/30 text-red-700';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-space font-bold">📊 Analytics Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Precisión Global', value: `${accuracy}%`, emoji: '🎯' },
          { label: 'Evocación', value: profile.evocation_points || 0, emoji: '🧠' },
          { label: 'Elaboración', value: profile.elaboration_points || 0, emoji: '💡' },
          { label: 'Sesiones', value: profile.total_sessions || 0, emoji: '📚' },
          { label: 'Días de Estudio', value: profile.unique_study_days || 0, emoji: '📅' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{k.emoji}</div>
            <p className="text-xl font-bold">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">Rendimiento por Materia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">Evolución de XP y Precisión</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={xpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="session" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="xp" stroke="hsl(var(--primary))" strokeWidth={2} name="XP" />
              <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--success))" strokeWidth={2} name="Precisión %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">Tipos de Pregunta</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData.length > 0 ? typeData : [{ name: 'Sin datos', value: 1 }]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {(typeData.length > 0 ? typeData : [{ name: 'Sin datos', value: 1 }]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">🧠 Mapa de Habilidades</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
              <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
        <h3 className="font-semibold text-sm mb-4">🔥 Heatmap de Rendimiento (Materia × Tipo)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left p-2">Materia</th>
              {types.map(t => <th key={t} className="p-2 text-center">{typeLabels[t]}</th>)}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map(row => (
              <tr key={row.subject}>
                <td className="p-2 font-medium">{row.subject}</td>
                {types.map(t => (
                  <td key={t} className="p-1">
                    <div className={`rounded-lg p-2 text-center font-bold ${heatColor(row[t])}`}>
                      {row[t] >= 0 ? `${row[t]}%` : '—'}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Forgetting curve */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-4">📉 Curva del Olvido (Ebbinghaus)</h3>
        {forgettingData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={forgettingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v}% retención`} />
              <Line type="monotone" dataKey="retention" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">Completa sesiones para ver tu curva del olvido</p>
        )}
      </div>
    </div>
  );
}
