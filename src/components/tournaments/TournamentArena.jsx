import { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const TOTAL_Q  = 20;
const Q_TIME   = 60; // seconds per question
const XP_RANKS = [50, 30, 20, 10, 10];

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── inline question renderers ─────────────────────────────────────────────────

function MCRenderer({ question, answered, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const opts = question._opts || [];
  const correct = question.correct_answer ?? question.options?.[question.correct_index];
  return (
    <div className="space-y-2">
      {opts.map((opt, i) => {
        let cls = 'bg-card border-border hover:border-primary/50 hover:bg-muted/40';
        if (answered) {
          if (opt === correct)        cls = 'bg-green-500/10 border-green-500';
          else if (opt === selected)  cls = 'bg-red-500/10 border-red-500';
          else                        cls = 'bg-card border-border opacity-40';
        }
        return (
          <button key={i} disabled={answered}
            onClick={() => { if (!answered) { setSelected(opt); onAnswer(opt === correct); } }}
            className={`w-full text-left p-3.5 border-2 rounded-xl transition-all ${cls} disabled:cursor-default`}>
            <span className="font-medium text-sm">{String.fromCharCode(65 + i)}. {opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function VFRenderer({ question, answered, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const correct = question.correct_answer;
  return (
    <div className="grid grid-cols-2 gap-3">
      {['Verdadero', 'Falso'].map(val => {
        const isAnswer = correct?.toLowerCase() === val.toLowerCase();
        let cls = 'border-border bg-card hover:border-primary/50 hover:bg-muted/40';
        if (answered) {
          if (isAnswer)                      cls = 'border-green-500 bg-green-500/10';
          else if (selected === val)         cls = 'border-red-500 bg-red-500/10';
          else                               cls = 'border-border bg-card opacity-40';
        }
        return (
          <button key={val} disabled={answered}
            onClick={() => { if (!answered) { setSelected(val); onAnswer(isAnswer); } }}
            className={`p-6 rounded-xl text-center font-semibold text-sm border-2 transition-all ${cls}`}>
            {val === 'Verdadero' ? '✅' : '❌'} {val}
          </button>
        );
      })}
    </div>
  );
}

function MatchingRenderer({ question, answered, onForceAnswer, onAnswer, forceRef }) {
  const pairs = question.matching_pairs || [];
  const rightShuffled = question._rightShuffled || [];
  const [selections, setSelections] = useState({});

  // expose the current selections so the timer can force-submit
  useEffect(() => {
    if (forceRef) forceRef.current = () => {
      const correct = pairs.every((p, i) => selections[i] === p.right);
      onForceAnswer(correct);
    };
  });

  const handleSelect = (idx, val) => {
    if (answered) return;
    setSelections(prev => ({ ...prev, [idx]: val }));
  };

  const allFilled = pairs.every((_, i) => selections[i]);

  const handleSubmit = () => {
    const correct = pairs.every((p, i) => selections[i] === p.right);
    onAnswer(correct);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Relaciona cada elemento A con su par B:</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <div key={i} className="p-2.5 rounded-xl border-2 border-border bg-card text-xs font-medium">{pair.left}</div>
          ))}
        </div>
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <select key={i} disabled={answered}
              value={selections[i] || ''}
              onChange={e => handleSelect(i, e.target.value)}
              className={`w-full p-2.5 rounded-xl border-2 text-xs bg-muted focus:outline-none transition-colors ${
                answered ? (selections[i] === pair.right ? 'border-green-500' : 'border-red-500') : 'border-border'
              }`}>
              <option value="">— seleccionar —</option>
              {rightShuffled.map((r, j) => <option key={j} value={r}>{r}</option>)}
            </select>
          ))}
        </div>
      </div>
      {!answered && (
        <Button onClick={handleSubmit} className="w-full rounded-xl" size="sm" disabled={!allFilled}>
          Verificar matching
        </Button>
      )}
      {answered && (
        <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1">
          <p className="font-medium">Pares correctos:</p>
          {pairs.map((p, i) => <p key={i}>{p.left} ↔ {p.right}</p>)}
        </div>
      )}
    </div>
  );
}

function SequenceRenderer({ question, answered, onAnswer, forceRef }) {
  const [order, setOrder] = useState(() => question._seqShuffled || []);

  useEffect(() => {
    if (forceRef) forceRef.current = () => {
      const correct = order.join('|||') === (question.sequence_order || []).join('|||');
      onAnswer(correct);
    };
  });

  const move = (idx, dir) => {
    if (answered) return;
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };

  const isCorrect = order.join('|||') === (question.sequence_order || []).join('|||');

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Ordena los elementos correctamente:</p>
      {order.map((item, i) => (
        <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 ${
          answered ? (isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500/40 bg-red-500/5') : 'border-border bg-card'
        }`}>
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
          <span className="flex-1 text-xs">{item}</span>
          {!answered && (
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs px-1 py-0.5 bg-muted rounded disabled:opacity-30">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="text-xs px-1 py-0.5 bg-muted rounded disabled:opacity-30">▼</button>
            </div>
          )}
        </div>
      ))}
      {!answered && (
        <Button onClick={() => onAnswer(isCorrect)} className="w-full rounded-xl" size="sm">Verificar orden</Button>
      )}
      {answered && (
        <div className="bg-muted/50 rounded-xl p-2 text-xs">
          <p className="font-medium mb-1">Orden correcto:</p>
          <p>{(question.sequence_order || []).join(' → ')}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Arena ────────────────────────────────────────────────────────────────

export default function TournamentArena({ tournament, profile, onFinish }) {
  const [questions, setQuestions]   = useState([]);
  const [idx, setIdx]               = useState(0);
  const [timeLeft, setTimeLeft]     = useState(Q_TIME);
  const [answered, setAnswered]     = useState(false);
  const [score, setScore]           = useState(0);
  const [done, setDone]             = useState(false);
  const [resultData, setResultData] = useState(null);
  const [waitingFor, setWaitingFor] = useState([]);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState(null);

  const timerRef      = useRef(null);
  const scoreRef      = useRef(0);
  const timesRef      = useRef([]);
  const finishingRef  = useRef(false);
  const answeredRef   = useRef(false);
  const forceSubmitRef = useRef(null); // for matching/sequence timeout

  // Load questions from IDs stored in tournament
  useEffect(() => {
    if (!tournament?.questions?.length) return;
    base44.entities.Question.list('-created_date', 500).then(allQ => {
      const qs = tournament.questions
        .map(id => allQ.find(q => q.id === id))
        .filter(Boolean)
        .slice(0, TOTAL_Q)
        .map(q => ({
          ...q,
          _opts: q.options?.length ? shuffleArr(q.options) : [],
          _seqShuffled: q.sequence_order?.length ? shuffleArr(q.sequence_order) : [],
          _rightShuffled: q.matching_pairs?.length ? shuffleArr(q.matching_pairs.map(p => p.right)) : [],
        }));
      setQuestions(qs);
    });
  }, []);

  // Real-time subscription: detect when others finish
  useEffect(() => {
    if (!done) return;
    const unsub = base44.entities.Tournament.subscribe(() => checkAllDone());
    const fallback = setInterval(() => checkAllDone(), 5000);
    return () => { unsub(); clearInterval(fallback); };
  }, [done]); // eslint-disable-line

  // Per-question timer
  useEffect(() => {
    if (questions.length === 0 || done) return;
    answeredRef.current = false;
    forceSubmitRef.current = null;
    setAnswered(false);
    setIsCorrectFeedback(null);
    let secs = Q_TIME;
    setTimeLeft(Q_TIME);
    timerRef.current = setInterval(() => {
      secs -= 0.1;
      setTimeLeft(Math.max(0, secs));
      if (secs <= 0) {
        clearInterval(timerRef.current);
        if (!answeredRef.current) handleTimeout();
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [idx, questions.length, done]); // eslint-disable-line

  const handleTimeout = () => {
    if (answeredRef.current) return;
    if (forceSubmitRef.current) {
      // matching/sequence: auto-submit current state
      forceSubmitRef.current();
    } else {
      // MC/VF: no selection = wrong
      recordAnswer(false, Q_TIME);
    }
  };

  const handleAnswer = (isCorrect) => {
    if (answeredRef.current || done) return;
    clearInterval(timerRef.current);
    recordAnswer(isCorrect, Q_TIME - timeLeft);
  };

  const recordAnswer = (isCorrect, elapsed) => {
    answeredRef.current = true;
    setAnswered(true);
    setIsCorrectFeedback(isCorrect);
    if (isCorrect) { scoreRef.current++; setScore(s => s + 1); }
    timesRef.current.push(elapsed);
    setTimeout(() => advance(idx), 1000);
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

    const times    = timesRef.current;
    const avgTime  = times.length ? times.reduce((a, b) => a + b, 0) / times.length : Q_TIME;
    const accuracy = questions.length ? Math.round((finalScore / questions.length) * 100) : 0;

    try {
      const fresh   = await base44.entities.Tournament.get(tournament.id);
      const players = [...(fresh.players || [])];
      const myIdx   = players.findIndex(p => p.user_id === profile.user_id);
      if (myIdx >= 0) {
        players[myIdx] = {
          ...players[myIdx],
          score: finalScore,
          accuracy,
          avg_time: +avgTime.toFixed(2),
          completed: true,
          completed_at: new Date().toISOString(),
        };
      }
      await base44.entities.Tournament.update(tournament.id, { players });
      await checkAllDone(players, fresh);
    } catch (err) {
      console.error('[TournamentArena] Error saving result:', err);
    }
  };

  const checkAllDone = async (playersOverride, tournamentOverride) => {
    try {
      const fresh   = tournamentOverride || await base44.entities.Tournament.get(tournament.id);
      if (fresh.status === 'completed') { setResultData(fresh); return; }

      const players = playersOverride || fresh.players || [];
      const incomplete = players.filter(p => !p.completed);

      if (incomplete.length > 0) {
        setWaitingFor(incomplete.map(p => p.display_name));
        return;
      }

      // All done — finalize (race guard: check status again)
      const guard = await base44.entities.Tournament.get(tournament.id);
      if (guard.status === 'completed') { setResultData(guard); return; }

      // Sort: score desc, avg_time asc
      const ranked = [...players].sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.avg_time - b.avg_time
      );

      await base44.entities.Tournament.update(tournament.id, {
        status: 'completed', results_published: true, completed_at: new Date().toISOString(),
      });

      // Notifications + XP per player
      for (let i = 0; i < ranked.length; i++) {
        const p   = ranked[i];
        const xp  = XP_RANKS[i] || 10;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`;
        try {
          await base44.entities.Notification.create({
            user_id: p.user_id, type: 'tournament',
            title: `${medal} Torneo: ${fresh.name}`,
            message: `Posición ${i + 1}/${ranked.length} · ${p.score}/${questions.length} correctas · +${xp} XP`,
            is_read: false,
          });
          const pList = await base44.entities.UserProfile.filter({ user_id: p.user_id });
          if (pList.length) {
            await base44.entities.UserProfile.update(pList[0].id, { xp: (pList[0].xp || 0) + xp });
          }
        } catch { /* best effort per player */ }
      }

      const finalData = await base44.entities.Tournament.get(tournament.id);
      setResultData(finalData);
    } catch (err) {
      console.error('[TournamentArena] checkAllDone error:', err);
    }
  };

  // ── Result screen ─────────────────────────────────────────────────────────
  if (done && resultData) {
    const players = resultData.players || [];
    const ranked  = [...players].sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.avg_time - b.avg_time
    );
    const myRank = ranked.findIndex(p => p.user_id === profile.user_id) + 1;
    const me     = ranked.find(p => p.user_id === profile.user_id);
    const medal  = myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `${myRank}°`;
    const xp     = XP_RANKS[myRank - 1] || 10;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto space-y-5 py-8">
        <div className="text-center space-y-2">
          <div className="text-6xl">{medal}</div>
          <h1 className="text-2xl font-bold">{myRank === 1 ? '¡Campeón del torneo!' : `Posición ${myRank}`}</h1>
          <p className="text-sm text-muted-foreground">{tournament.name}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Correctas</p>
              <p className="text-2xl font-bold text-primary">{me?.score ?? 0}<span className="text-sm text-muted-foreground">/{questions.length}</span></p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Precisión</p>
              <p className="text-2xl font-bold">{me?.accuracy ?? 0}%</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">XP ganados</p>
              <p className="text-2xl font-bold text-yellow-400">+{xp}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clasificación final</p>
            {ranked.map((p, i) => {
              const isMe = p.user_id === profile.user_id;
              const m = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
              return (
                <div key={p.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}>
                  <span className="text-lg w-8 text-center shrink-0">{m}</span>
                  <span className={`flex-1 text-sm ${isMe ? 'font-bold' : ''}`}>{p.display_name}{isMe ? ' (tú)' : ''}</span>
                  <span className="font-mono text-sm font-semibold">{p.score}<span className="text-muted-foreground text-xs">/{questions.length}</span></span>
                  <span className="text-xs text-muted-foreground">{p.avg_time?.toFixed(1)}s</span>
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={onFinish} className="w-full rounded-xl">Volver a Torneos</Button>
      </motion.div>
    );
  }

  // ── Waiting screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-10 space-y-5">
        <div className="text-5xl">🏟️</div>
        <h2 className="text-xl font-bold">¡Tu parte está lista!</h2>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <p className="text-4xl font-bold text-primary">{scoreRef.current}<span className="text-xl text-muted-foreground font-normal"> / {questions.length}</span></p>
          <p className="text-sm text-muted-foreground">Precisión: {questions.length ? Math.round(scoreRef.current / questions.length * 100) : 0}%</p>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              Esperando a: <span className="font-semibold text-foreground">{waitingFor.join(', ') || '...'}</span>
            </p>
            <p className="text-xs text-muted-foreground">Los resultados aparecerán automáticamente</p>
          </div>
        </div>
        <Button onClick={onFinish} variant="outline" className="w-full rounded-xl">Salir (resultado guardado)</Button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  const q        = questions[idx];
  const timerPct = Math.max(0, (timeLeft / Q_TIME) * 100);

  const typeLabels = {
    multiple_choice: 'Opción múltiple',
    true_false:      'Verdadero / Falso',
    matching:        'Matching',
    order_sequence:  'Secuencia',
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{idx + 1} / {questions.length}</span>
        <span className="text-sm font-bold text-primary">{score} pts</span>
        <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-500' : timeLeft <= 30 ? 'text-yellow-500' : 'text-green-500'}`}>
          {Math.ceil(timeLeft)}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-none"
          style={{
            width: `${timerPct}%`,
            background: timerPct > 50 ? 'hsl(var(--success, 142 71% 45%))' : timerPct > 25 ? '#eab308' : 'hsl(var(--destructive))',
          }} />
      </div>

      {/* Question */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            {typeLabels[q.type] || q.type}
          </span>
          <span className="text-xs text-muted-foreground">{q.subject}</span>
        </div>
        <h2 className="text-base font-semibold leading-snug">{q.statement}</h2>
        {q.image_url && <img src={q.image_url} alt="" className="mt-3 rounded-lg max-h-36 object-contain" />}
      </div>

      {/* Answer options */}
      <div>
        {q.type === 'multiple_choice' && (
          <MCRenderer key={idx} question={q} answered={answered} onAnswer={handleAnswer} />
        )}
        {q.type === 'true_false' && (
          <VFRenderer key={idx} question={q} answered={answered} onAnswer={handleAnswer} />
        )}
        {q.type === 'matching' && (
          <MatchingRenderer key={idx} question={q} answered={answered}
            onAnswer={handleAnswer} onForceAnswer={(ok) => recordAnswer(ok, Q_TIME - timeLeft)}
            forceRef={forceSubmitRef} />
        )}
        {q.type === 'order_sequence' && (
          <SequenceRenderer key={idx} question={q} answered={answered}
            onAnswer={handleAnswer} forceRef={forceSubmitRef} />
        )}
      </div>

      {/* Feedback */}
      {answered && isCorrectFeedback !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={`text-center py-2.5 rounded-xl font-semibold text-sm ${isCorrectFeedback ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {isCorrectFeedback ? '✅ ¡Correcto!' : '❌ Incorrecto'}
        </motion.div>
      )}
    </div>
  );
}
