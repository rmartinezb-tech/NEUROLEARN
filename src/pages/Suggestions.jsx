import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, Check, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { motion } from 'framer-motion';

export default function Suggestions() {
  const { profile, user } = useOutletContext();
  const [suggestions, setSuggestions] = useState([]);
  const [text, setText] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [loading, setLoading] = useState(true);

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  useEffect(() => { load(); }, []);

  const load = async () => {
    let all;
    if (isAdminOrMentor) {
      all = await base44.entities.Suggestion.list('-created_date', 50);
    } else {
      all = await base44.entities.Suggestion.filter({ sender_id: profile.user_id }, '-created_date', 50);
    }
    setSuggestions(all);
    setLoading(false);
  };

  const send = async () => {
    if (!text.trim()) return;
    await base44.entities.Suggestion.create({
      sender_id: profile.user_id,
      sender_name: profile.display_name,
      sender_avatar: profile.avatar_emoji,
      message: text,
      status: 'pending',
      is_private: true,
    });
    toast.success('Sugerencia enviada 💭');
    setText('');
    load();
  };

  const reply = async (s) => {
    const r = replyTexts[s.id];
    if (!r?.trim()) return;
    await base44.entities.Suggestion.update(s.id, {
      reply: r,
      replied_by: profile.display_name,
      status: 'replied',
    });
    // Notify sender
    await base44.entities.Notification.create({
      user_id: s.sender_id,
      type: 'system',
      title: '💭 Tu sugerencia fue respondida',
      message: `${profile.display_name} respondió a tu sugerencia`,
      is_read: false,
    });
    setReplyTexts(prev => ({ ...prev, [s.id]: '' }));
    toast.success('Respuesta enviada');
    load();
  };

  const resolve = async (s) => {
    await base44.entities.Suggestion.update(s.id, { status: 'resolved' });
    toast.success('Sugerencia marcada como resuelta');
    load();
  };

  const statusColor = { pending: 'bg-yellow-500/10 text-yellow-500', replied: 'bg-green-500/10 text-green-500', resolved: 'bg-muted text-muted-foreground' };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-3">💭 Sugerencias</h1>
        <p className="text-muted-foreground mt-1">Envía sugerencias privadas a los mentores y admin</p>
      </motion.div>

      {/* Send new suggestion */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium">Nueva sugerencia</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe tu sugerencia aquí... (es privada, solo la verán admin y mentores)"
          className="w-full bg-muted rounded-xl p-3 text-sm resize-none border border-border focus:outline-none focus:border-primary min-h-[80px]"
        />
        <Button onClick={send} disabled={!text.trim()} className="gap-2 w-full">
          <Send className="h-4 w-4" /> Enviar sugerencia
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="text-4xl mb-3">💭</div>
          <p className="text-muted-foreground">No hay sugerencias aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.sender_avatar || '👤'}</span>
                  <div>
                    <p className="font-medium text-sm">{s.sender_name}</p>
                    <p className="text-xs text-muted-foreground">{moment(s.created_date).fromNow()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[s.status]}`}>{s.status}</span>
              </div>
              <p className="text-sm bg-muted rounded-lg p-3">{s.message}</p>

              {s.reply && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs text-primary font-medium mb-1">Respuesta de {s.replied_by}:</p>
                  <p className="text-sm">{s.reply}</p>
                </div>
              )}

              {isAdminOrMentor && !s.reply && (
                <div className="flex gap-2">
                  <textarea
                    value={replyTexts[s.id] || ''}
                    onChange={e => setReplyTexts(prev => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Escribe una respuesta privada..."
                    className="flex-1 bg-muted rounded-xl p-2 text-sm resize-none border border-border focus:outline-none focus:border-primary min-h-[60px]"
                  />
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => reply(s)} disabled={!replyTexts[s.id]?.trim()}><Send className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}

              {isAdminOrMentor && (
                <Button size="sm" variant="outline" className="gap-2 text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => resolve(s)}>
                  <Check className="h-3 w-3" /> Marcar como resuelto
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
