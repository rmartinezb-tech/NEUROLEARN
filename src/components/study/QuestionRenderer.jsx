import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, CheckCircle, XCircle, HelpCircle, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const typeLabels = {
  multiple_choice: 'Opción Múltiple', true_false: 'Verdadero / Falso',
  fill_blank: 'Llenar Espacios', order_sequence: 'Ordenar Secuencia',
  matching: 'Matching', development: 'Desarrollo',
  clinical_case: 'Caso Clínico', flashcard: 'Flashcard',
};

export default function QuestionRenderer({ question, onAnswer, onReveal, answered, isCorrect }) {
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [devPhase, setDevPhase] = useState('initial'); // initial | shown | chose
  const [userOrder, setUserOrder] = useState(null);
  const [matchSelections, setMatchSelections] = useState({});

  // Shuffle options permanently for this question instance
  const shuffledOptions = useMemo(() => {
    if (!question.options || question.options.length === 0) return [];
    return shuffleArr(question.options);
  }, [question.id]); // eslint-disable-line

  // Effective items for order_sequence — native field OR fallback to options
  const effectiveOrderItems = useMemo(() => {
    if (question.type !== 'order_sequence') return [];
    if (question.sequence_order?.length) return question.sequence_order;
    return question.options || [];
  }, [question.id]); // eslint-disable-line

  // Correct sequence — native field OR parsed from correct_answer text
  const correctSeq = useMemo(() => {
    if (question.sequence_order?.length) return question.sequence_order;
    if (question.correct_answer) {
      const parsed = question.correct_answer.split(/[,→\n]/).map(s => s.trim()).filter(Boolean);
      if (parsed.length > 1) return parsed;
    }
    return effectiveOrderItems;
  }, [question.id]); // eslint-disable-line

  // Shuffled sequence for order_sequence
  const shuffledSeq = useMemo(() => {
    if (!effectiveOrderItems.length) return [];
    return shuffleArr(effectiveOrderItems);
  }, [question.id]); // eslint-disable-line

  // Init userOrder from shuffledSeq
  useMemo(() => {
    if (question.type === 'order_sequence') setUserOrder(shuffledSeq);
  }, [question.id]); // eslint-disable-line

  // Effective matching pairs — native field OR parsed from options "Left → Right"
  const effectiveMatchingPairs = useMemo(() => {
    if (question.matching_pairs?.length) return question.matching_pairs;
    return (question.options || []).map(opt => {
      const parts = opt.split(/→|–|-/).map(s => s.trim());
      return { left: parts[0] || opt, right: parts[1] || '' };
    }).filter(p => p.right);
  }, [question.id]); // eslint-disable-line

  // Shuffled right column for matching
  const shuffledRight = useMemo(() => {
    if (!effectiveMatchingPairs.length) return [];
    return shuffleArr(effectiveMatchingPairs.map(p => p.right));
  }, [question.id]); // eslint-disable-line

  const handleMultipleChoice = (opt) => {
    if (answered) return;
    setSelected(opt);
    const correct = opt === question.correct_answer ||
      (question.correct_index !== undefined && question.options?.[question.correct_index] === opt);
    onAnswer(correct, opt);
  };

  const handleTrueFalse = (val) => {
    if (answered) return;
    setSelected(val);
    const correct = question.correct_answer?.toLowerCase() === val.toLowerCase();
    onAnswer(correct, val);
  };

  const handleFillBlank = () => {
    if (answered || !textAnswer.trim()) return;
    const correct = textAnswer.trim().toLowerCase() === (question.correct_answer || '').toLowerCase();
    onAnswer(correct, textAnswer);
  };

  const handleOrderSubmit = () => {
    if (!userOrder) return;
    const correct = userOrder.join('|||') === (question.sequence_order || []).join('|||');
    onAnswer(correct, userOrder.join(' → '));
  };

  const moveItem = (idx, dir) => {
    if (!userOrder) return;
    const next = [...userOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setUserOrder(next);
  };

  const handleMatchSelect = (leftIdx, rightVal) => {
    if (answered) return;
    setMatchSelections(prev => ({ ...prev, [leftIdx]: rightVal }));
  };

  const handleMatchSubmit = () => {
    const correct = effectiveMatchingPairs.every((p, i) => matchSelections[i] === p.right);
    onAnswer(correct, JSON.stringify(matchSelections));
  };

  const handleDevShowAnswer = () => { setDevPhase('shown'); onReveal?.(); };

  const handleDevChoice = (choice) => {
    if (answered) return;
    setDevPhase('chose');
    const correct = choice === 'yes';
    onAnswer(correct, choice);
  };

  const renderByType = () => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {shuffledOptions.map((opt, i) => {
              const isSelected = selected === opt;
              const isAnswer = opt === question.correct_answer ||
                (question.correct_index !== undefined && question.options?.[question.correct_index] === opt);
              let cls = 'bg-card border-2 border-border hover:border-primary/50';
              if (answered && isAnswer) cls = 'bg-green-500/10 border-2 border-green-500';
              else if (answered && isSelected && !isAnswer) cls = 'bg-red-500/10 border-2 border-red-500';
              else if (isSelected) cls = 'bg-primary/10 border-2 border-primary';
              return (
                <button key={i} onClick={() => handleMultipleChoice(opt)} disabled={answered}
                  className={`w-full text-left p-4 rounded-xl transition-all ${cls}`}>
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm flex-1">{opt}</span>
                    {answered && isAnswer && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                    {answered && isSelected && !isAnswer && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'true_false':
        return (
          <div className="grid grid-cols-2 gap-4">
            {['Verdadero', 'Falso'].map(val => {
              const isSelected = selected === val;
              const isAnswer = question.correct_answer?.toLowerCase() === val.toLowerCase();
              let cls = 'bg-card border-2 border-border hover:border-primary/50';
              if (answered && isAnswer) cls = 'bg-green-500/10 border-2 border-green-500';
              else if (answered && isSelected && !isAnswer) cls = 'bg-red-500/10 border-2 border-red-500';
              return (
                <button key={val} onClick={() => handleTrueFalse(val)} disabled={answered}
                  className={`p-6 rounded-xl text-center font-semibold transition-all ${cls}`}>
                  {val === 'Verdadero' ? '✅' : '❌'} {val}
                </button>
              );
            })}
          </div>
        );

      case 'fill_blank':
        return (
          <div className="space-y-4">
            <Input value={textAnswer} onChange={e => setTextAnswer(e.target.value)}
              placeholder="Escribe tu respuesta..." className="rounded-xl text-lg py-6"
              disabled={answered} onKeyDown={e => e.key === 'Enter' && handleFillBlank()} />
            {!answered && <Button onClick={handleFillBlank} className="w-full rounded-xl" disabled={!textAnswer.trim()}>Verificar</Button>}
            {answered && <p className="text-sm"><strong>Respuesta correcta:</strong> {question.correct_answer}</p>}
          </div>
        );

      case 'order_sequence': {
        if (!effectiveOrderItems.length) {
          return (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Esta pregunta no tiene ítems configurados. Editala en el Banco de Preguntas para agregar los pasos a ordenar.
            </div>
          );
        }
        const isOrderCorrect = userOrder?.join('|||') === correctSeq.join('|||');
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Ordena los elementos correctamente:</p>
            {(userOrder || shuffledSeq).map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-3 rounded-xl border-2 ${answered ? (isOrderCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500/50 bg-red-500/5') : 'border-border bg-card'}`}>
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm">{item}</span>
                {!answered && (
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-xs px-1 py-0.5 bg-muted rounded disabled:opacity-30">▲</button>
                    <button onClick={() => moveItem(i, 1)} disabled={i === (userOrder?.length || 0) - 1} className="text-xs px-1 py-0.5 bg-muted rounded disabled:opacity-30">▼</button>
                  </div>
                )}
              </div>
            ))}
            {!answered && (
              <Button onClick={() => {
                const ok = (userOrder || []).join('|||') === correctSeq.join('|||');
                onAnswer(ok, (userOrder || []).join(' → '));
              }} className="w-full rounded-xl">Verificar orden</Button>
            )}
            {answered && (
              <div className="bg-muted/50 rounded-xl p-3 text-xs">
                <p className="font-medium mb-1">Orden correcto:</p>
                <p>{correctSeq.join(' → ')}</p>
              </div>
            )}
          </div>
        );
      }

      case 'matching': {
        const pairs = effectiveMatchingPairs;
        if (!pairs.length) {
          return (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Esta pregunta no tiene pares configurados. Editala en el Banco de Preguntas para agregar los pares de matching.
            </div>
          );
        }
        const allMatched = pairs.every((_, i) => matchSelections[i] !== undefined);
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Relaciona cada elemento de la columna A con su par en la columna B:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                {pairs.map((pair, i) => (
                  <div key={i} className="p-3 rounded-xl border-2 border-border bg-card text-sm font-medium">{pair.left}</div>
                ))}
              </div>
              <div className="space-y-2">
                {pairs.map((pair, i) => (
                  <select key={i} disabled={answered}
                    value={matchSelections[i] || ''}
                    onChange={e => handleMatchSelect(i, e.target.value)}
                    className={`w-full p-3 rounded-xl border-2 text-sm bg-muted focus:outline-none ${answered ? (matchSelections[i] === pair.right ? 'border-green-500' : 'border-red-500') : 'border-border'}`}>
                    <option value="">-- seleccionar --</option>
                    {shuffledRight.map((r, j) => <option key={j} value={r}>{r}</option>)}
                  </select>
                ))}
              </div>
            </div>
            {!answered && <Button onClick={handleMatchSubmit} className="w-full rounded-xl" disabled={!allMatched}>Verificar matching</Button>}
            {answered && (
              <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1">
                <p className="font-medium">Pares correctos:</p>
                {pairs.map((p, i) => <p key={i}>{p.left} ↔ {p.right}</p>)}
              </div>
            )}
          </div>
        );
      }

      case 'development':
      case 'clinical_case':
        return (
          <div className="space-y-4">
            {devPhase === 'initial' && (
              <Button onClick={handleDevShowAnswer} variant="outline" className="w-full rounded-xl py-6 gap-2" size="lg">
                <Eye className="h-4 w-4" /> Ver respuesta / Guía
              </Button>
            )}
            {devPhase !== 'initial' && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-semibold mb-2">Respuesta / Guía:</p>
                <p className="text-sm whitespace-pre-wrap">{question.correct_answer || question.explanation || 'Sin respuesta definida'}</p>
              </div>
            )}
            {devPhase === 'shown' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">¿Lo sabías?</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => handleDevChoice('yes')} variant="outline" className="rounded-xl bg-green-500/10 border-green-500/30">✅ Sí lo sabía</Button>
                  <Button onClick={() => handleDevChoice('partial')} variant="outline" className="rounded-xl bg-yellow-500/10 border-yellow-500/30">⚠️ Parcialmente</Button>
                  <Button onClick={() => handleDevChoice('no')} variant="outline" className="rounded-xl bg-red-500/10 border-red-500/30">❌ No lo sabía</Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'flashcard':
        return (
          <div className="text-center space-y-4">
            {!flipped ? (
              <Button onClick={() => { setFlipped(true); onReveal?.(); }} variant="outline" className="rounded-xl py-8 px-12 text-lg w-full">
                Voltear tarjeta 🔄
              </Button>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <p className="text-lg">{question.flashcard_back || question.correct_answer}</p>
              </div>
            )}
            {flipped && !answered && (
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => onAnswer(true, 'yes')} variant="outline" className="rounded-xl bg-green-500/10">Lo sabía ✅</Button>
                <Button onClick={() => onAnswer(false, 'partial')} variant="outline" className="rounded-xl bg-yellow-500/10">Parcial ⚠️</Button>
                <Button onClick={() => onAnswer(false, 'no')} variant="outline" className="rounded-xl bg-red-500/10">No lo sabía ❌</Button>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-muted-foreground text-sm">Tipo: {question.type}</p>;
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
          {typeLabels[question.type] || question.type}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{question.subject}</span>
          <button className="text-muted-foreground hover:text-red-500 transition-colors">
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Statement */}
      <h2 className="text-lg font-semibold mb-2">{question.statement}</h2>

      {question.image_url && (
        <img src={question.image_url} alt="" className="rounded-xl max-h-64 object-contain my-4 w-full" />
      )}
      {question.video_url && (
        <video controls className="rounded-xl w-full max-h-72 my-4 bg-black">
          <source src={question.video_url} />
        </video>
      )}
      {question.audio_url && (
        <audio controls className="w-full my-3">
          <source src={question.audio_url} />
        </audio>
      )}

      {question.hints && !answered && (
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
          <HelpCircle className="h-3 w-3" /> {question.hints}
        </p>
      )}

      <div className="mt-4">{renderByType()}</div>

      {/* Result indicator */}
      {answered && isCorrect !== null && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className={`mt-4 text-center py-3 rounded-xl font-semibold ${isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto'}
        </motion.div>
      )}

      {/* Explanation */}
      {answered && question.explanation && question.type !== 'development' && question.type !== 'clinical_case' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-muted/50 rounded-xl p-4">
          <p className="text-sm"><strong>Explicación:</strong> {question.explanation}</p>
        </motion.div>
      )}
    </div>
  );
}
