import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

const XP_WIN   = 25;
const XP_LOSE  = 5;
const SAB_WIN  = 1;

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DuelArena({ duel, profile, onFinish }) {
  const [questions, setQuestions]   = useState([]);
  const [idx, setIdx]               = useState(0);
  const [timeLeft, setTimeLeft]     = useState(5);
  const [answered, setAnswered]     = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore]           = useState(0);
  const [done, setDone]             = useState(false);
  const [resultDuel, setResultDuel] = useState(null);

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

  // Poll for opponent result when I've finished but they haven't
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

  // Per-question countdown timer
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
    const q = questions[idx];
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
      : { opponent_score: finalScore,   opponent_accuracy: accuracy,   opponent_avg_time:  +avgTime.toFixed(2) };

    // Save my score
    await base44.entities.Duel.update(duel.id, myData);

    // Re-fetch to see if opponent already finished
    const fresh = await base44.entities.Duel.get(duel.id);
    const cScore = isChallenger ? finalScore                 : fresh.challenger_score;
    const oScore = isChallenger ? fresh.opponent_score       : finalScore;
    const bothDone = cScore !== null && cScore !== undefined && oScore !== null && oScore !== undefined;

    if (!bothDone) return; // Opponent hasn't played yet — polling will detect when they do

    // Both done: protect against race condition — if winner_id already set, just display
    if (fresh.winner_id) {
      setResultDuel(fresh);
      return;
    }

    // Determine winner (score first, then avg response time as tiebreaker)
    const cAvg = isChallenger ? +avgTime.toFixed(2) : (fresh.challenger_avg_time ?? 99);
    const oAvg = isChallenger ? (fresh.opponent_avg_time ?? 99) : +avgTime.toFixed(2);
    const winnerId = cScore > oScore   ? fresh.challenger_id
      : oScore > cScore                ? fresh.opponent_id
      : cAvg <= oAvg                   ? fresh.challenger_id
      :                                  fresh.opponent_id;
    const loserId = winnerId === fresh.challenger_id ? fresh.opponent_id : fresh.challenger_id;

    // Write final result
    const finalDuel = {
      status: 'completed',
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
      challenger_score: cScore,
      opponent_score: oScore,
    };
    await base44.entities.Duel.update(duel.id, finalDuel);

    // Apply rewards to winner and loser in parallel
    const [winnerList, loserList] = await Promise.all([
      base44.entities.UserProfile.filter({ user_id: winnerId }),
      base44.entities.UserProfile.filter({ user_id: loserId }),
    ]);

    const rewardOps = [];
    if (winnerList.length) {
      const wp = winnerList[0];
      rewardOps.push(base44.entities.UserProfile.update(wp.id, {
        sabers:    (wp.sabers    || 0) + SAB_WIN,
        duels_won: (wp.duels_won || 0) + 1,
        xp:        (wp.xp       || 0) + XP_WIN,
      }));
    }
    if (loserList.length) {
      const lp = loserList[0];
      rewardOps.push(base44.entities.UserProfile.update(lp.id, {
        xp: (lp.xp || 0) + XP_LOSE,
      }));
    }
    rewardOps.push(
      base44.entities.Notification.create({
        user_id: fresh.challenger_id, type: 'duel_result', title: '⚔️ Resultado del duelo',
        message: winnerId === fresh.challenger_id
          ? `¡Ganaste! +${SAB_WIN} Saber ⚔️  +${XP_WIN} XP` : `Perdiste. +${XP_LOSE} XP por participar`,
        is_read: false,
      }),
      base44.entities.Notification.create({
        user_id: fresh.opponent_id, type: 'duel_result', title: '⚔️ Resultado del duelo',
        message: winnerId === fresh.opponent_id
          ? `¡Ganaste! +${SAB_WIN} Saber ⚔️  +${XP_WIN} XP` : `Perdiste. +${XP_LOSE} XP por participar`,
        is_read: false,
      }),
    );
    await Promise.all(rewardOps);

    setResultDuel({ ...fresh, ...finalDuel, challenger_avg_time: cAvg, opponent_avg_time: oAvg });
  };

  // ─── RESULT SCREEN ────────────────────────────────────────────────────────

  if (done && resultDuel) {
    const won      = resultDuel.winner_id === profile.user_id;
    const isTie    = resultDuel.challenger_score === resultDuel.opponent_score;
    const myScore  = duel.challenger_id === profile.user_id ? resultDuel.challenger_score : resultDuel.opponent_score;
    const theirScr = duel.challenger_id === profile.user_id ? resultDuel.opponent_score   : resultDuel.challenger_score;
    const theirNm  = duel.challenger_id === profile.user_id ? duel.opponent_name          : duel.challenger_name;
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

          {/* Rewards */}
          <div className={`rounded-xl p-3 text-sm font-medium ${won ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {won
              ? <>+{SAB_WIN} Saber ⚔️ &nbsp;·&nbsp; +{XP_WIN} XP</>
              : <>+{XP_LOSE} XP por participar</>
            }
          </div>

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

  // ─── WAITING FOR OPPONENT SCREEN ──────────────────────────────────────────

  if (done) {
    const accuracy  = questions.length ? Math.round((scoreRef.current / questions.length) * 100) : 0;
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
            <p className="text-xs text-muted-foreground">El resultado aparecerá automáticamente al terminar</p>
          </div>
        </div>
        <Button onClick={onFinish} variant="outline" className="w-full rounded-xl">
          Volver (el resultado quedará guardado)
        </Button>
      </div>
    );
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (questions.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── QUIZ SCREEN ──────────────────────────────────────────────────────────

  const q             = questions[idx];
  const opts          = q._opts?.length ? q._opts : (q.options || []);
  const timerPct      = Math.max(0, (timeLeft / 5) * 100);
  const correctAnswer = q.correct_answer ?? q.options?.[q.correct_index];

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress & score */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{idx + 1} / {questions.length}</span>
        <span className="text-sm font-bold text-primary">{score} pts</span>
      </div>

      {/* Timer bar */}
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${timerPct}%`,
            background: timerPct > 60 ? 'hsl(var(--success))' : timerPct > 30 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
          }}
        />
      </div>

      {/* Question */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground mb-2">{q.subject}</p>
        <h2 className="text-lg font-semibold leading-snug">{q.statement}</h2>
        {q.image_url && <img src={q.image_url} alt="" className="mt-3 rounded-lg max-h-40 object-contain" />}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {opts.map((opt, i) => {
          let cls = 'bg-card border-border hover:border-primary/50';
          if (answered) {
            if (opt === correctAnswer)  cls = 'bg-green-500/10 border-green-500';
            else if (opt === selectedOpt) cls = 'bg-red-500/10 border-red-500';
            else                        cls = 'bg-card border-border opacity-50';
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={answered}
              className={`w-full text-left p-4 border-2 rounded-xl transition-all ${cls} disabled:cursor-default`}
            >
              <span className="font-medium text-sm">{String.fromCharCode(65 + i)}. {opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
