import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";

export default function FatigueDetector({ onPause, onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-8 max-w-md w-full text-center"
        style={{ background: 'linear-gradient(135deg, #78350f, #92400e, #b45309)', border: '2px solid #d97706' }}
      >
        <div className="text-8xl mb-4">☕</div>
        <h2 className="text-2xl font-bold text-amber-100 mb-3">
          Has estado trabajando mucho. El sistema percibe fatiga
        </h2>
        <div className="space-y-2 text-amber-200/80 text-sm mb-6">
          <p>Descansar a tiempo, cambiar de actividad o tomar aire unos minutos también es parte del aprendizaje.</p>
          <p>Respira lento y profundo, observa algo real como el cielo, árboles o gente pasando 🌈🚶</p>
          <p>También puedes dar un pequeño paseo, si así lo prefieres 🍃</p>
          <p>Aunque sea por pocos minutos, eso te ayudará a volver con más claridad 🌟</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={onPause} className="rounded-xl" style={{ background: '#d97706', color: 'white' }}>
            ⏸️ Pausar la sesión
          </Button>
          <Button variant="outline" onClick={onContinue} className="rounded-xl border-amber-600 text-amber-200">
            Continuar de todas formas
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
