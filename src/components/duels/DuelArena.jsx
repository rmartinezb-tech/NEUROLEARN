import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DuelArena({ duel, profile, onFinish }) {
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [answered, setAnswered] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [resultDuel, setResultDuel] = useState(null);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);
  const timesRef = useRef([]);
  const finishingRef = useRef(false);
  const answeredRef = useRef(false);

  useEffect(() => {
    if (!duel?.questions?.length) return;
    base44.entities.Question.list('-created_date', 500).then(allQ => {
      const qs = duel.questions.map(id => allQ.find(q => q.id === id)).filter(Boolean);
      const prepared = qs.map(q => ({
        ...q,
        _opts: q.options?.length ? shuffleArr(q.options) : [],
      }));
      setQuestions(prepared);
    });
  }, []);

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
    const correctAnswer = q.correct_answer ?? q.options?.[q.correct_index];
    const correct = opt === correctAnswer;
    if (correct) {
      scoreRef.current++;
      setScore(s => s + 1);
    }
    timesRef.current.push(5 - timeLeft);
    setTimeout(() => advance(idx), 600);
  };

  const advance = (currentIdx) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      doFinish(scoreRef.current);
    } else {
      setIdx(nextIdx);
    }
  };

  const doFinish = async (finalScore) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setDone(true);
    const times = timesRef.current;
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 5;
    const accuracy = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
    const isChallenger = duel.challenger_id === profile.user_id;

    const myData = isChallenger
      ? { challenger_score: finalScore, challenger_accuracy: accuracy, challenger_avg_time: +avgTime.toFixed(2) }
      : { opponent_score: finalScore, opponent_accuracy: accuracy, opponent_avg_time: +avgTime.toFixed(2) };

    await base44.entities.Duel.update(duel.id, myData);
    const updated = await base44.entities.Duel.get(duel.id);

    const cScore = isChallenger ? finalScore : updated.challenger_score;
    const oScore = isChallenger ? updated.opponent_score : finalScore;

    if (cScore !== null && cScore !== undefined && oScore !== null && oScore !== undefined) {
      const cAvg = isChallenger ? +avgTime.toFixed(2) : (updated.challenger_avg_time || 99);
      const oAvg = isChallenger ? (updated.opponent_avg_time || 99) : +avgTime.toFixed(2);
      const winnerId = cScore > oScore ? updated.challenger_id
        : oScore > cScore ? updated.opponent_id
        : cAvg <= oAvg ? updated.challenger_id : updated.opponent_id;

      await base44.entities.Duel.update(duel.id, {
        status: 'completed', winner_id: winnerId,
        completed_at: new Date().toISOString(),
        challenger_score: cScore, opponent_score: oScore,
      });

      const winnerProfiles = await base44.entities.UserProfile.filter({ user_id: winnerId });
      if (winnerProfiles.length > 0) {
        await base44.entities.UserProfile.update(winnerProfiles[0].id, {
          sabers: (winnerProfiles[0].sabers || 0) + 1,
          duels_won: (winnerProfiles[0].duels_won || 0) + 1,
        });
      }

      await Promise.all([
        base44.entities.Notification.create({ user_id: updated.challenger_id, type: 'duel_result', title: '⚔️ Resultado del duelo', message: winnerId === updated.challenger_id ? '¡Ganaste el duelo!' : 'Perdiste el duelo. ¡Revancha!', is_read: false }),
        base44.entities.Notification.create({ user_id: updated.opponent_id, type: 'duel_result', title: '⚔️ Resultado del duelo', message: winnerId === updated.opponent_id ? '¡Ganaste el duelo!' : 'Perdiste el duelo. ¡Revancha!', is_read: false }),
      ]);

      setResultDuel({ ...updated, winner_id: winnerId, challenger_score: cScore, opponent_score: oScore, challenger_avg_time: cAvg, opponent_avg_time: oAvg });
    }
  };

  // --- SCREENS ---
  if (done && resultDuel) {
    const won = resultDuel.winner_id === profile.user_id;
    const myScore = duel.challenger_id === profile.user_id ? resultDuel.challenger_score : resultDuel.opponent_score;
    const theirScore = duel.challenger_id === profile.user_id ? resultDuel.opponent_score : resultDuel.challenger_score;
    const theirName = duel.challenger_id === profile.user_id ? duel.opponent_name : duel.challenger_name;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center py-10 space-y-4">
        <div className="text-7xl animate-float">{won ? '🏆' : '💔'}</div>
        <h1 className="text-3xl font-bold">{won ? '¡Victoria!' : 'Derrota'}</h1>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 ${won ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground mb-1">Tú</p>
              <p className="text-3xl font-bold">{myScore}</p>
              <p className="text-xs text-muted-foreground">/ {questions.length} pts</p>
            </div>
            <div className={`rounded-xl p-4 ${!won ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground mb-1">{theirName}</p>
              <p className="text-3xl font-bold">{theirScore}</p>
              <p className="text-xs text-muted-foreground">/ {questions.length} pts</p>
            </div>
          </div>
          {won && <p className="text-green-400 text-sm font-semibold">+1 Saber ganado ⚔️</p>}
          <p className="text-xs text-muted-foreground">{won ? 'Tu velocidad de respuesta hizo la diferencia.' : 'Practica más y vuelve a retar.'}</p>
        </div>
        <Button onClick={onFinish} className="w-full rounded-xl mt-2">Volver a Duelos</Button>
      </motion.div>
    );
  }

  if (done) {
    const accuracy = questions.length > 0 ? Math.round((scoreRef.current / questions.length) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center py-10 space-y-4">
        <div className="text-6xl">⚔️</div>
        <h2 className="text-xl font-bold">¡Tu parte está lista!</h2>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-3xl font-bold text-primary">{scoreRef.current}/{questions.length}</p>
          <p className="text-muted-foreground text-sm">Precisión: {accuracy}%</p>
          <p className="text-xs text-muted-foreground">El resultado aparecerá cuando el oponente termine.</p>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
        <Button onClick={onFinish} variant="outline" className="w-full rounded-xl">Volver (el resultado quedará guardado)</Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const q = questions[idx];
  const opts = q._opts?.length ? q._opts : (q.options || []);
  const timerPct = Math.max(0, (timeLeft / 5) * 100);
  const correctAnswer = q.correct_answer ?? q.options?.[q.correct_index];

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{idx + 1}/{questions.length}</span>
        <span className="text-sm font-bold text-primary">{score} pts</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-none"
          style={{ width: `${timerPct}%`, background: timerPct > 60 ? 'hsl(var(--success))' : timerPct > 30 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' }} />
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
            if (opt === correctAnswer) cls = 'bg-green-500/10 border-green-500';
            else if (opt === selectedOpt) cls = 'bg-red-500/10 border-red-500';
            else cls = 'bg-card border-border opacity-50';
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
