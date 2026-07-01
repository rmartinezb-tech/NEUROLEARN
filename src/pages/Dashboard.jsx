import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  BookOpen, Brain, Trophy, Swords, Zap, Target, Flame, Star,
  TrendingUp, Calendar, Award, ArrowRight, Clock, BarChart3
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import StatsCard from '../components/dashboard/StatsCard';
import QuickActions from '../components/dashboard/QuickActions';
import RecentSessions from '../components/dashboard/RecentSessions';
import ActiveUsers from '../components/dashboard/ActiveUsers';
import WeeklyGoals from '../components/dashboard/WeeklyGoals';
import LeagueCard from '../components/dashboard/LeagueCard';

// A user is "really online" only if they have a heartbeat timestamp within the last 2 minutes.
// We intentionally return false when last_active is null — no timestamp = no proof of presence.
// (We already filter by is_online: true, so everyone in the set has that flag; the timestamp
//  is the only reliable discriminator against stale/stuck sessions.)
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const isReallyOnline = (u) => {
  if (!u.last_active) return false;
  return Date.now() - new Date(u.last_active).getTime() < ONLINE_THRESHOLD_MS;
};

export default function Dashboard() {
  const { profile, user } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [questionMap, setQuestionMap] = useState({});
  const [allSessions, setAllSessions] = useState([]);

  const refreshOnline = async () => {
    const profiles = await base44.entities.UserProfile.filter({ is_online: true });
    setOnlineUsers((profiles || []).filter(isReallyOnline));
  };

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const [recentSess, allSess, allQ] = await Promise.all([
        base44.entities.StudySession.filter({ user_id: profile.user_id }, '-created_date', 10),
        base44.entities.StudySession.filter({ user_id: profile.user_id }, '-created_date', 500),
        base44.entities.Question.list('-created_date', 5000),
      ]);
      setSessions(recentSess);
      setAllSessions(allSess ?? []);
      setQuestionCount((allQ ?? []).length);
      const map = {};
      (allQ ?? []).forEach(q => { if (q.id) map[String(q.id)] = q; });
      setQuestionMap(map);
      await refreshOnline();
    }
    load();
  }, [profile]);

  // Real-time: re-evaluate list whenever any UserProfile changes (heartbeats, logouts, etc.)
  useEffect(() => {
    const unsub = base44.entities.UserProfile.subscribe(() => refreshOnline());
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Local timer: re-apply the time threshold every 30 s so stale users drop off
  // even if no Supabase event arrives (e.g. crashed tab with no beforeunload).
  useEffect(() => {
    const timer = setInterval(() => {
      setOnlineUsers(prev => prev.filter(isReallyOnline));
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!profile) return null;

  // Compute cognitive metrics from answer logs — same formulas as Analytics
  const allAnswers = allSessions.flatMap(s => {
    const log = Array.isArray(s.answers_log) ? s.answers_log : [];
    return log.map(a => ({ ...a, question_id: String(a.question_id ?? '') }));
  });
  const getQ = (qid) => questionMap[String(qid)] ?? null;

  const globalAccuracy = allAnswers.length > 0
    ? Math.round((allAnswers.filter(a => a.answered_correctly).length / allAnswers.length) * 100)
    : 0;

  const evocTypes = new Set(['development', 'clinical_case']);
  const evocAnswers = allAnswers.filter(a => { const q = getQ(a.question_id); return q && evocTypes.has(q.type); });
  const evocCorrect = evocAnswers.filter(a => a.answered_correctly).length;
  const evocPct = evocAnswers.length > 0 ? Math.round((evocCorrect / evocAnswers.length) * 100) : 0;

  const leagueConfig = {
    bronze: { name: 'Bronce', color: 'text-amber-600', emoji: '🥉', min: 0 },
    silver: { name: 'Plata', color: 'text-slate-400', emoji: '🥈', min: 5 },
    gold: { name: 'Oro', color: 'text-yellow-500', emoji: '🥇', min: 15 },
    platinum: { name: 'Platino', color: 'text-cyan-400', emoji: '💎', min: 30 },
    diamond: { name: 'Diamante', color: 'text-blue-400', emoji: '💠', min: 50 },
    master: { name: 'Maestro', color: 'text-purple-500', emoji: '👑', min: 100 },
  };

  const league = leagueConfig[profile.league || 'bronze'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-space font-bold flex items-center gap-3">
            <span className="text-4xl">{profile.avatar_emoji}</span>
            ¡Hola, {profile.display_name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile.streak_days > 0 ? `🔥 Racha de ${profile.streak_days} días` : 'Comienza tu racha de estudio hoy'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{onlineUsers.length} usuarios en línea</span>
          <div className="flex -space-x-1">
            {onlineUsers.slice(0, 5).map((u, i) => (
              <div key={i} className="h-7 w-7 rounded-full bg-card border-2 border-background flex items-center justify-center text-sm">
                {u.avatar_emoji || '👤'}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatsCard icon={Zap} label="XP Total" value={profile.xp || 0} color="text-primary" />
        <StatsCard icon={Target} label="Precisión" value={`${globalAccuracy}%`} color="text-green-500" />
        <StatsCard icon={Flame} label="Racha" value={`${profile.streak_days || 0} días`} color="text-orange-500" />
        <StatsCard icon={Star} label="Nivel" value={`${profile.level || 1}/50`} color="text-yellow-500" />
      </div>

      {/* Quick actions */}
      <QuickActions isAdmin={user?.role === 'admin' || user?.role === 'mentor'} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left column - 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <RecentSessions sessions={sessions} />
          <WeeklyGoals profile={profile} />
        </div>
        
        {/* Right column */}
        <div className="space-y-4">
          <LeagueCard league={league} sabers={profile.sabers || 0} />
          <ActiveUsers users={onlineUsers} />
          
          {/* Cognitive metrics */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Métricas Cognitivas
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Precisión Global', pct: globalAccuracy, raw: `${globalAccuracy}%`, bar: 'bg-primary' },
                { label: 'Evocación', pct: evocPct, raw: `${evocPct}%`, bar: 'bg-purple-500' },
                { label: 'Elaboración', pct: Math.min((profile.elaboration_points||0)*5, 100), raw: `${profile.elaboration_points||0} pts`, bar: 'bg-blue-500' },
                { label: 'Espaciado', pct: Math.min((profile.unique_study_days||0)*5, 100), raw: `${profile.unique_study_days||0} días`, bar: 'bg-green-500' },
                { label: 'Entrelazado', pct: Math.min(profile.interleaved_sessions||0, 100), raw: `${profile.interleaved_sessions||0} sesiones`, bar: 'bg-orange-500' },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <span className="text-xs font-semibold">{m.raw}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${m.bar} rounded-full transition-all duration-700`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
