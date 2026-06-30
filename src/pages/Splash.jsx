import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// Floating particle
function Particle({ delay, x, y, size, duration }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/20 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

const PARTICLES = [
  { x: 10, y: 20, size: 6,  duration: 4.2, delay: 0    },
  { x: 85, y: 15, size: 10, duration: 5.1, delay: 0.8  },
  { x: 25, y: 75, size: 4,  duration: 3.8, delay: 1.2  },
  { x: 70, y: 60, size: 8,  duration: 4.7, delay: 0.3  },
  { x: 50, y: 88, size: 5,  duration: 6.0, delay: 2.1  },
  { x: 90, y: 45, size: 7,  duration: 3.5, delay: 1.7  },
  { x: 15, y: 50, size: 9,  duration: 5.5, delay: 0.6  },
  { x: 60, y: 25, size: 4,  duration: 4.0, delay: 2.8  },
  { x: 35, y: 40, size: 6,  duration: 4.9, delay: 0.1  },
  { x: 78, y: 82, size: 5,  duration: 5.3, delay: 1.5  },
  { x: 5,  y: 88, size: 8,  duration: 3.7, delay: 3.1  },
  { x: 45, y: 10, size: 6,  duration: 4.4, delay: 0.9  },
];

// Animated aurora orbs in background
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large glow orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)/0.12) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)/0.08) 0%, transparent 70%)',
          top: '20%', right: '10%',
        }}
        animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)/0.07) 0%, transparent 70%)',
          bottom: '15%', left: '8%',
        }}
        animate={{ scale: [1, 1.3, 1], x: [0, -15, 0], y: [0, 15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
    </div>
  );
}

// Stat counter
function StatBadge({ value, label, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="text-center px-5 py-3 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/40"
    >
      <p className="text-2xl font-bold text-primary font-space">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function Splash() {
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);

  const handleEnter = () => {
    setEntered(true);
    setTimeout(() => navigate('/landing'), 400);
  };

  // Optional: keyboard shortcut (Enter / Space)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter' || e.key === ' ') handleEnter(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // eslint-disable-line

  return (
    <AnimatePresence>
      {!entered && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 overflow-hidden"
        >
          <AuroraBackground />

          <div className="relative z-10 flex flex-col items-center text-center max-w-xl w-full">
            {/* Brain logo */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, type: 'spring', stiffness: 200, damping: 14 }}
              className="mb-6"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-8xl select-none filter drop-shadow-[0_0_24px_hsl(var(--primary)/0.5)]"
              >
                🧠
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-5xl md:text-6xl font-space font-bold mb-3 leading-tight"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--primary)) 100%)',
                backgroundSize: '200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              NeuroLearn Pro
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-md leading-relaxed mb-2"
            >
              Estudia más inteligente. Recuerda más tiempo.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground/60 mb-10"
            >
              Plataforma de estudio adaptativo con IA, gamificación y motor Anki SM-2
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-3 mb-10 flex-wrap justify-center"
            >
              <StatBadge value="SM-2" label="Algoritmo Anki" delay={0.75} />
              <StatBadge value="8+" label="Tipos de preguntas" delay={0.85} />
              <StatBadge value="∞" label="Sesiones adaptativas" delay={0.95} />
            </motion.div>

            {/* CTA button */}
            <motion.button
              onClick={handleEnter}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative group px-10 py-5 rounded-2xl text-lg font-semibold text-white overflow-hidden shadow-2xl shadow-primary/30"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            >
              {/* shine effect */}
              <motion.div
                className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{ transform: 'skewX(-20deg)' }}
              />
              <span className="relative flex items-center gap-3">
                Ingresar a la plataforma
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  <ArrowRight className="h-5 w-5" />
                </motion.span>
              </span>
            </motion.button>

            {/* Keyboard hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-5 text-xs text-muted-foreground/40"
            >
              También podés presionar <kbd className="px-1.5 py-0.5 rounded border border-border/40 font-mono text-[10px]">Enter</kbd>
            </motion.p>
          </div>

          {/* Version footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="absolute bottom-5 text-xs text-muted-foreground/30 z-10"
          >
            NeuroLearn Pro · Versión 3.0 · Impulsado por ciencia cognitiva
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
