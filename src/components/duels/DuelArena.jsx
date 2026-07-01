import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

// ─── constants ───────────────────────────────────────────────────────────────

const XP_WIN  = 25;
const XP_LOSE = 5;
const SAB_WIN = 1;

const ACHIEVEMENT_LABELS = {
  first_session:          '🎯 Primera sesión',
  streak_7:               '🔥 Racha 7 días',
  streak_30:              '🏆 Racha 30 días',
  accuracy_90:            '🎯 90% precisión',
  total_100:              '📚 100 preguntas',
  duel_winner:            '⚔️ Primer duelo ganado',
  elaboration_published:  '💡 Primera elaboración',
  tournament_winner:      '🏟️ Primer torneo ganado',
};

const EASTER_EGG_LABELS = {
  night_owl:    '🦉 Búho Nocturno',
  speed_demon:  '⚡ Velocidad del Rayo',
  perfect_score:'💯 Puntuación Perfecta',
  comeback_kid: '🦋 Regresa del Olvido',
  curious_mind: '🔬 Mente Curiosa',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build the pool of items that can be stolen from the loser. */
function buildStealPool(loserProfile) {
  const pool = [];

  // Sabers: each saber is one entry (capped at 5 so they don't dominate)
  const sabers = loserProfile.sabers || 0;
  for (let i = 0; i < Math.min(sabers, 5); i++) {
    pool.push({ type: 'saber', key: 'saber', label: '⚔️ Sable' });
  }

  // Achievements
  (loserProfile.achievements || []).forEach(key => {
    pool.push({ type: 'achievement', key, label: ACHIEVEMENT_LABELS[key] || `🏅 ${key}` });
  });

  // Easter eggs
  (loserProfile.easter_eggs || []).forEach(key => {
    pool.push({ type: 'easter_egg', key, label: EASTER_EGG_LABELS[key] || `🥚 ${key}` });
  });

  return pool;
}

/**
 * Pick one random item and return the update objects for both profiles.
 * Returns { stolenItem, winnerUpdate, loserUpdate } or null if nothing to steal.
 */
function computeSteal(winnerProfile, loserProfile) {
  const pool = buildStealPool(loserProfile);
  if (pool.length === 0) return null;

  const stolenItem = pool[Math.floor(Math.random() * pool.length)];
  const winnerUpdate = {};
  const loserUpdate  = {};

  if (stolenItem.type === 'saber') {
    winnerUpdate.sabers = (winnerProfile.sabers || 0) + 1;
    loserUpdate.sabers  = Math.max(0, (loserProfile.sabers  || 0) - 1);
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

// ─── component ───────────────────────────────────────────────────────────────

export default function DuelArena({ duel, profile, onFinish }) {
  const [questions, setQuestions]     = useState([]);
  const [idx, setIdx]                 = useState(0);
  const [timeLeft, setTimeLeft]       = useState(5);
  const [answered, setAnswered]       = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore]             = useState(0);
  const [done, setDone]               = useState(false);
  const [resultDuel, setResultDuel]   = useState(null);   // full duel object once both have played

  const timerRef      = useRef(null);
  const scoreRef      = useRef(0);
  const timesRef      = useRef([]);
  const finishingRef  = useRef(false);
  const answeredRef   = useRef(false);

  // ── load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!duel?.questions?.length) return;
    base44.entities.Question.list('-created_date', 500).then(allQ => {
      const qs = duel.questions.map(id => allQ.find(q => q.id === id)).filter(Boolean);
      setQuestions(qs.map(q => ({ ...q, _opts: q.options?.length ? shuffleArr(q.options) : [] })));
    });
  }, []);

  // ── poll while waiting for opponent ────────────────────────────────────────
  useEffect(() => {
    if (!done || resultDuel) return;
    const iv = setInterval(async () => {
      const fresh = await base44.entities.Duel.get(duel.id);
      if (fresh.winner_id) {
        clearInterval(iv);
        setResultDuel(fresh);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [done, resultDuel]);

  // ── per-question countdown ─────────────────────────────────────────────────
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

  // ── finalization ───────────────────────────────────────────────────────────
  const doFinish = async (finalScore) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setDone(true);

    const isChallenger = duel.challenger_id === profile.user_id;
    const times   = timesRef.current;
    const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 5;
    const accuracy = questions.length ? Math.round((finalScore / questions.length) * 100) : 0;

    const myData = isChallenger
      ? { challenger_score: finalScore, challenger_accuracy: accuracy, challenger_avg_time: +avgTime.toFixed(2) }
      : { opponent_score:   finalScore, opponent_accuracy:   accuracy, opponent_avg_time:  +avgTime.toFixed(2) };

    await base44.entities.Duel.update(duel.id, myData);
    const fresh = await base44.entities.Duel.get(duel.id);

    const cScore   = isChallenger ? finalScore             : fresh.challenger_score;
    const oScore   = isChallenger ? fresh.opponent_score   : finalScore;
    const bothDone = cScore !== null && cScore !== undefined && oScore !== null && oScore !== undefined;

    if (!bothDone) return; // waiting for opponent — polling will pick it up

    // Race-condition guard: if winner already set, just display result
    if (fresh.winner_id) {
      setResultDuel(fresh);
      return;
    }

    // ── Determine winner ────────────────────────────────────────────────────
    const cAvg = isChallenger ? +avgTime.toFixed(2) : (fresh.challenger_avg_time ?? 99);
    const oAvg = isChallenger ? (fresh.opponent_avg_time ?? 99) : +avgTime.toFixed(2);
    const winnerId = cScore > oScore  ? fresh.challenger_id
      : oScore > cScore               ? fresh.opponent_id
      : cAvg <= oAvg                  ? fresh.challenger_id
      :                                 fresh.opponent_id;
    const loserId = winnerId === fresh.challenger_id ? fresh.opponent_id : fresh.challenger_id;

    // ── Load both profiles for reward/steal computation ─────────────────────
    const [winnerList, loserList] = await Promise.all([
      base44.entities.UserProfile.filter({ user_id: winnerId }),
      base44.entities.UserProfile.filter({ user_id: loserId }),
    ]);
    const winnerProfile = winnerList[0] || {};
    const loserProfile  = loserList[0]  || {};

    // ── Steal one item from loser ────────────────────────────────────────────
    const steal = computeSteal(winnerProfile, loserProfile);

    // ── Build profile updates ────────────────────────────────────────────────
    const winnerUpdate = {
      sabers:    (winnerProfile.sabers    || 0) + SAB_WIN,   // win bonus
      duels_won: (winnerProfile.duels_won || 0) + 1,
      xp:        (winnerProfile.xp        || 0) + XP_WIN,
      ...(steal?.winnerUpdate || {}),                         // steal bonus
    };
    const loserUpdate = {
      xp: (loserProfile.xp || 0) + XP_LOSE,
      ...(steal?.loserUpdate || {}),
    };

    // ── Write final duel record ──────────────────────────────────────────────
    const finalDuel = {
      status:           'completed',
      winner_id:        winnerId,
      completed_at:     new Date().toISOString(),
      challenger_score: cScore,
      opponent_score:   oScore,
      stolen_item:      steal?.stolenItem ?? null,
    };
    await base44.entities.Duel.update(duel.id, finalDuel);

    // ── Apply profile updates ────────────────────────────────────────────────
    const ops = [];
    if (winnerList.length) ops.push(base44.entities.UserProfile.update(winnerProfile.id, winnerUpdate));
    if (loserList.length)  ops.push(base44.entities.UserProfile.update(loserProfile.id,  loserUpdate));

    const stealMsg = steal
      ? ` Te robaron: ${steal.stolenItem.label} — ¡Estúdialo de vuelta para recuperarlo!`
      : '';
    const stealMsgWin = steal
      ? ` Robaste: ${steal.stolenItem.label} ⚔️`
      : '';

    ops.push(
      base44.entities.Notification.create({
        user_id: fresh.challenger_id, type: 'duel_result', title: '⚔️ Resultado del duelo',
        message: winnerId === fresh.challenger_id
          ? `¡Ganaste! +${SAB_WIN} Saber +${XP_WIN} XP${stealMsgWin}`
          : `Perdiste. +${XP_LOSE} XP.${stealMsg}`,
        is_read: false,
      }),
      base44.entities.Notification.create({
        user_id: fresh.opponent_id, type: 'duel_result', title: '⚔️ Resultado del duelo',
        message: winnerId === fresh.opponent_id
          ? `¡Ganaste! +${SAB_WIN} Saber +${XP_WIN} XP${stealMsgWin}`
          : `Perdiste. +${XP_LOSE} XP.${stealMsg}`,
        is_read: false,
      }),
    );

    await Promise.all(ops);

    setResultDuel({
      ...fresh, ...finalDuel,
      challenger_avg_time: cAvg,
      opponent_avg_time:   oAvg,
    });
  };

  // ─── RESULT SCREEN ─────────────────────────────────────────────────────────
  if (done && resultDuel) {
    const won      = resultDuel.winner_id === profile.user_id;
    const isTie    = resultDuel.challenger_score === resultDuel.opponent_score;
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
        <h1 className="text-3xl font-bold">{isTie ? '¡Empate!' : won ? '¡Victoria!' : 'Derrota'}</h1>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 ${won && !isTie ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground mb-1">Tú</p>
              <p className="text-3xl font-bold">{myScore}</p>
              <p className="text-xs text-muted-foreground">/ {questions.length} pts</p>
            </div>
            <div className={`rounded-xl p-4 ${!won && !isTie ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground mb-1">{theirNm}</p>
              <p className="text-3xl font-bold">{theirScr ?? '?'}</p>
              <p className="text-xs text-muted-foreground">/ {questions.length} pts</p>
            </div>
          </div>

          {/* XP / saber reward row */}
          <div className={`rounded-xl p-3 text-sm font-medium ${won && !isTie ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {won && !isTie
              ? <>+{SAB_WIN} Saber ⚔️ &nbsp;·&nbsp; +{XP_WIN} XP</>
              : <> +{XP_LOSE} XP por participar</>
            }
          </div>

          {/* Steal banner */}
          {stolen && (
            <div className={`rounded-xl p-4 border text-sm space-y-1 ${won && !isTie
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
            >
              {won && !isTie ? (
                <>
                  <p className="font-bold">⚔️ ¡Robaste un trofeo!</p>
                  <p>{stolen.label}</p>
                  <p className="text-xs opacity-70">Ahora forma parte de tu repertorio</p>
                </>
              ) : (
                <>
                  <p className="font-bold">💀 Te robaron un trofeo</p>
                  <p>{stolen.label}</p>
                  <p className="text-xs opacity-70">¡Estudia duro y recupéralo ganando un duelo!</p>
                </>
              )}
            </div>
          )}

          {!stolen && !isTie && !won && (
            <p className="text-xs text-muted-foreground">
              No tenías ítems que robar esta vez — ¡pero puedes perderlos en el futuro!
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {isTie  ? 'Empate en puntos — el tiempo de respuesta fue el desempate.'
             : won  ? 'Tu velocidad de respuesta hizo la diferencia.'
             :        'Practica más y vuelve a retar.'}
          </p>
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
              Esperando que <span className="font-semibold text-foreground">{opponentName}</span> juegue...
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
