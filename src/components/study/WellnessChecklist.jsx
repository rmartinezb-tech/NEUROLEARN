import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Check, ArrowLeft, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  { label: 'Lugar tranquilo', emoji: '🏠' },
  { label: 'Temperatura adecuada', emoji: '🌡️' },
  { label: 'Alimentación', emoji: '🍎' },
  { label: 'Hidratación', emoji: '💧' },
  { label: 'Sin ruido', emoji: '🌈' },
  { label: 'Notificaciones apagadas', emoji: '📵' },
  { label: 'Sin música', emoji: '🎶' },
  { label: 'Material listo', emoji: '✏️' },
  { label: 'Descanso adecuado', emoji: '😴' },
  { label: 'Tiempo definido', emoji: '⏰' },
  { label: 'Objetivo claro', emoji: '🎯' },
  { label: 'Postura cómoda', emoji: '🪑' },
];

export default function WellnessChecklist({ onComplete }) {
  const [checked, setChecked] = useState(new Set());

  const toggle = (i) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i); else next.add(i);
    setChecked(next);
  };

  const markAll = () => setChecked(new Set(items.map((_, i) => i)));
  const allChecked = checked.size === items.length;
  const progress = (checked.size / items.length) * 100;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">⭐</div>
        <h1 className="text-2xl font-space font-bold">Checklist de Bienestar</h1>
        <p className="text-sm text-muted-foreground mt-1">Prepara tu entorno antes de estudiar</p>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, #EAB308 0%, #22C55E 100%)` }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2 mb-4">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              checked.has(i) ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40'
            }`}
          >
            <div className={`h-6 w-6 rounded-md flex items-center justify-center transition-all ${
              checked.has(i) ? 'bg-green-500 text-white' : 'border-2 border-yellow-500/50'
            }`}>
              {checked.has(i) && <Check className="h-4 w-4" />}
            </div>
            <span className="text-lg">{item.emoji}</span>
            <span className={`text-sm ${checked.has(i) ? 'line-through text-muted-foreground' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Link to="/" className="flex-1">
          <Button variant="outline" className="w-full rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <Button variant="outline" onClick={markAll} className="rounded-xl">
          <CheckCheck className="mr-2 h-4 w-4" /> Marcar todo
        </Button>
        <Button onClick={onComplete} className="flex-1 rounded-xl" disabled={!allChecked}>
          {allChecked ? '✅ Iniciar sesión' : `${checked.size}/${items.length}`}
        </Button>
      </div>
    </div>
  );
}
