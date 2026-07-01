import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, Brain, Users } from 'lucide-react';

const leagueConfig = {
  bronze: { name: 'Bronce', emoji: '🥉', min: 0 },
  silver: { name: 'Plata', emoji: '🥈', min: 5 },
  gold: { name: 'Oro', emoji: '🥇', min: 15 },
  platinum: { name: 'Platino', emoji: '💎', min: 30 },
  diamond: { name: 'Diamante', emoji: '💠', min: 50 },
  master: { name: 'Maestro', emoji: '👑', min: 100 },
};

export default function Rankings() {
  const { profile } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [u, s] = await Promise.all([
        base44.entities.UserProfile.list(),
        base44.entities.StudySession.list('-created_date', 500),
      ]);
      setUsers(u);
      setSessions(s);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const byXP = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const bySabers = [...users].sort((a, b) => (b.sabers || 0) - (a.sabers || 0));

  // Specialized rankings
  const subjectRanking = (subject) => {
    return users.map(u => {
      const userSessions = sessions.filter(s => s.user_id === u.user_id && s.status === 'completed' && s.subjects_covered?.includes(subject));
      return { ...u, count: userSessions.length };
    }).filter(u => u.count > 0).sort((a, b) => b.count - a.count);
  };

  const RankList = ({ items, valueKey, valueLabel, emoji }) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Sin datos aún</p>
      ) : items.map((u, i) => (
        <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl ${u.user_id === profile?.user_id ? 'bg-primary/5 border border-primary/20' : 'bg-card border border-border'}`}>
          <span className="w-8 text-center font-bold text-lg">
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
          </span>
          <span className="text-2xl">{u.avatar_emoji || '👤'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{u.display_name}</p>
            <p className="text-xs text-muted-foreground">Nv. {u.level || 1}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{typeof valueKey === 'function' ? valueKey(u) : u[valueKey] || 0}</p>
            <p className="text-xs text-muted-foreground">{valueLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-space font-bold mb-6">🏆 Ranking Global</h1>

      <Tabs defaultValue="xp">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="xp" className="flex-1">XP General</TabsTrigger>
          <TabsTrigger value="leagues" className="flex-1">Ligas ⚔️</TabsTrigger>
          <TabsTrigger value="special" className="flex-1">Especiales</TabsTrigger>
        </TabsList>

        <TabsContent value="xp">
          <RankList items={byXP} valueKey="xp" valueLabel="XP" />
        </TabsContent>

        <TabsContent value="leagues">
          <RankList items={bySabers} valueKey="sabers" valueLabel="Sables" emoji="⚔️" />
          <div className="mt-6 bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">Ligas</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(leagueConfig).map(([key, cfg]) => (
                <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
                  <span className="text-2xl">{cfg.emoji}</span>
                  <p className="text-xs font-medium mt-1">{cfg.name}</p>
                  <p className="text-xs text-muted-foreground">{cfg.min}+ sables</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="special" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">📊 Mejor Precisión Global</h3>
            <RankList items={[...users].filter(u => (u.total_questions_answered||0)>=10).sort((a,b)=>((b.total_correct||0)/(b.total_questions_answered||1))-((a.total_correct||0)/(a.total_questions_answered||1))).slice(0,5)} valueKey={u => `${Math.round(((u.total_correct||0)/(u.total_questions_answered||1))*100)}%`} valueLabel="Precisión" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">🔥 Mejor Racha</h3>
            <RankList items={[...users].sort((a,b)=>(b.streak_days||0)-(a.streak_days||0)).slice(0,5)} valueKey="streak_days" valueLabel="Días" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">🔀 Más Estudio Entrelazado</h3>
            <RankList items={[...users].sort((a,b)=>(b.interleaved_sessions||0)-(a.interleaved_sessions||0)).slice(0,5)} valueKey="interleaved_sessions" valueLabel="Sesiones" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">📅 Más Días Espaciados</h3>
            <RankList items={[...users].sort((a,b)=>(b.unique_study_days||0)-(a.unique_study_days||0)).slice(0,5)} valueKey="unique_study_days" valueLabel="Días" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">💡 Mayor Elaboración</h3>
            <RankList items={[...users].sort((a,b)=>(b.elaboration_points||0)-(a.elaboration_points||0)).slice(0,5)} valueKey="elaboration_points" valueLabel="Puntos" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">🧠 Mayor Evocación</h3>
            <RankList items={[...users].sort((a,b)=>(b.evocation_points||0)-(a.evocation_points||0)).slice(0,5)} valueKey="evocation_points" valueLabel="Puntos" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
