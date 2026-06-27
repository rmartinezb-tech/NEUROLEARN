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

export default function Dashboard() {
  const { profile, user } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const [sess, questions, profiles] = await Promise.all([
        base44.entities.StudySession.filter({ user_id: profile.user_id }, '-created_date', 10),
        base44.entities.Question.list('-created_date', 1),
        base44.entities.UserProfile.filter({ is_online: true }),
      ]);
      setSessions(sess);
      // Get total count from list
      const allQ = await base44.entities.Question.list();
      setQuestionCount(allQ.length);
      setOnlineUsers(profiles);
    }
    load();
  }, [profile]);

  if (!profile) return null;

  const accuracy = profile.total_questions_answered > 0 
    ? Math.round((profile.total_correct / profile.total_questions_answered) * 100) 
    : 0;

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
        <StatsCard icon={Target} label="Precisión" value={`${accuracy}%`} color="text-green-500" />
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
                { label: 'Evocación', value: profile.evocation_points || 0, color: 'bg-purple-500' },
                { label: 'Elaboración', value: profile.elaboration_points || 0, color: 'bg-blue-500' },
                { label: 'Estudio Espaciado', value: `${profile.unique_study_days || 0} días`, color: 'bg-green-500' },
                { label: 'Entrelazamiento', value: `${profile.interleaved_sessions || 0} sesiones`, color: 'bg-orange-500' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className="text-sm font-semibold">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
