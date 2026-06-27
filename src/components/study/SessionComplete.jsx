import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, BarChart3, RotateCcw, Home, Share2 } from 'lucide-react';

export default function SessionComplete({ stats, profile, onFinish, onNewSession }) {
  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const newXp = (profile?.xp || 0) + stats.xp;
  let newLevel = profile?.level || 1;
  while (newLevel < 50 && newXp >= newLevel * 100) newLevel++;
  const leveledUp = newLevel > (profile?.level || 1);

  const performanceMsg = () => {
    if (accuracy >= 90) return '🏆 ¡Rendimiento excepcional! Estás en el top 5% de los usuarios.';
    if (accuracy >= 80) return '⭐ ¡Excelente! Superaste el 80% de precisión — nuevo récord personal.';
    if (accuracy >= 70) return '✅ Buen trabajo. Superas el promedio de los últimos 7 días.';
    if (accuracy >= 50) return '📈 Sigue practicando. Cada sesión cuenta para tu progreso.';
    return '💪 La práctica constante hace la diferencia. ¡Tú puedes!';
  };

  const handleSave = async () => {
    setSaving(true);
    await onFinish(reflection);
    setSaved(true);
    setSaving(false);
  };

  if (saved) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center py-10 space-y-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
          className="text-7xl mb-2 inline-block">🎉</motion.div>
        <h1 className="text-3xl font-space font-bold">¡Sesión Completada!</h1>

        {leveledUp && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="font-bold text-yellow-500 text-lg">⬆️ ¡Subiste al nivel {newLevel}!</p>
          </motion.div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-500">{stats.correct}</p>
              <p className="text-xs text-muted-foreground">Correctas</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">{stats.incorrect}</p>
              <p className="text-xs text-muted-foreground">Incorrectas</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-4xl font-bold text-primary">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Precisión</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-yellow-500">+{stats.xp}</p>
              <p className="text-xs text-muted-foreground">XP Ganado</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-purple-500">{newLevel}</p>
              <p className="text-xs text-muted-foreground">Nivel</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-sm text-muted-foreground italic">{performanceMsg()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/"><Button variant="outline" className="rounded-xl"><Home className="mr-2 h-4 w-4" /> Dashboard</Button></Link>
          <Button onClick={onNewSession} className="rounded-xl"><RotateCcw className="mr-2 h-4 w-4" /> Nueva sesión</Button>
          <Link to="/analytics"><Button variant="outline" className="rounded-xl"><BarChart3 className="mr-2 h-4 w-4" /> Estadísticas</Button></Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center py-10 space-y-5">
      <div className="text-7xl mb-2">📝</div>
      <h1 className="text-2xl font-space font-bold">Diario de Reflexión</h1>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xl font-bold text-primary">{accuracy}%</p>
          <p className="text-xs text-muted-foreground">Precisión</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xl font-bold text-green-500">{stats.correct}/{stats.total}</p>
          <p className="text-xs text-muted-foreground">Correctas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xl font-bold text-yellow-500">+{stats.xp}</p>
          <p className="text-xs text-muted-foreground">XP</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">¿Qué fue lo más difícil hoy? (opcional)</p>
      <Textarea value={reflection} onChange={e => setReflection(e.target.value)}
        placeholder="Escribe tu reflexión..." className="rounded-xl min-h-[80px]" />
      <Button onClick={handleSave} className="rounded-xl w-full" size="lg" disabled={saving}>
        {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Trophy className="mr-2 h-4 w-4" />}
        Finalizar y ver resultados
      </Button>
    </div>
  );
}
