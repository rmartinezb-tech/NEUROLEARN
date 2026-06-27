import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from 'lucide-react';
import { toast } from "sonner";
import ThemeSelector from '../components/ThemeSelector';
import { loadSavedTheme } from '../utils/themes';

export default function Settings() {
  const { profile, setProfile } = useOutletContext();
  const [goals, setGoals] = useState({
    sessions_target: profile?.weekly_goals?.sessions_target || 5,
    questions_target: profile?.weekly_goals?.questions_target || 50,
    minutes_target: profile?.weekly_goals?.minutes_target || 120,
  });
  const [sound, setSound] = useState(profile?.sound_enabled ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const data = { sound_enabled: sound, weekly_goals: goals };
    await base44.entities.UserProfile.update(profile.id, data);
    setProfile({ ...profile, ...data });
    toast.success('Configuración guardada');
    setSaving(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-space font-bold">⚙️ Configuración</h1>

      {/* Weekly goals */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">🎯 Metas Semanales</h3>
        <div className="space-y-4">
          {[
            { key: 'sessions_target', label: 'Sesiones por semana', min: 1, max: 30 },
            { key: 'questions_target', label: 'Preguntas por semana', min: 10, max: 500 },
            { key: 'minutes_target', label: 'Minutos de estudio por semana', min: 10, max: 1000 },
          ].map(g => (
            <div key={g.key}>
              <Label>{g.label}</Label>
              <Input type="number" value={goals[g.key]} onChange={e => setGoals(prev => ({ ...prev, [g.key]: parseInt(e.target.value) || g.min }))} min={g.min} max={g.max} className="mt-1 rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Appearance / Theme */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">🎨 Apariencia</h3>
        <ThemeSelector profile={profile} />
        <div className="flex items-center justify-between mt-4">
          <Label>Sonidos activados</Label>
          <Switch checked={sound} onCheckedChange={setSound} />
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/30 rounded-xl p-5">
        <h3 className="font-semibold mb-2 text-destructive">⚠️ Zona de peligro</h3>
        <p className="text-sm text-muted-foreground mb-3">Cerrar sesión en todos los dispositivos</p>
        <Button variant="destructive" onClick={() => base44.auth.logout('/landing')} className="rounded-xl">Cerrar sesión</Button>
      </div>

      <Button onClick={save} className="w-full rounded-xl" size="lg" disabled={saving}>
        {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar Configuración
      </Button>
    </div>
  );
}
