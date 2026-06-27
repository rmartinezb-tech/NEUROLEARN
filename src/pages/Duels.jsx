import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Swords, Send, Play, X } from 'lucide-react';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import DuelArena from '../components/duels/DuelArena';

export default function Duels() {
  const { profile, user } = useOutletContext();
  const [duels, setDuels] = useState([]);
  const [users, setUsers] = useState([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeDuel, setActiveDuel] = useState(null);
  const [resultPopup, setResultPopup] = useState(null);

  useEffect(() => {
    loadData();
  }, [profile]);

  // Subscribe to duel changes for live result popup
  useEffect(() => {
    if (!profile) return;
    const unsub = base44.entities.Duel.subscribe((event) => {
      if (event.type === 'update' && event.data?.status === 'completed') {
        const d = event.data;
        if ((d.challenger_id === profile.user_id || d.opponent_id === profile.user_id) && !activeDuel) {
          setResultPopup(d);
          loadData();
        }
      }
    });
    return unsub;
  }, [profile?.user_id, activeDuel]);

  const loadData = async () => {
    if (!profile) return;
    const [allDuels, allUsers] = await Promise.all([
      base44.entities.Duel.list('-created_date', 50),
      base44.entities.UserProfile.list(),
    ]);
    setDuels(allDuels.filter(d => d.challenger_id === profile.user_id || d.opponent_id === profile.user_id));
    setUsers(allUsers.filter(u => u.user_id !== profile.user_id));
    setLoading(false);
  };

  const handleChallenge = async () => {
    if (!selectedOpponent) return;
    const opponent = users.find(u => u.user_id === selectedOpponent);
    const allQ = await base44.entities.Question.list('-created_date', 500);
    const eligible = allQ.filter(q => !['development', 'clinical_case'].includes(q.type) && q.options?.length);
    if (eligible.length < 5) { toast.error('No hay suficientes preguntas de opción múltiple'); return; }
    const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 10);

    await base44.entities.Duel.create({
      challenger_id: profile.user_id,
      challenger_name: profile.display_name,
      opponent_id: selectedOpponent,
      opponent_name: opponent?.display_name || 'Oponente',
      status: 'pending',
      questions: shuffled.map(q => q.id),
    });

    await base44.entities.Notification.create({
      user_id: selectedOpponent, type: 'duel_challenge',
      title: '🤺 ¡Desafío de Duelo!',
      message: `${profile.display_name} te ha retado a un duelo`,
      is_read: false,
    });

    toast.success('¡Desafío enviado!');
    setShowChallenge(false);
    setSelectedOpponent('');
    loadData();
  };

  const acceptDuel = async (duel) => {
    await base44.entities.Duel.update(duel.id, { status: 'in_progress' });
    setActiveDuel({ ...duel, status: 'in_progress' });
  };

  if (activeDuel) {
    return <DuelArena duel={activeDuel} profile={profile} onFinish={() => { setActiveDuel(null); loadData(); }} />;
  }

  const pendingChallenges = duels.filter(d => d.status === 'pending' && d.opponent_id === profile.user_id);
  const completedDuels = duels.filter(d => d.status === 'completed');
  const myTurnDuels = duels.filter(d =>
    d.status === 'in_progress' &&
    ((d.challenger_id === profile.user_id && (d.challenger_score === null || d.challenger_score === undefined)) ||
     (d.opponent_id === profile.user_id && (d.opponent_score === null || d.opponent_score === undefined)))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Result popup */}
      {resultPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            {(() => {
              const won = resultPopup.winner_id === profile.user_id;
              const myScore = resultPopup.challenger_id === profile.user_id ? resultPopup.challenger_score : resultPopup.opponent_score;
              const theirScore = resultPopup.challenger_id === profile.user_id ? resultPopup.opponent_score : resultPopup.challenger_score;
              const theirName = resultPopup.challenger_id === profile.user_id ? resultPopup.opponent_name : resultPopup.challenger_name;
              return (
                <>
                  <div className="text-6xl">{won ? '🏆' : '💔'}</div>
                  <h2 className="text-2xl font-bold">{won ? '¡Victoria!' : 'Derrota'}</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-4 ${won ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                      <p className="text-xs text-muted-foreground">Tú</p>
                      <p className="text-2xl font-bold">{myScore}</p>
                    </div>
                    <div className={`rounded-xl p-4 ${!won ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                      <p className="text-xs text-muted-foreground">{theirName}</p>
                      <p className="text-2xl font-bold">{theirScore}</p>
                    </div>
                  </div>
                  {won && <p className="text-green-400 text-sm font-medium">+1 Saber ganado ⚔️</p>}
                  <Button className="w-full" onClick={() => setResultPopup(null)}>Cerrar</Button>
                </>
              );
            })()}
          </motion.div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-space font-bold">🤺 Duelos</h1>
          <p className="text-sm text-muted-foreground">PVP cronometrado — 5 segundos por pregunta</p>
        </div>
        <Button onClick={() => setShowChallenge(true)} className="rounded-xl">
          <Swords className="mr-2 h-4 w-4" /> Retar
        </Button>
      </div>

      {/* My turn — in-progress */}
      {myTurnDuels.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">⚡ Tu turno — ¡Juega ahora!</h2>
          <div className="space-y-2">
            {myTurnDuels.map(d => (
              <div key={d.id} className="bg-card border-2 border-primary/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">vs. {d.challenger_id === profile.user_id ? d.opponent_name : d.challenger_name}</p>
                  <p className="text-xs text-muted-foreground">{d.questions?.length || 10} preguntas · En curso</p>
                </div>
                <Button onClick={() => setActiveDuel(d)} className="rounded-xl gap-2" size="sm">
                  <Play className="h-4 w-4" /> Jugar ahora
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending challenges */}
      {pendingChallenges.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">⚔️ Desafíos Pendientes</h2>
          <div className="space-y-2">
            {pendingChallenges.map(d => (
              <div key={d.id} className="bg-card border-2 border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{d.challenger_name} te ha retado</p>
                  <p className="text-xs text-muted-foreground">{d.questions?.length || 10} preguntas</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={async () => { await base44.entities.Duel.update(d.id, { status: 'rejected' }); loadData(); }} size="sm" className="rounded-xl">Rechazar</Button>
                  <Button onClick={() => acceptDuel(d)} size="sm" className="rounded-xl">Aceptar ⚔️</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="font-semibold text-sm mb-3">🏆 Historial de Duelos</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : completedDuels.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-xl">
            <div className="text-5xl mb-3">🤺</div>
            <p className="text-muted-foreground">Aún no has completado ningún duelo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedDuels.map(d => {
              const won = d.winner_id === profile.user_id;
              return (
                <div key={d.id} className={`bg-card border rounded-xl p-4 ${won ? 'border-green-500/30' : 'border-red-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{won ? '🏆' : '💔'}</span>
                      <div>
                        <p className="font-medium text-sm">{d.challenger_name} vs {d.opponent_name}</p>
                        <p className="text-xs text-muted-foreground">{d.challenger_score ?? '?'} — {d.opponent_score ?? '?'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${won ? 'text-green-500' : 'text-red-400'}`}>{won ? 'Victoria' : 'Derrota'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Challenge modal */}
      <Dialog open={showChallenge} onOpenChange={setShowChallenge}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🤺 Retar a Duelo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Elige un oponente. Se seleccionarán 10 preguntas aleatorias.</p>
            <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona oponente" /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.avatar_emoji} {u.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleChallenge} className="w-full rounded-xl" disabled={!selectedOpponent}>
              <Send className="mr-2 h-4 w-4" /> Enviar Desafío
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
