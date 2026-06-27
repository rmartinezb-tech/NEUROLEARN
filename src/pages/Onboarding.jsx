import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATAR_EMOJIS } from '../lib/emojis';
import { ArrowRight, Check, Search } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);

  useEffect(() => {
    async function check() {
      try {
        const me = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: me.id });
        if (profiles.length > 0 && profiles[0].onboarding_complete) {
          navigate('/');
          return;
        }
        if (profiles.length > 0) setExistingProfile(profiles[0]);
      } catch {}
    }
    check();
  }, [navigate]);

  const handleComplete = async () => {
    if (!name.trim() || !avatar) return;
    setLoading(true);
    const me = await base44.auth.me();
    const data = {
      user_id: me.id,
      display_name: name.trim(),
      description: description.trim(),
      avatar_emoji: avatar,
      onboarding_complete: true,
      xp: 0, level: 1, streak_days: 0, sabers: 0,
      league: 'bronze',
      evocation_points: 0, elaboration_points: 0,
      clinical_correct_count: 0, development_correct_count: 0,
      total_sessions: 0, total_questions_answered: 0, total_correct: 0,
      interleaved_sessions: 0, unique_study_days: 0,
      achievements: [], easter_eggs: [],
      theme: 'dark', sound_enabled: true,
      difficulty_ratings: {},
      dashboard_layout: ['forgetting_curve', 'heatmap', 'skill_map', 'ranking', 'achievements', 'sessions'],
      is_online: true, last_active: new Date().toISOString(),
    };

    if (existingProfile) {
      await base44.entities.UserProfile.update(existingProfile.id, data);
    } else {
      await base44.entities.UserProfile.create(data);
    }

    // Set role: first user is admin
    const allProfiles = await base44.entities.UserProfile.list();
    if (allProfiles.length <= 1) {
      await base44.auth.updateMe({ role: 'admin' });
    }

    window.location.href = '/';
  };

  const filteredEmojis = search ? AVATAR_EMOJIS.filter(e => e.includes(search)) : AVATAR_EMOJIS;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 rounded-full transition-all ${s <= step ? 'bg-primary w-12' : 'bg-border w-8'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 animate-float">👋</div>
                <h1 className="text-3xl font-space font-bold">¡Bienvenido a NeuroLearn!</h1>
                <p className="text-muted-foreground mt-2">¿Cómo te llamas?</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <Label>Nombre de pila</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" className="mt-2 rounded-xl text-lg py-6" autoFocus />
                <Button onClick={() => name.trim() && setStep(2)} className="w-full mt-4 py-5 rounded-xl" disabled={!name.trim()}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📝</div>
                <h1 className="text-3xl font-space font-bold">Cuéntanos sobre ti</h1>
                <p className="text-muted-foreground mt-2">Una breve descripción (opcional)</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Estudiante de medicina, apasionado por la neurociencia..." className="mt-2 rounded-xl min-h-[100px]" />
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-5 rounded-xl">Atrás</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 py-5 rounded-xl">
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{avatar || '🎭'}</div>
                <h1 className="text-3xl font-space font-bold">Elige tu avatar</h1>
                <p className="text-muted-foreground mt-2">Selecciona un emoji que te represente</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar emoji..." className="pl-10 rounded-xl" />
                </div>
                <div className="mb-3 p-3 bg-muted/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">¿Quieres que el destino escoja por ti?</p>
                    <p className="text-xs text-muted-foreground">El universo tiene un emoji para ti</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const random = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
                    setAvatar(random);
                  }} className="gap-2 shrink-0">🎲 ¡Que decida el destino!</Button>
                </div>
                <ScrollArea className="h-64 rounded-xl border p-2">
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                    {filteredEmojis.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => setAvatar(emoji)}
                        className={`text-2xl p-1.5 rounded-lg hover:bg-primary/10 transition-all ${avatar === emoji ? 'bg-primary/20 ring-2 ring-primary scale-110' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 py-5 rounded-xl">Atrás</Button>
                  <Button onClick={handleComplete} className="flex-1 py-5 rounded-xl" disabled={!avatar || loading}>
                    {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="mr-2 h-4 w-4" />¡Listo!</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
