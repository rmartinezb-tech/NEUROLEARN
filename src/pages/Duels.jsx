import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Swords, Send, Play, Clock } from 'lucide-react';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import DuelArena from '../components/duels/DuelArena';

const XP_WIN  = 25;
const XP_LOSE = 5;
const SAB_WIN = 1;

// Track which completed duels the user has already seen (localStorage per user)
const seenKey = (uid) => `duel_seen_${uid}`;
const markSeen  = (uid, id) => {
  const arr = JSON.parse(localStorage.getItem(seenKey(uid)) || '[]');
  if (!arr.includes(id)) localStorage.setItem(seenKey(uid), JSON.stringify([...arr, id]));
};
const isSeen = (uid, id) => JSON.parse(localStorage.getItem(seenKey(uid)) || '[]').includes(id);

export default function Duels() {
  const { profile, user } = useOutletContext();
  const [duels, setDuels]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [loading, setLoading]     = useState(true);
  const [activeDuel, setActiveDuel] = useState(null);
  const [resultPopup, setResultPopup] = useState(null);

  useEffect(() => { loadData(); }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    const [allDuels, allUsers] = await Promise.all([
      base44.entities.Duel.list('-created_date', 50),
      base44.entities.UserProfile.list(),
    ]);
    const mine = (allDuels || []).filter(
      d => d.challenger_id === profile.user_id || d.opponent_id === profile.user_id,
    );
    setDuels(mine);
    setUsers((allUsers || []).filter(u => u.user_id !== profile.user_id));
    setLoading(false);

    // Show popup for any completed duel not yet seen
    const unseen = mine.filter(
      d => d.status === 'completed' && !isSeen(profile.user_id, d.id),
    );
    if (unseen.length > 0 && !activeDuel) {
      const d = unseen[0];
      markSeen(profile.user_id, d.id);
      setResultPopup(d);
    }
  };

  const handleChallenge = async () => {
    if (!selectedOpponent) return;
    const opponent = users.find(u => u.user_id === selectedOpponent);
    const allQ = await base44.entities.Question.list('-created_date', 500);
    const eligible = (allQ || []).filter(
      q => !['development', 'clinical_case'].includes(q.type) && q.options?.length,
    );
    if (eligible.length < 5) { toast.error('No hay suficientes preguntas disponibles'); return; }
    const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, 10);

    await base44.entities.Duel.create({
      challenger_id:    profile.user_id,
      challenger_name:  profile.display_name,
      opponent_id:      selectedOpponent,
      opponent_name:    opponent?.display_name || 'Oponente',
      status:           'pending',
      questions:        shuffled.map(q => q.id),
      challenger_score: null,   // null = hasn't played yet (distinguishes from 0/10)
      opponent_score:   null,
    });

    await base44.entities.Notification.create({
      user_id: selectedOpponent,
      type: 'duel_challenge',
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

  const handleFinishArena = () => {
    setActiveDuel(null);
    loadData();
  };

  if (activeDuel) {
    return <DuelArena duel={activeDuel} profile={profile} onFinish={handleFinishArena} />;
  }

  // ─── derived lists ──────────────────────────────────────────────────────────

  const pendingChallenges = duels.filter(
    d => d.status === 'pending' && d.opponent_id === profile.user_id,
  );

  // In-progress: my turn to play (my score not saved yet)
  const myTurnDuels = duels.filter(d => {
    if (d.status !== 'in_progress') return false;
    const iC = d.challenger_id === profile.user_id;
    const myScore = iC ? d.challenger_score : d.opponent_score;
    return myScore === null || myScore === undefined;
  });

  // In-progress: I already played, waiting for opponent
  const waitingDuels = duels.filter(d => {
    if (d.status !== 'in_progress') return false;
    const iC = d.challenger_id === profile.user_id;
    const myScore = iC ? d.challenger_score : d.opponent_score;
    return myScore !== null && myScore !== undefined;
  });

  const completedDuels = duels.filter(d => d.status === 'completed');

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Result popup ── */}
      {resultPopup && (() => {
        const won      = resultPopup.winner_id === profile.user_id;
        const isTie    = resultPopup.challenger_score === resultPopup.opponent_score;
        const myScore  = resultPopup.challenger_id === profile.user_id ? resultPopup.challenger_score : resultPopup.opponent_score;
        const theirScr = resultPopup.challenger_id === profile.user_id ? resultPopup.opponent_score   : resultPopup.challenger_score;
        const theirNm  = resultPopup.challenger_id === profile.user_id ? resultPopup.opponent_name    : resultPopup.challenger_name;
        const stolen   = resultPopup.stolen_item;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="text-6xl">{isTie ? '🤝' : won ? '🏆' : '💔'}</div>
              <h2 className="text-2xl font-bold">{isTie ? '¡Empate!' : won ? '¡Victoria!' : 'Derrota'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl p-4 ${won && !isTie ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">Tú</p>
                  <p className="text-2xl font-bold">{myScore ?? '?'}</p>
                </div>
                <div className={`rounded-xl p-4 ${!won && !isTie ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">{theirNm}</p>
                  <p className="text-2xl font-bold">{theirScr ?? '?'}</p>
                </div>
              </div>
              <div className={`rounded-xl p-3 text-sm font-medium ${won && !isTie ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {won && !isTie
                  ? <>+{SAB_WIN} Saber ⚔️ &nbsp;·&nbsp; +{XP_WIN} XP</>
                  : <>+{XP_LOSE} XP por participar</>
                }
              </div>
              {stolen && (
                <div className={`rounded-xl p-3 border text-sm text-left space-y-0.5 ${won && !isTie
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  <p className="font-bold">{won && !isTie ? '⚔️ ¡Robaste!' : '💀 Te robaron'}</p>
                  <p className="font-medium">{stolen.label}</p>
                  {!won && <p className="text-xs opacity-70">¡Estúdialo de vuelta para recuperarlo!</p>}
                </div>
              )}
              <Button className="w-full rounded-xl" onClick={() => setResultPopup(null)}>Cerrar</Button>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-space font-bold">🤺 Duelos</h1>
          <p className="text-sm text-muted-foreground">PVP cronometrado — 5 segundos por pregunta</p>
        </div>
        <Button onClick={() => setShowChallenge(true)} className="rounded-xl">
          <Swords className="mr-2 h-4 w-4" /> Retar
        </Button>
      </div>

      {/* ── My turn ── */}
      {myTurnDuels.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">⚡ Tu turno — ¡Juega ahora!</h2>
          <div className="space-y-2">
            {myTurnDuels.map(d => {
              const opponentName = d.challenger_id === profile.user_id ? d.opponent_name : d.challenger_name;
              return (
                <div key={d.id} className="bg-card border-2 border-primary/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">vs. {opponentName}</p>
                    <p className="text-xs text-muted-foreground">{d.questions?.length || 10} preguntas · En curso</p>
                  </div>
                  <Button onClick={() => setActiveDuel(d)} className="rounded-xl gap-2" size="sm">
                    <Play className="h-4 w-4" /> Jugar ahora
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Waiting for opponent ── */}
      {waitingDuels.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">⏳ Esperando al oponente</h2>
          <div className="space-y-2">
            {waitingDuels.map(d => {
              const isC = d.challenger_id === profile.user_id;
              const opponentName = isC ? d.opponent_name : d.challenger_name;
              const myScore = isC ? d.challenger_score : d.opponent_score;
              return (
                <div key={d.id} className="bg-card border border-dashed border-muted-foreground/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">vs. {opponentName}</p>
                    <p className="text-xs text-muted-foreground">Tu puntuación: <span className="font-semibold text-foreground">{myScore}/{d.questions?.length || 10}</span> · Esperando a {opponentName}</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Pending challenges ── */}
      {pendingChallenges.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">⚔️ Desafíos Pendientes</h2>
          <div className="space-y-2">
            {pendingChallenges.map(d => (
              <div key={d.id} className="bg-card border-2 border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{d.challenger_name} te ha retado</p>
                  <p className="text-xs text-muted-foreground">{d.questions?.length || 10} preguntas</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm" className="rounded-xl"
                    onClick={async () => { await base44.entities.Duel.update(d.id, { status: 'rejected' }); loadData(); }}
                  >Rechazar</Button>
                  <Button size="sm" className="rounded-xl" onClick={() => acceptDuel(d)}>Aceptar ⚔️</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── History ── */}
      <section>
        <h2 className="font-semibold text-sm mb-3">🏆 Historial de Duelos</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : completedDuels.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-xl">
            <div className="text-5xl mb-3">🤺</div>
            <p className="text-muted-foreground">Aún no has completado ningún duelo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedDuels.map(d => {
              const won = d.winner_id === profile.user_id;
              const isTie = d.challenger_score === d.opponent_score;
              const myScore  = d.challenger_id === profile.user_id ? d.challenger_score : d.opponent_score;
              const theirScr = d.challenger_id === profile.user_id ? d.opponent_score   : d.challenger_score;
              return (
                <div key={d.id} className={`bg-card border rounded-xl p-4 ${won && !isTie ? 'border-green-500/30' : isTie ? 'border-muted' : 'border-red-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{isTie ? '🤝' : won ? '🏆' : '💔'}</span>
                      <div>
                        <p className="font-medium text-sm">{d.challenger_name} vs {d.opponent_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tú: {myScore ?? '?'} &nbsp;·&nbsp; {d.challenger_id === profile.user_id ? d.opponent_name : d.challenger_name}: {theirScr ?? '?'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${won && !isTie ? 'text-green-500' : isTie ? 'text-muted-foreground' : 'text-red-400'}`}>
                      {isTie ? 'Empate' : won ? 'Victoria' : 'Derrota'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Challenge modal ── */}
      <Dialog open={showChallenge} onOpenChange={setShowChallenge}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🤺 Retar a Duelo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Elige un oponente. Se seleccionarán 10 preguntas aleatorias.
              Puedes jugar simultáneamente o en turnos — el resultado se compara al final.
            </p>
            <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1">
              <p>🏆 Ganador: <span className="font-semibold">+{SAB_WIN} Saber ⚔️ +{XP_WIN} XP</span></p>
              <p>💔 Perdedor: <span className="font-semibold">+{XP_LOSE} XP por participar</span></p>
              <p className="text-muted-foreground">Empate: el tiempo de respuesta decide</p>
            </div>
            <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona oponente" /></SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.avatar_emoji} {u.display_name}</SelectItem>
                ))}
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
