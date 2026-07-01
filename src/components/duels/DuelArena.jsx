import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

// ─── reward constants ─────────────────────────────────────────────────────────
const XP_WIN  = 25;
const XP_TIE  = 10;
const XP_LOSE = 5;
const SAB_WIN = 1;

// ─── item labels ──────────────────────────────────────────────────────────────
const ACHIEVEMENT_LABELS = {
  first_session:         '🎯 Primera sesión',
  streak_7:              '🔥 Racha 7 días',
  streak_30:             '🏆 Racha 30 días',
  accuracy_90:           '🎯 90% precisión',
  total_100:             '📚 100 preguntas',
  duel_winner:           '⚔️ Primer duelo ganado',
  elaboration_published: '💡 Primera elaboración',
  tournament_winner:     '🏟️ Primer torneo ganado',
};

const EASTER_EGG_LABELS = {
  night_owl:    '🦉 Búho Nocturno',
  speed_demon:  '⚡ Velocidad del Rayo',
  perfect_score:'💯 Puntuación Perfecta',
  comeback_kid: '🦋 Regresa del Olvido',
  curious_mind: '🔬 Mente Curiosa',
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildStealPool(loserProfile) {
  const pool = [];
  const sabers = loserProfile.sabers || 0;
  for (let i = 0; i < Math.min(sabers, 5); i++) {
    pool.push({ type: 'saber', key: 'saber', label: '⚔️ Sable' });
  }
  (loserProfile.achievements || []).forEach(key => {
    pool.push({ type: 'achievement', key, label: ACHIEVEMENT_LABELS[key] || `🏅 ${key}` });
  });
  (loserProfile.easter_eggs || []).forEach(key => {
    pool.push({ type: 'easter_egg', key, label: EASTER_EGG_LABELS[key] || `🥚 ${key}` });
  });
  return pool;
}

function computeSteal(winnerProfile, loserProfile) {
  const pool = buildStealPool(loserProfile);
  if (!pool.length) return null;
  const stolenItem = pool[Math.floor(Math.random() * pool.length)];
  const winnerUpdate = {};
  const loserUpdate  = {};
  if (stolenItem.type === 'saber') {
    winnerUpdate.sabers = (winnerProfile.sabers || 0) + 1;
    loserUpdate.sabers  = Math.max(0, (loserProfile.sabers || 0) - 1);
  } else if (stolenItem.type === 'achievement') {
    loserUpdate.achievements = (loserProfile.achievements || []).filter(a => a !== stolenItem.key);
    if (!(winnerProfile.achievements || []).includes(stolenItem.key)) {
      winnerUpdate.achievements = [...(winnerProfile.achievements || []), stolenItem.key];
    }
  } else if (stolenItem.type === 'easter_egg') {
    loserUpdate.easter_eggs = (loserProfile.easter_eggs || []).filter(e => e !== stolenItem.key);
    if (!(winnerProfile.easter_eggs || []).includes(stolenItem.key)) {
      winnerUpdate.easter_eggs = [...(winnerProfile.easter_eggs || []), stolenItem.key];
    }
  }
  return { stolenItem, winnerUpdate, loserUpdate };
}

/**
 * Winner determination — called only when BOTH players have finished.
 *
 * Criteria (in order):
 *  1. Most correct answers wins.
 *  2. Tie on answers → fastest average response time wins.
 *  3. Exact tie on both (times within 0.1s) → true draw (no steal, shared XP).
 *
 * Returns: { winnerId, loserId, isTie }
 */
function determineWinner(cScore, oScore, cAvg, oAvg, challengerId, opponentId) {
  if (cScore > oScore) return { winnerId: challengerId, loserId: opponentId, isTie: false };
  if (oScore > cScore) return { winnerId: opponentId,   loserId: challengerId, isTie: false };
  // Tied on score — use response time
  const timeDiff = Math.abs(cAvg - oAvg);
  if (timeDiff < 0.1) return { winnerId: null, loserId: null, isTie: true };
  if (cAvg < oAvg) return { winnerId: challengerId, loserId: opponentId, isTie: false };
  return { winnerId: opponentId, loserId: challengerId, isTie: false };
}

// ─── component ────────────────────────────────────────────────────────────────
export default function DuelArena({ duel, profile, onFinish }) {
  const [questions, setQuestions]     = useState([]);
  const [idx, setIdx]                 = useState(0);
  const [timeLeft, setTimeLeft]       = useState(5);
  const [answered, setAnswered]       = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore]             = useState(0);
  const [done, setDone]               = useState(false);
  const [resultDuel, setResultDuel]   = useState(null);

  const timerRef     = useRef(null);
  const scoreRef     = useRef(0);
  const timesRef     = useRef([]);
  const finishingRef = useRef(false);
  const answeredRef  = useRef(false);

  // Load questions
  useEffect(() => {
    if (!duel?.questions?.length) return;
    base44.entities.Question.list('-created_date', 500).then(allQ => {
      const qs = duel.questions.map(id => allQ.find(q => q.id === id)).filter(Boolean);
      setQuestions(qs.map(q => ({ ...q, _opts: q.options?.length ? shuffleArr(q.options) : [] })));
    });
  }, []);

  // Poll while waiting for opponent to finish
  useEffect(() => {
    if (!done || resultDuel) return;
    const iv = setInterval(async () => {
      const fresh = await base44.entities.Duel.get(duel.id);
      // Only show result once the duel is fully finalized
      if (fresh.status === 'completed') {
        clearInterval(iv);
        setResultDuel(fresh);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [done, resultDuel]);

  // Per-question countdown
  useEffect(() => {
    if (questions.length === 0 || done) return;
    answeredRef.current = false;
    setAnswered(false);
    setSelectedOpt(null);
    let secs = 5;
    setTimeLeft(5);
    timerRef.current = setInterval(() => {
      secs -= 0.1;
      setTimeLeft(Math.max(0, secs));
      if (secs <= 0) {
        clearInterval(timerRef.current);
        if (!answeredRef.current) {
          answeredRef.current = true;
          setAnswered(true);
          timesRef.current.push(5);
          setTimeout(() => advance(idx), 400);
        }
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [idx, questions.length, done]);

  const handleAnswer = (opt) => {
    if (answeredRef.current || done) return;
    clearInterval(timerRef.current);
    answeredRef.current = true;
    setAnswered(true);
    setSelectedOpt(opt);
    const q       = questions[idx];
    const correct = q.correct_answer ?? q.options?.[q.correct_index];
    if (opt === correct) { scoreRef.current++; setScore(s => s + 1); }
    timesRef.current.push(5 - timeLeft);
    setTimeout(() => advance(idx), 600);
  };

  const advance = (currentIdx) => {
    const next = currentIdx + 1;
    if (next >= questions.length) doFinish(scoreRef.current);
    else setIdx(next);
  };

  // ── Core finalization ─────────────────────────────────────────────────────
  const doFinish = async (finalScore) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setDone(true);

    const isChallenger = duel.challenger_id === profile.user_id;
    const times   = timesRef.current;
    const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 5;
    const accuracy = questions.length ? Math.round((finalScore / questions.length) * 100) : 0;

    // Save MY score + played flag
    const myData = isChallenger
      ? { challenger_score: finalScore, challenger_accuracy: accuracy,
          challenger_avg_time: +avgTime.toFixed(2), challenger_played: true }
      : { opponent_score:   finalScore, opponent_accuracy:   accuracy,
          opponent_avg_time:  +avgTime.toFixed(2), opponent_played:   true };

    await base44.entities.Duel.update(duel.id, myData);

    // Re-fetch to see current state
    const fresh = await base44.entities.Duel.get(duel.id);

    // ── GUARD: only finalize when BOTH have played ──────────────────────────
    // Use the explicit boolean flags — immune to score = 0 confusion
    const cPlayed = isChallenger ? true : (fresh.challenger_played === true);
    const oPlayed = isChallenger ? (fresh.opponent_played === true) : true;

    if (!cPlayed || !oPlayed) {
      // The other player hasn't finished yet — polling will pick it up
      return;
    }

    // ── Race-condition guard ────────────────────────────────────────────────
    if (fresh.status === 'completed') {
      setResultDuel(fresh);
      return;
    }

    // ── Collect both scores ─────────────────────────────────────────────────
    const cScore = isChallenger ? finalScore             : fresh.challenger_score;
    const oScore = isChallenger ? fresh.opponent_score   : finalScore;
    const cAvg   = isChallenger ? +avgTime.toFixed(2)   : (fresh.challenger_avg_time ?? 99);
    const oAvg   = isChallenger ? (fresh.opponent_avg_time ?? 99) : +avgTime.toFixed(2);

    // ── Determine winner ────────────────────────────────────────────────────
    const { winnerId, loserId, isTie } = determineWinner(
      cScore, oScore, cAvg, oAvg,
      fresh.challenger_id, fresh.opponent_id,
    );

    // ── Load profiles for reward/steal ──────────────────────────────────────
    const profileIds = isTie
      ? [fresh.challenger_id, fresh.opponent_id]
      : [winnerId, loserId];

    const [p1List, p2List] = await Promise.all([
      base44.entities.UserProfile.filter({ user_id: profileIds[0] }),
      base44.entities.UserProfile.filter({ user_id: profileIds[1] }),
    ]);
    const p1 = p1List[0] || {};
    const p2 = p2List[0] || {};
    const winnerProfile = isTie ? p1 : p1; // both cases: p1 = winner (or challenger for tie)
    const loserProfile  = isTie ? p2 : p2;

    // ── Steal (only on decisive win) ────────────────────────────────────────
    const steal = isTie ? null : computeSteal(winnerProfile, loserProfile);

    // ── Build final duel record ─────────────────────────────────────────────
    const finalDuel = {
      status:           'completed',
      winner_id:        winnerId ?? null,   // null for tie
      completed_at:     new Date().toISOString(),
      challenger_score: cScore,
      opponent_score:   oScore,
      stolen_item:      steal?.stolenItem ?? null,
    };
    await base44.entities.Duel.update(duel.id, finalDuel);

    // ── Apply rewards ───────────────────────────────────────────────────────
    const ops = [];

    if (isTie) {
      // Both get tie XP, no steal
      if (p1List.length) ops.push(base44.entities.UserProfile.update(p1.id, { xp: (p1.xp || 0) + XP_TIE }));
      if (p2List.length) ops.push(base44.entities.UserProfile.update(p2.id, { xp: (p2.xp || 0) + XP_TIE }));
      ops.push(
        base44.entities.Notification.create({ user_id: fresh.challenger_id, type: 'duel_result',
          title: '⚔️ ¡Empate!', message: `Duelo vs ${fresh.opponent_name} — Empate. +${XP_TIE} XP`, is_read: false }),
        base44.entities.Notification.create({ user_id: fresh.opponent_id, type: 'duel_result',
          title: '⚔️ ¡Empate!', message: `Duelo vs ${fresh.challenger_name} — Empate. +${XP_TIE} XP`, is_read: false }),
      );
    } else {
      // Winner rewards + steal bonus
      const winnerUpdate = {
        sabers:    (winnerProfile.sabers    || 0) + SAB_WIN,
        duels_won: (winnerProfile.duels_won || 0) + 1,
        xp:        (winnerProfile.xp        || 0) + XP_WIN,
        ...(steal?.winnerUpdate || {}),
      };
      // Loser rewards
      const loserUpdate = {
        xp: (loserProfile.xp || 0) + XP_LOSE,
        ...(steal?.loserUpdate || {}),
      };

      if (p1List.length) {
        // p1 = winner
        ops.push(base44.entities.UserProfile.update(p1.id, winnerUpdate));
      }
      if (p2List.length) {
        // p2 = loser
        ops.push(base44.entities.UserProfile.update(p2.id, loserUpdate));
      }

      const stealWinMsg  = steal ? ` Robaste: ${steal.stolenItem.label} ⚔️` : '';
      const stealLoseMsg = steal ? ` Te robaron: ${steal.stolenItem.label} — ¡recupéralo estudiando!` : '';

      ops.push(
        base44.entities.Notification.create({ user_id: fresh.challenger_id, type: 'duel_result',
          title: '⚔️ Resultado del duelo',
          message: winnerId === fresh.challenger_id
            ? `¡Ganaste vs ${fresh.opponent_name}! +${SAB_WIN} Saber +${XP_WIN} XP${stealWinMsg}`
            : `Perdiste vs ${fresh.opponent_name}. +${XP_LOSE} XP${stealLoseMsg}`,
          is_read: false }),
        base44.entities.Notification.create({ user_id: fresh.opponent_id, type: 'duel_result',
          title: '⚔️ Resultado del duelo',
          message: winnerId === fresh.opponent_id
            ? `¡Ganaste vs ${fresh.challenger_name}! +${SAB_WIN} Saber +${XP_WIN} XP${stealWinMsg}`
            : `Perdiste vs ${fresh.challenger_name}. +${XP_LOSE} XP${stealLoseMsg}`,
          is_read: false }),
      );
    }

    await Promise.all(ops);

    setResultDuel({ ...fresh, ...finalDuel, challenger_avg_time: cAvg, opponent_avg_time: oAvg, _isTie: isTie });
  };

  // ─── RESULT SCREEN ─────────────────────────────────────────────────────────
  if (done && resultDuel) {
    const isTie    = resultDuel._isTie || (resultDuel.winner_id === null && resultDuel.status === 'completed');
    const won      = !isTie && resultDuel.winner_id === profile.user_id;
    const myScore  = duel.challenger_id === profile.user_id ? resultDuel.challenger_score : resultDuel.opponent_score;
    const theirScr = duel.challenger_id === profile.user_id ? resultDuel.opponent_score   : resultDuel.challenger_score;
    const theirNm  = duel.challenger_id === profile.user_id ? duel.opponent_name          : duel.challenger_name;
    const stolen   = resultDuel.stolen_item;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-10 space-y-5"
      >
        <div className="text-7xl animate-float">{isTie ? '🤝' : won ? '🏆' : '💔'}</div>
        <h1 className="text-3xl font-bold">{isTie ? '¡Empate perfecto!' : won ? '¡Victoria!' : 'Derrota'}</h1>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 ${won ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground mb-1">Tú</p>
              <p className="text-3xl font-bold">{myScore}</p>
              <p className="text-xs text-muted-foreground">/ {questions.length} correctas</p>
            </div>
            <div className={`rounded-xl p-4 ${!won && !isTie ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground mb-1">{theirNm}</p>
              <p className="text-3xl font-bold">{theirScr ?? '?'}</p>
              <p className="text-xs text-muted-foreground">/ {questions.length} correctas</p>
            </div>
          </div>

          {/* Winner criteria explanation */}
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground text-left space-y-1">
            {isTie
              ? <p>🤝 Mismo puntaje <strong>y</strong> tiempo de respuesta casi idéntico — ¡empate puro!</p>
              : won
                ? myScore > (theirScr ?? 0)
                  ? <p>🏆 Ganaste por <strong>más respuestas correctas</strong> ({myScore} vs {theirScr})</p>
                  : <p>⏱️ Mismo puntaje — ganaste por <strong>tiempo de respuesta más rápido</strong></p>
                : (theirScr ?? 0) > myScore
                  ? <p>Perdiste por <strong>menos respuestas correctas</strong> ({myScore} vs {theirScr})</p>
                  : <p>Mismo puntaje — perdiste por <strong>tiempo de respuesta más lento</strong></p>
            }
          </div>

          {/* Reward */}
          <div className={`rounded-xl p-3 text-sm font-medium ${
            isTie ? 'bg-muted text-muted-foreground'
            : won  ? 'bg-primary/10 text-primary'
            :        'bg-muted text-muted-foreground'
          }`}>
            {isTie ? <>🤝 +{XP_TIE} XP (empate)</>
             : won  ? <>+{SAB_WIN} Saber ⚔️ &nbsp;·&nbsp; +{XP_WIN} XP</>
             :        <>+{XP_LOSE} XP por participar</>
            }
          </div>

          {/* Steal banner */}
          {stolen && !isTie && (
            <div className={`rounded-xl p-4 border text-sm space-y-1 text-left ${won
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
            >
              {won ? (
                <><p className="font-bold">⚔️ ¡Robaste un trofeo!</p>
                  <p>{stolen.label}</p>
                  <p className="text-xs opacity-70">Ahora forma parte de tu repertorio</p></>
              ) : (
                <><p className="font-bold">💀 Te robaron un trofeo</p>
                  <p>{stolen.label}</p>
                  <p className="text-xs opacity-70">¡Estudia duro y recupéralo ganando un duelo!</p></>
              )}
            </div>
          )}
        </div>

        <Button onClick={onFinish} className="w-full rounded-xl">Volver a Duelos</Button>
      </motion.div>
    );
  }

  // ─── WAITING FOR OPPONENT ──────────────────────────────────────────────────
  if (done) {
    const accuracy     = questions.length ? Math.round((scoreRef.current / questions.length) * 100) : 0;
    const opponentName = duel.challenger_id === profile.user_id ? duel.opponent_name : duel.challenger_name;
    return (
      <div className="max-w-md mx-auto text-center py-10 space-y-5">
        <div className="text-6xl">⚔️</div>
        <h2 className="text-xl font-bold">¡Tu parte está lista!</h2>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-4xl font-bold text-primary">
              {scoreRef.current}
              <span className="text-xl text-muted-foreground font-normal"> / {questions.length}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">Precisión: {accuracy}%</p>
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              Esperando que <span className="font-semibold text-foreground">{opponentName}</span> termine...
            </p>
            <p className="text-xs text-muted-foreground">El resultado aparecerá automáticamente</p>
          </div>
        </div>
        <Button onClick={onFinish} variant="outline" className="w-full rounded-xl">
          Volver (el resultado quedará guardado)
        </Button>
      </div>
    );
  }

  // ─── LOADING ───────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── QUIZ ─────────────────────────────────────────────────────────────────
  const q             = questions[idx];
  const opts          = q._opts?.length ? q._opts : (q.options || []);
  const timerPct      = Math.max(0, (timeLeft / 5) * 100);
  const correctAnswer = q.correct_answer ?? q.options?.[q.correct_index];

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{idx + 1} / {questions.length}</span>
        <span className="text-sm font-bold text-primary">{score} pts</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${timerPct}%`,
            background: timerPct > 60 ? 'hsl(var(--success))' : timerPct > 30 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
          }}
        />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground mb-2">{q.subject}</p>
        <h2 className="text-lg font-semibold leading-snug">{q.statement}</h2>
        {q.image_url && <img src={q.image_url} alt="" className="mt-3 rounded-lg max-h-40 object-contain" />}
      </div>
      <div className="space-y-2">
        {opts.map((opt, i) => {
          let cls = 'bg-card border-border hover:border-primary/50';
          if (answered) {
            if (opt === correctAnswer)    cls = 'bg-green-500/10 border-green-500';
            else if (opt === selectedOpt) cls = 'bg-red-500/10 border-red-500';
            else                         cls = 'bg-card border-border opacity-50';
          }
          return (
            <button key={i} onClick={() => handleAnswer(opt)} disabled={answered}
              className={`w-full text-left p-4 border-2 rounded-xl transition-all ${cls} disabled:cursor-default`}>
              <span className="font-medium text-sm">{String.fromCharCode(65 + i)}. {opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
