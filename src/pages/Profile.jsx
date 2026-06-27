import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, Save, X } from 'lucide-react';
import { toast } from "sonner";
import { AVATAR_EMOJIS as EMOJIS } from '../lib/emojis';

const leagueConfig = {
  bronze: { name: 'Bronce', emoji: '🥉' }, silver: { name: 'Plata', emoji: '🥈' },
  gold: { name: 'Oro', emoji: '🥇' }, platinum: { name: 'Platino', emoji: '💎' },
  diamond: { name: 'Diamante', emoji: '💠' }, master: { name: 'Maestro', emoji: '👑' },
};

const ACHIEVEMENT_LABELS = {
  first_session: '🎯 Primera sesión', streak_7: '🔥 Racha 7 días', streak_30: '🏆 Racha 30 días',
  accuracy_90: '🎯 90% precisión', total_100: '📚 100 preguntas', duel_winner: '⚔️ Primer duelo ganado',
  elaboration_published: '💡 Primera elaboración', tournament_winner: '🏟️ Primer torneo ganado',
};

export default function Profile() {
  const { profile, setProfile } = useOutletContext();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: profile?.display_name || '', description: profile?.description || '', avatar_emoji: profile?.avatar_emoji || '🧠' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const accuracy = profile.total_questions_answered > 0
    ? Math.round((profile.total_correct / profile.total_questions_answered) * 100) : 0;
  const league = leagueConfig[profile.league || 'bronze'];
  const xpForLevel = (profile.level || 1) * 100;
  const xpProgress = profile.xp ? (profile.xp % xpForLevel) / xpForLevel * 100 : 0;

  const save = async () => {
    setSaving(true);
    await base44.entities.UserProfile.update(profile.id, form);
    setProfile({ ...profile, ...form });
    setEditing(false);
    setSaving(false);
    toast.success('Perfil actualizado');
  };

  const stats = [
    { label: 'XP Total', value: profile.xp || 0, emoji: '⚡' },
    { label: 'Nivel', value: profile.level || 1, emoji: '🌟' },
    { label: 'Precisión', value: `${accuracy}%`, emoji: '🎯' },
    { label: 'Racha', value: `${profile.streak_days || 0}d`, emoji: '🔥' },
    { label: 'Sesiones', value: profile.total_sessions || 0, emoji: '📚' },
    { label: 'Sables', value: profile.sabers || 0, emoji: '⚔️' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="text-6xl cursor-pointer hover:scale-110 transition-transform"
              onClick={() => editing && setShowEmojiPicker(true)}
            >
              {editing ? form.avatar_emoji : profile.avatar_emoji}
              {editing && <span className="text-xs block text-center text-muted-foreground">✏️</span>}
            </div>
            <div>
              {editing ? (
                <Input value={form.display_name} onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))} className="rounded-xl font-semibold text-lg mb-2" />
              ) : (
                <h2 className="text-xl font-bold">{profile.display_name}</h2>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{league.emoji} Liga {league.name}</span>
                <span>•</span>
                <span>Nv. {profile.level || 1}</span>
              </div>
            </div>
          </div>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)} className="rounded-xl" size="sm"><Edit2 className="mr-2 h-3 w-3" />Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)} size="sm" className="rounded-xl"><X className="h-4 w-4" /></Button>
              <Button onClick={save} size="sm" className="rounded-xl" disabled={saving}><Save className="mr-1 h-4 w-4" />Guardar</Button>
            </div>
          )}
        </div>

        {/* XP bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">XP</span>
            <span className="font-medium">{profile.xp || 0} / {xpForLevel}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>

        {/* Description */}
        {editing ? (
          <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Cuéntanos sobre ti..." className="rounded-xl" rows={3} />
        ) : (
          profile.description && <p className="text-sm text-muted-foreground">{profile.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <p className="font-bold text-lg">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">🏅 Logros</h3>
        {profile.achievements?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.achievements.map(a => (
              <span key={a} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                {ACHIEVEMENT_LABELS[a] || a}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Completa sesiones para desbloquear logros</p>
        )}
      </div>

      {/* Easter eggs */}
      {profile.easter_eggs?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">🥚 Easter Eggs Descubiertos</h3>
          <div className="flex flex-wrap gap-2">
            {profile.easter_eggs.map(e => <span key={e} className="bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-medium">{e}</span>)}
          </div>
        </div>
      )}

      {/* Emoji picker dialog */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-card rounded-2xl p-4 max-w-sm w-full max-h-[60vh]" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Elige tu avatar</h3>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-8 gap-2">
                {EMOJIS.map(e => (
                  <button key={e} className={`text-2xl p-1 rounded-lg hover:bg-muted transition-all ${form.avatar_emoji === e ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                    onClick={() => { setForm(prev => ({ ...prev, avatar_emoji: e })); setShowEmojiPicker(false); }}>
                    {e}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
