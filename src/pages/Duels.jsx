import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Swords, Send, Play, Clock, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import DuelArena from '../components/duels/DuelArena';

const XP_WIN  = 25;
const XP_TIE  = 10;
const XP_LOSE = 5;
const SAB_WIN = 1;

// LocalStorage helpers: track which completed duels the user has already seen
const seenKey  = (uid) => `duel_seen_${uid}`;
const markSeen = (uid, id) => {
  const arr = JSON.parse(localStorage.getItem(seenKey(uid)) || '[]');
  if (!arr.includes(id)) localStorage.setItem(seenKey(uid), JSON.stringify([...arr, id]));
};
const isSeen = (uid, id) => JSON.parse(localStorage.getItem(seenKey(uid)) || '[]').includes(id);

export default function Duels() {
  const { profile } = useOutletContext();
  const [duels, setDuels]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [activeDuel, setActiveDuel] = useState(null);
  const [resultPopup, setResultPopup] = useState(null);
  const [sentBanner, setSentBanner] = useState(null); // { opponentName }

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

    // Show popup for any completed duel not yet seen (while not in arena)
    if (!activeDuel) {
      const unseen = mine.filter(
        d => d.status === 'completed' && !isSeen(profile.user_id, d.id),
      );
      if (unseen.length > 0) {
        markSeen(profile.user_id, unseen[0].id);
        setResultPopup(unseen[0]);
      }
    }
  };

  const handleChallenge = async () => {
    if (!selectedOpponent || sending) return;
    setSending(true);
    try {
      const opponent = users.find(u => u.user_id === selectedOpponent);
      const allQ     = await base44.entities.Question.list('-created_date', 500);
      const eligible = (allQ || []).filter(
        q => !['development', 'clinical_case'].includes(q.type) && q.options?.length,
      );
      if (eligible.length < 5) { toast.error('No hay suficientes preguntas disponibles'); return; }
      const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, 10);

      await base44.entities.Duel.create({
        challenger_id:     profile.user_id,
        challenger_name:   profile.display_name,
        opponent_id:       selectedOpponent,
        opponent_name:     opponent?.display_name || 'Oponente',
        status:            'pending',
        questions:         shuffled.map(q => q.id),
        // Explicit nulls + played flags so we can detect "hasn't played yet"
        challenger_score:  null,
        opponent_score:    null,
        challenger_played: false,
        opponent_played:   false,
      });

      await base44.entities.Notification.create({
        user_id: selectedOpponent, type: 'duel_challenge',
        title: '🤺 ¡Desafío de Duelo!',
        message: `${profile.display_name} te ha retado a un duelo — ¡acepta y demuestra lo que sabes!`,
        is_read: false,
      });

      setShowChallenge(false);
      setSelectedOpponent('');
      setSentBanner({ opponentName: opponent?.display_name || 'tu oponente' });
      await loadData();
    } catch {
      toast.error('Error al enviar el desafío');
    } finally {
      setSending(false);
    }
  };

  const acceptDuel = async (duel) => {
    // Ensure scores and flags are properly null/false before playing
    await base44.entities.Duel.update(duel.id, {
      status:            'in_progress',
      challenger_played: duel.challenger_played ?? false,
      opponent_played:   duel.opponent_played   ?? false,
    });
    setActiveDuel({ ...duel, status: 'in_progress' });
  };

  const handleFinishArena = () => {
    setActiveDuel(null);
    loadData();
  };

  if (activeDuel) {
    return <DuelArena duel={activeDuel} profile={profile} onFinish={handleFinishArena} />;
  }

  // ─── Derived sections (all based on explicit played flags) ─────────────────

  // Challenges I SENT that are still waiting for acceptance
  const sentPending = duels.filter(
    d => d.status === 'pending' && d.challenger_id === profile.user_id,
  );

  // Challenges RECEIVED (opponent) waiting for my acceptance
  const receivedPending = duels.filter(
    d => d.status === 'pending' && d.opponent_id === profile.user_id,
  );

  // In-progress — it's MY turn (I haven't played yet)
  const myTurnDuels = duels.filter(d => {
    if (d.status !== 'in_progress') return false;
    const iC = d.challenger_id === profile.user_id;
    // Use played flag as primary check; fall back to score being null
    const iPlayed = iC ? (d.challenger_played === true) : (d.opponent_played === true);
    return !iPlayed;
  });

  // In-progress — I already played, waiting for opponent
  const waitingDuels = duels.filter(d => {
    if (d.status !== 'in_progress') return false;
    const iC      = d.challenger_id === profile.user_id;
    const iPlayed = iC ? (d.challenger_played === true) : (d.opponent_played === true);
    return iPlayed;
  });

  const completedDuels = duels.filter(d => d.status === 'completed');

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Result popup ── */}
      {resultPopup && (() => {
        const isTie    = resultPopup.winner_id === null && resultPopup.status === 'completed';
        const won      = !isTie && resultPopup.winner_id === profile.user_id;
        const myScore  = resultPopup.challenger_id === profile.user_id ? resultPopup.challenger_score : resultPopup.opponent_score;
        const theirScr = resultPopup.challenger_id === profile.user_id ? resultPopup.opponent_score   : resultPopup.challenger_score;
        const theirNm  = resultPopup.challenger_id === profile.user_id ? resultPopup.opponent_name    : resultPopup.challenger_name;
        const qCount   = resultPopup.questions?.length || 10;
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
                <div className={`rounded-xl p-3 ${won ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">Tú</p>
                  <p className="text-2xl font-bold">{myScore ?? '?'}</p>
                  <p className="text-xs text-muted-foreground">/ {qCount}</p>
                </div>
                <div className={`rounded-xl p-3 ${!won && !isTie ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">{theirNm}</p>
                  <p className="text-2xl font-bold">{theirScr ?? '?'}</p>
                  <p className="text-xs text-muted-foreground">/ {qCount}</p>
                </div>
              </div>

              <div className={`rounded-xl p-3 text-sm font-medium ${
                isTie ? 'bg-muted text-muted-foreground'
                : won  ? 'bg-primary/10 text-primary'
                :        'bg-muted text-muted-foreground'
              }`}>
                {isTie ? <>🤝 +{XP_TIE} XP (empate)</>
                 : won  ? <>+{SAB_WIN} Saber ⚔️ · +{XP_WIN} XP</>
                 :        <>+{XP_LOSE} XP por participar</>}
              </div>

              {stolen && !isTie && (
                <div className={`rounded-xl p-3 border text-sm text-left space-y-0.5 ${won
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  <p className="font-bold">{won ? '⚔️ ¡Robaste!' : '💀 Te robaron'}</p>
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
          <p className="text-sm text-muted-foreground">PVP cronometrado — 5 s por pregunta · ambos deben jugar para declarar ganador</p>
        </div>
        <Button onClick={() => setShowChallenge(true)} className="rounded-xl">
          <Swords className="mr-2 h-4 w-4" /> Retar
        </Button>
      </div>

      {/* ── Challenge sent banner ── */}
      <AnimatePresence>
        {sentBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3"
          >
            <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">¡Desafío enviado a {sentBanner.opponentName}!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cuando {sentBanner.opponentName} acepte, verás el duelo en <strong>"⚡ Tu turno"</strong>.
                Tú también deberás jugar las mismas preguntas — el ganador se declara solo cuando <em>ambos</em> hayan terminado.
              </p>
            </div>
            <button onClick={() => setSentBanner(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── My turn: duel accepted, I haven't played yet ── */}
      {myTurnDuels.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">⚡ Tu turno — ¡Juega ahora!</h2>
          <div className="space-y-2">
            {myTurnDuels.map(d => {
              const opponentName = d.challenger_id === profile.user_id ? d.opponent_name : d.challenger_name;
              const theyPlayed   = d.challenger_id === profile.user_id ? d.opponent_played : d.challenger_played;
              return (
                <div key={d.id} className="bg-card border-2 border-primary/40 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">vs. {opponentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.questions?.length || 10} preguntas ·{' '}
                      {theyPlayed
                        ? <span className="text-orange-400 font-medium">{opponentName} ya jugó — ¡es tu turno!</span>
                        : 'En curso — juega cuando quieras'}
                    </p>
                  </div>
                  <Button onClick={() => setActiveDuel(d)} className="rounded-xl gap-2 shrink-0" size="sm">
                    <Play className="h-4 w-4" /> Jugar
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Waiting: I played, waiting for opponent ── */}
      {waitingDuels.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">⏳ Esperando al oponente</h2>
          <div className="space-y-2">
            {waitingDuels.map(d => {
              const isC          = d.challenger_id === profile.user_id;
              const opponentName = isC ? d.opponent_name : d.challenger_name;
              const myScore      = isC ? d.challenger_score : d.opponent_score;
              const qCount       = d.questions?.length || 10;
              return (
                <div key={d.id} className="bg-card border border-dashed border-muted-foreground/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">vs. {opponentName}</p>
                    <p className="text-xs text-muted-foreground">
                      Tu puntaje: <span className="font-semibold text-foreground">{myScore ?? '?'}/{qCount}</span>
                      {' · '}Esperando que {opponentName} juegue
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground animate-pulse shrink-0" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sent challenges waiting for acceptance ── */}
      {sentPending.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">📨 Desafíos enviados</h2>
          <div className="space-y-2">
            {sentPending.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between opacity-80">
                <div>
                  <p className="font-medium">vs. {d.opponent_name}</p>
                  <p className="text-xs text-muted-foreground">Esperando que {d.opponent_name} acepte el desafío</p>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Received challenges ── */}
      {receivedPending.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-3">⚔️ Desafíos recibidos</h2>
          <div className="space-y-2">
            {receivedPending.map(d => (
              <div key={d.id} className="bg-card border-2 border-yellow-500/30 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{d.challenger_name} te ha retado</p>
                  <p className="text-xs text-muted-foreground">{d.questions?.length || 10} preguntas · Responde el desafío</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="rounded-xl"
                    onClick={async () => { await base44.entities.Duel.update(d.id, { status: 'rejected' }); loadData(); }}>
                    Rechazar
                  </Button>
                  <Button size="sm" className="rounded-xl" onClick={() => acceptDuel(d)}>
                    Aceptar ⚔️
                  </Button>
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
              const isTie    = d.winner_id === null;
              const won      = !isTie && d.winner_id === profile.user_id;
              const myScore  = d.challenger_id === profile.user_id ? d.challenger_score : d.opponent_score;
              const theirScr = d.challenger_id === profile.user_id ? d.opponent_score   : d.challenger_score;
              const qCount   = d.questions?.length || 10;
              return (
                <div key={d.id} className={`bg-card border rounded-xl p-4 ${
                  isTie ? 'border-muted' : won ? 'border-green-500/30' : 'border-red-500/20'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{isTie ? '🤝' : won ? '🏆' : '💔'}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{d.challenger_name} vs {d.opponent_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tú: <span className="font-semibold">{myScore ?? '?'}/{qCount}</span>
                          {' · '}
                          {d.challenger_id === profile.user_id ? d.opponent_name : d.challenger_name}:{' '}
                          <span className="font-semibold">{theirScr ?? '?'}/{qCount}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold block ${
                        isTie ? 'text-muted-foreground' : won ? 'text-green-500' : 'text-red-400'}`}>
                        {isTie ? 'Empate' : won ? 'Victoria' : 'Derrota'}
                      </span>
                      {d.stolen_item && (
                        <span className="text-xs text-muted-foreground block">
                          {won ? '⚔️ robaste' : '💀 te robaron'}
                        </span>
                      )}
                    </div>
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
              Elige un oponente. Se seleccionarán 10 preguntas aleatorias de opción múltiple.
            </p>

            {/* Winner criteria */}
            <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1.5">
              <p className="font-semibold text-foreground mb-1">📋 ¿Cómo se gana?</p>
              <p>🥇 <strong>Más respuestas correctas</strong> → gana</p>
              <p>⏱️ <strong>Empate en respuestas</strong> → menor tiempo de respuesta → gana</p>
              <p>🤝 <strong>Empate exacto</strong> en ambos → empate real (nadie pierde nada)</p>
              <div className="border-t border-border/50 pt-1.5 mt-1.5 space-y-1">
                <p>🏆 Ganador: <span className="font-semibold">+{SAB_WIN} Saber ⚔️ · +{XP_WIN} XP · roba 1 ítem</span></p>
                <p>💔 Perdedor: <span className="font-semibold">+{XP_LOSE} XP · pierde 1 ítem</span></p>
                <p>🤝 Empate: <span className="font-semibold">+{XP_TIE} XP cada uno</span></p>
              </div>
              <p className="text-muted-foreground border-t border-border/50 pt-1.5 mt-1">
                ⚠️ El ganador se declara <strong>solo cuando ambos jugadores han terminado</strong>.
              </p>
            </div>

            <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona oponente" /></SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.avatar_emoji} {u.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleChallenge} className="w-full rounded-xl" disabled={!selectedOpponent || sending}>
              {sending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Enviando...</>
                : <><Send className="mr-2 h-4 w-4" /> Enviar Desafío</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
