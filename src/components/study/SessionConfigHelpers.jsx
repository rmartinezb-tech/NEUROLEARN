import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export const SUBJECTS = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'Otras'];

export const QTYPES = [
  { v: 'multiple_choice', l: 'Opción Múltiple' },
  { v: 'true_false', l: 'Verdadero/Falso' },
  { v: 'fill_blank', l: 'Llenar Espacios' },
  { v: 'order_sequence', l: 'Ordenar Secuencia' },
  { v: 'matching', l: 'Matching' },
  { v: 'development', l: 'Desarrollo' },
  { v: 'clinical_case', l: 'Caso Clínico' },
  { v: 'flashcard', l: 'Flashcard' },
];

export const COGNITIVE_SKILLS = [
  'Conceptual', 'Procedimental', 'Aplicación', 'Comparación', 'Causa y efecto',
  'Memorización', 'Resolución de problemas', 'Análisis', 'Síntesis', 'Evaluación',
  'Interpretación', 'Definición', 'Ejemplificación',
];

// Slider + number input + +/- buttons
export function NumericInput({ label, value, onChange, min, max, step = 1 }) {
  const handleText = (e) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= min && v <= max) onChange(v);
  };
  return (
    <div>
      {label && <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-sm font-bold shrink-0 transition-colors"
        >−</button>
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={handleText}
          className="w-16 text-center bg-muted rounded-lg px-1 py-1.5 text-sm font-bold border border-border focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-sm font-bold shrink-0 transition-colors"
        >+</button>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
      </div>
    </div>
  );
}

// Visual duration estimate — updates live with params
export function DurationBadge({ blocks, blockMinutes, pauseMinutes }) {
  const totalMin = blocks * blockMinutes + Math.max(0, blocks - 1) * pauseMinutes;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const timeStr = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m} min`;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">⏱ Duración estimada de sesión</p>
          <p className="text-3xl font-bold mt-0.5 text-primary">{timeStr}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium">{blocks} bloque{blocks > 1 ? 's' : ''}</p>
          <p>{blockMinutes} min trabajo</p>
          {blocks > 1 && <p>{blocks - 1} pausa{blocks > 2 ? 's' : ''} × {pauseMinutes} min</p>}
        </div>
      </div>
    </div>
  );
}

// Shows available question count with contextual color feedback
export function AvailableBadge({ count, requested, loading }) {
  if (loading) {
    return (
      <div className="bg-muted rounded-xl p-3 flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-3.5 w-3.5 border-2 border-muted-foreground/40 border-t-transparent rounded-full animate-spin shrink-0" />
        Verificando preguntas disponibles...
      </div>
    );
  }
  if (count === null) return null;
  const enough = count >= requested && count > 0;
  return (
    <div className={`rounded-xl p-3 flex items-center gap-3 transition-colors ${enough ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
      <span className="text-xl shrink-0">{enough ? '✅' : '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">
          {count} pregunta{count !== 1 ? 's' : ''} disponible{count !== 1 ? 's' : ''}
        </p>
        {!enough && count === 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">Sin preguntas con esos filtros. Ampliá los criterios.</p>
        )}
        {!enough && count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Reducí la cantidad solicitada a {count} o ajustá los filtros.
          </p>
        )}
      </div>
    </div>
  );
}

// Hook: fetches available question count with 400ms debounce
// fetchFn: async () => number
export function useAvailableCount(fetchFn, deps) {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const n = await fetchFn();
        setCount(n);
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, deps); // eslint-disable-line

  return { count, loading };
}

// Toggle button for subject selection
export function SubjectToggle({ subjects, onToggle, max }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SUBJECTS.map(s => {
        const active = subjects.includes(s);
        const disabled = !active && max && subjects.length >= max;
        return (
          <button key={s} type="button" onClick={() => !disabled && onToggle(s)}
            className={`p-2.5 rounded-xl text-sm border-2 transition-all ${active ? 'border-primary bg-primary/10' : disabled ? 'border-border opacity-40 cursor-not-allowed' : 'border-border hover:border-muted-foreground'}`}>
            {s}
          </button>
        );
      })}
    </div>
  );
}

// Toggle button for question type selection
export function TypeToggle({ types, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {QTYPES.map(t => (
        <button key={t.v} type="button" onClick={() => onToggle(t.v)}
          className={`p-2 rounded-lg text-xs border transition-all ${types.includes(t.v) ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
          {t.l}
        </button>
      ))}
    </div>
  );
}
