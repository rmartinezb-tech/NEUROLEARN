import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import QuestionRenderer from './QuestionRenderer';
import SessionComplete from './SessionComplete';
import { playCorrect, playBlockComplete, playSessionComplete, setSoundEnabled } from '@/utils/sounds';

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_CONFIG = { blockMinutes: 25, pauseMinutes: 5, blocks: 1, cycles: 1 };

export default function StudyEngine({ questions, profile, sessionType, config: cfg, onBack, interleaved = false }) {
  const config = { ...DEFAULT_CONFIG, ...(cfg || {}) };

  // ---- Cycle/queue state ----
  const [allQ] = useState(() => shuffle(questions));
  const [pendingIds, setPendingIds] = useState(() => new Set(questions.map(q => q.id)));
  const [priorityQueue, setPriorityQueue] = useState([]); // last 4 wrong, pending
  const [mainQueue, setMainQueue] = useState(() => shuffle(questions).slice(1));
  const [currentQ, setCurrentQ] = useState(() => shuffle(questions)[0]);

  // ---- Answer flow ----
  const [answered, setAnswered] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [dismissFatigue, setDismissFatigue] = useState(false);

  // ---- Block/Cycle state ----
  const [block, setBlock] = useState(1);
  const [cycle, setCycle] = useState(1);
  const [phase, setPhase] = useState('study'); // study | break | cycle_end | done
  const [blockSecs, setBlockSecs] = useState(config.blockMinutes * 60);
  const [breakSecs, setBreakSecs] = useState(config.pauseMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);

  // ---- Stats ----
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, total: 0, xp: 0, startTime: Date.now(), answers: [], responseTimes: [] });
  const [muted, setMuted] = useState(false);
  const [fatigueAlert, setFatigueAlert] = useState(false);
  const lastAnswerTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const breakTimerRef = useRef(null);

  // Sound mute sync
  useEffect(() => { setSoundEnabled(!muted); }, [muted]);

  // Block countdown
  useEffect(() => {
    if (phase !== 'study' || isPaused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setBlockSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          handleBlockTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, isPaused]); // eslint-disable-line

  // Break countdown
  useEffect(() => {
    if (phase !== 'break') { clearInterval(breakTimerRef.current); return; }
    setBreakSecs(config.pauseMinutes * 60);
    breakTimerRef.current = setInterval(() => {
      setBreakSecs(s => {
        if (s <= 1) { clearInterval(breakTimerRef.current); startNextBlock(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(breakTimerRef.current);
  }, [phase]); // eslint-disable-line

  const handleBlockTimeout = () => {
    if (!muted) playBlockComplete();
    if (block >= config.blocks) {
      setPhase('done');
      if (!muted) setTimeout(() => playSessionComplete(), 200);
    } else {
      setPhase('cycle_end');
    }
  };

  const getNextQuestion = useCallback((pendIds, pQueue, mQueue) => {
    // Priority first (last wrong answers still pending)
    const filteredPriority = pQueue.filter(q => pendIds.has(q.id));
    if (filteredPriority.length > 0) {
      return { next: filteredPriority[0], newPriority: filteredPriority.slice(1), newMain: mQueue };
    }
    // Main queue
    const filteredMain = mQueue.filter(q => pendIds.has(q.id));
    if (filteredMain.length > 0) {
      return { next: filteredMain[0], newPriority: filteredPriority, newMain: filteredMain.slice(1) };
    }
    // Refill if pending still has items
    if (pendIds.size > 0) {
      const refill = shuffle(allQ.filter(q => pendIds.has(q.id)));
      return { next: refill[0], newPriority: [], newMain: refill.slice(1) };
    }
    return null; // Cycle complete
  }, [allQ]);

  const initCycle = useCallback((newCycle) => {
    const newPending = new Set(allQ.map(q => q.id));
    const shuffled = shuffle(allQ);
    setPendingIds(newPending);
    setPriorityQueue([]);
    setMainQueue(shuffled.slice(1));
    setCurrentQ(shuffled[0]);
    setCycle(newCycle);
    setAnswered(false);
    setRevealedAnswer(false);
    setIsCorrect(null);
    setConfidence(0);
  }, [allQ]);

  const startNextBlock = useCallback(() => {
    const newBlock = block + 1;
    setBlock(newBlock);
    setBlockSecs(config.blockMinutes * 60);
    setPhase('study');
    initCycle(1);
  }, [block, config.blockMinutes, initCycle]);

  const handleAnswer = (correct) => {
    const now = Date.now();
    const responseTime = (now - lastAnswerTimeRef.current) / 1000;
    lastAnswerTimeRef.current = now;

    if (correct && !muted) playCorrect();

    // XP calculation
    let xp = 0;
    if (correct) {
      xp = 10;
      if (confidence > 0 && confidence <= 2) xp += 5; // low confidence bonus
      if (responseTime < 8) xp += 3; // fast answer bonus
    }

    setStats(prev => {
      const newTimes = [...prev.responseTimes, responseTime].slice(-15);
      const recent = [...prev.answers, { question_id: currentQ.id, answered_correctly: correct, time_seconds: responseTime, confidence }].slice(-10);
      const recentErrors = recent.filter(a => !a.answered_correctly).length;
      const avgTime = newTimes.reduce((a, b) => a + b, 0) / (newTimes.length || 1);
      if (newTimes.length >= 8 && avgTime > 25 && recentErrors >= 5) setFatigueAlert(true);
      return {
        ...prev,
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
        total: prev.total + 1,
        xp: prev.xp + xp,
        answers: [...prev.answers, { question_id: currentQ.id, answered_correctly: correct, time_seconds: responseTime, confidence }],
        responseTimes: newTimes,
      };
    });

    // Update pending and priority queues
    if (correct) {
      setPendingIds(prev => { const n = new Set(prev); n.delete(currentQ.id); return n; });
      setPriorityQueue(prev => prev.filter(q => q.id !== currentQ.id));
    } else {
      setPriorityQueue(prev => [...prev.filter(q => q.id !== currentQ.id), currentQ].slice(-4));
    }

    setAnswered(true);
    setIsCorrect(correct);
  };

  const handleContinue = () => {
    // NO SOUND HERE
    // If answer was revealed (dev/clinical/flashcard) but user skipped self-rating, count as incorrect
    if (revealedAnswer && !answered) {
      const responseTime = (Date.now() - lastAnswerTimeRef.current) / 1000;
      lastAnswerTimeRef.current = Date.now();
      setStats(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        total: prev.total + 1,
        answers: [...prev.answers, { question_id: currentQ.id, answered_correctly: false, time_seconds: responseTime, confidence }],
        responseTimes: [...prev.responseTimes, responseTime].slice(-15),
      }));
    }
    setAnswered(false);
    setRevealedAnswer(false);
    setIsCorrect(null);
    setConfidence(0);
    setFatigueAlert(false);

    // Check if cycle complete (pending is empty after last correct answer)
    const updatedPending = new Set(pendingIds);
    // Note: pendingIds state may not have updated yet from handleAnswer, use local logic
    // We check: if answered correctly, remove from set
    if (isCorrect) updatedPending.delete(currentQ.id);

    const result = getNextQuestion(updatedPending, isCorrect ? priorityQueue.filter(q => q.id !== currentQ.id) : priorityQueue, mainQueue);

    if (result) {
      setCurrentQ(result.next);
      setPriorityQueue(result.newPriority);
      setMainQueue(result.newMain);
    } else {
      // Cycle complete
      if (!muted) playBlockComplete();
      if (cycle < config.cycles) {
        initCycle(cycle + 1);
      } else {
        // All cycles done for this block
        if (block < config.blocks) {
          setPhase('cycle_end');
        } else {
          setPhase('done');
          if (!muted) setTimeout(() => playSessionComplete(), 200);
        }
      }
    }
  };

  const handleFinish = async () => {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const duration = Math.round((Date.now() - stats.startTime) / 60000);
    await base44.entities.StudySession.create({
      user_id: profile.user_id,
      session_type: sessionType,
      questions_total: stats.total,
      questions_correct: stats.correct,
      questions_incorrect: stats.incorrect,
      accuracy,
      xp_earned: stats.xp,
      duration_minutes: duration,
      status: 'completed',
      completed_at: new Date().toISOString(),
      answers_log: stats.answers,
      is_interleaved: interleaved,
    });
    const newXp = (profile.xp || 0) + stats.xp;
    let level = profile.level || 1;
    while (level < 50 && newXp >= level * 100) level++;
    const today = new Date().toDateString();
    const lastStudy = profile.last_study_date ? new Date(profile.last_study_date).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const updates = {
      xp: newXp, level,
      total_sessions: (profile.total_sessions || 0) + 1,
      total_questions_answered: (profile.total_questions_answered || 0) + stats.total,
      total_correct: (profile.total_correct || 0) + stats.correct,
      last_study_date: new Date().toISOString(),
      streak_days: lastStudy === today ? profile.streak_days : (lastStudy === yesterday ? (profile.streak_days || 0) + 1 : 1),
      unique_study_days: lastStudy !== today ? (profile.unique_study_days || 0) + 1 : profile.unique_study_days,
    };
    if (interleaved) updates.interleaved_sessions = (profile.interleaved_sessions || 0) + 1;
    await base44.entities.UserProfile.update(profile.id, updates);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = config.blockMinutes > 0 ? ((config.blockMinutes * 60 - blockSecs) / (config.blockMinutes * 60)) * 100 : 0;
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  // ---- Phases ----
  if (phase === 'done') {
    return <SessionComplete stats={stats} profile={profile} onFinish={handleFinish} onNewSession={() => onBack && onBack()} />;
  }

  if (phase === 'break') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-20">
        <div className="text-6xl animate-float">☕</div>
        <h2 className="text-2xl font-bold">Pausa — Bloque {block} completado</h2>
        <p className="text-muted-foreground">El siguiente bloque comenzará en:</p>
        <div className="text-5xl font-mono font-bold text-primary">{fmt(breakSecs)}</div>
        <Button onClick={() => { clearInterval(breakTimerRef.current); startNextBlock(); }} variant="outline">Saltar pausa</Button>
      </div>
    );
  }

  if (phase === 'cycle_end') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <div className="text-6xl">🎯</div>
        <h2 className="text-2xl font-bold">Bloque {block} completado</h2>
        <p className="text-muted-foreground">{cycle} ciclo(s) completados en este bloque</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Precisión</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{stats.correct}/{stats.total}</p>
            <p className="text-xs text-muted-foreground">Correctas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { setPhase('done'); if (!muted) playSessionComplete(); }}>Terminar sesión</Button>
          <Button className="flex-1" onClick={() => setPhase('break')}>Continuar → Pausa ☕</Button>
        </div>
      </div>
    );
  }

  // Phase = study
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-3">
          {/* Pomodoro timer ring */}
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
              <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - pct / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold font-mono">{fmt(blockSecs)}</span>
            </div>
          </div>
          <div className="text-xs">
            <p className="font-semibold">Bloque {block}/{config.blocks} · Ciclo {cycle}/{config.cycles}</p>
            <p className="text-muted-foreground">{accuracy}% prec. · {stats.correct}/{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsPaused(p => !p); }}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMuted(m => !m)}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center space-y-2">
          <p className="font-semibold">⏸ Sesión en pausa — el tiempo se ha detenido</p>
          <Button size="sm" onClick={() => setIsPaused(false)}><Play className="mr-2 h-3 w-3" /> Reanudar</Button>
        </div>
      )}

      {/* Fatigue alert */}
      {fatigueAlert && !dismissFatigue && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm">🥱 Se detectó fatiga. ¿Quieres tomar una pausa?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsPaused(true)}>Pausar</Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissFatigue(true)}>Ignorar</Button>
          </div>
        </div>
      )}

      {/* Confidence selector (before answering) */}
      {!answered && !isPaused && (
        <div className="bg-card border border-border rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0">Confianza:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setConfidence(n)}
                className={`text-lg transition-all ${confidence >= n ? 'opacity-100 scale-110' : 'opacity-25 hover:opacity-60'}`}>⭐</button>
            ))}
          </div>
          {confidence > 0 && <span className="text-xs text-muted-foreground ml-1">{['', 'Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'][confidence]}</span>}
        </div>
      )}

      {/* Question renderer */}
      {currentQ && !isPaused && (
        <AnimatePresence mode="wait">
          <motion.div key={currentQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionRenderer
              question={currentQ}
              onAnswer={handleAnswer}
              onReveal={() => setRevealedAnswer(true)}
              answered={answered}
              isCorrect={isCorrect}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Post-answer: Continue button */}
      {(answered || revealedAnswer) && !isPaused && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={handleContinue} className="w-full rounded-xl" size="lg">
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
