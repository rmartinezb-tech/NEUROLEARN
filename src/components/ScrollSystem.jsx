import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";

const SCROLL_MILESTONES = [10, 13, 16, 18, 20];

export default function ScrollSystem({ profile, onClose }) {
  const [mode, setMode] = useState('prompt'); // prompt, send, received, evaluate
  const [scrolls, setScrolls] = useState([]);
  const [pendingReceived, setPendingReceived] = useState(null);
  const [content, setContent] = useState('');
  const [stars, setStars] = useState(0);
  const [sending, setSending] = useState(false);

  const achievements = profile?.achievements || [];
  const achievementCount = achievements.length;
  const milestoneHit = SCROLL_MILESTONES.find(m => m === achievementCount);

  useEffect(() => {
    loadScrolls();
  }, []);

  const loadScrolls = async () => {
    const [sent, received] = await Promise.all([
      base44.entities.Scroll.filter({ sender_id: profile.user_id }),
      base44.entities.Scroll.filter({ receiver_id: profile.user_id }),
    ]);
    setScrolls(sent);
    const pending = received.find(s => s.status === 'pending');
    if (pending) {
      setPendingReceived(pending);
      setMode('received');
    }
  };

  const hasSentForMilestone = scrolls.some(s => s.sender_milestone === milestoneHit);
  const neverSend = scrolls.some(s => s.never_send);
  const hasActiveSent = scrolls.find(s => s.status === 'pending');

  const sendScroll = async () => {
    if (!content.trim()) return;
    setSending(true);
    // Get random user (exclude self)
    const allProfiles = await base44.entities.UserProfile.list();
    const others = allProfiles.filter(p => p.user_id !== profile.user_id);
    if (others.length === 0) { toast.error('No hay otros usuarios'); setSending(false); return; }
    const receiver = others[Math.floor(Math.random() * others.length)];
    
    await base44.entities.Scroll.create({
      sender_id: profile.user_id,
      receiver_id: receiver.user_id,
      content,
      status: 'pending',
      sender_milestone: milestoneHit,
    });
    // Notify receiver
    await base44.entities.Notification.create({
      user_id: receiver.user_id, type: 'system',
      title: '📜 ¡Has recibido un Pergamino Secreto!',
      message: 'Alguien ha compartido un tip de estudio contigo',
      is_read: false,
    });
    toast.success('Pergamino enviado 📜');
    setSending(false);
    onClose();
  };

  const evaluateScroll = async (starCount) => {
    if (!pendingReceived) return;
    await base44.entities.Scroll.update(pendingReceived.id, { status: 'evaluated', stars_given: starCount });
    
    // XP for evaluator
    await base44.entities.UserProfile.update(profile.id, { xp: (profile.xp || 0) + 50 });

    if (starCount >= 3) {
      const senderProfile = await base44.entities.UserProfile.filter({ user_id: pendingReceived.sender_id });
      if (senderProfile.length > 0) {
        const elabPoints = starCount === 3 ? 10 : starCount === 4 ? 20 : 20;
        await base44.entities.UserProfile.update(senderProfile[0].id, {
          elaboration_points: (senderProfile[0].elaboration_points || 0) + elabPoints,
        });
        await base44.entities.Notification.create({
          user_id: pendingReceived.sender_id, type: 'system',
          title: `📜 Tu Pergamino fue evaluado con ${starCount}⭐`,
          message: `Recibiste ${elabPoints} puntos de elaboración`,
          is_read: false,
        });
      }
    }
    toast.success('+50 XP por evaluar el pergamino');
    onClose();
  };

  const skipForever = async () => {
    await base44.entities.Scroll.create({ sender_id: profile.user_id, receiver_id: 'none', content: '', never_send: true, status: 'ignored' });
    onClose();
  };

  if (mode === 'received' && pendingReceived) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-amber-950 border-2 border-amber-600 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-7xl mb-4 animate-float">📜</div>
          <h2 className="text-2xl font-bold text-amber-200 mb-2">¡HAS RECIBIDO UN PERGAMINO SECRETO!</h2>
          <p className="text-amber-300/70 text-sm mb-6">Un compañero anónimo compartió un tip de estudio contigo</p>
          <div className="bg-amber-900/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-100 text-sm">{pendingReceived.content}</p>
          </div>
          <p className="text-amber-300/70 text-xs mb-4">Evalúa el pergamino (recibe +50 XP sin importar la calificación)</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setStars(s)} className={`text-3xl transition-transform hover:scale-125 ${s <= stars ? 'opacity-100' : 'opacity-30'}`}>⭐</button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl border-amber-600 text-amber-200">No evaluar</Button>
            <Button onClick={() => evaluateScroll(stars)} className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500" disabled={stars === 0}>Evaluar</Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (!milestoneHit || hasSentForMilestone || neverSend) return null;

  if (mode === 'prompt') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-amber-950 border-2 border-amber-600 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-7xl mb-4 animate-float">📜</div>
          <h2 className="text-2xl font-bold text-amber-200 mb-2">¿Quieres enviar un Pergamino?</h2>
          <p className="text-amber-300/70 text-sm mb-6">Has alcanzado {milestoneHit} logros. Puedes compartir un tip de estudio anónimo con alguien del sistema.</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setMode('send')} className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white">Enviar un Pergamino 📜</Button>
            <Button variant="outline" onClick={onClose} className="rounded-xl border-amber-600 text-amber-200">No por ahora</Button>
            <Button variant="ghost" onClick={skipForever} className="rounded-xl text-amber-300/50 text-xs">Nunca enviar pergaminos</Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-amber-950 border-2 border-amber-600 rounded-2xl p-8 max-w-md w-full">
        <div className="text-5xl mb-3 text-center">📜</div>
        <h2 className="text-xl font-bold text-amber-200 mb-2 text-center">Escribe tu Pergamino</h2>
        <p className="text-amber-300/70 text-xs text-center mb-4">Tu tip llegará anónimamente a otro usuario</p>
        <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Comparte un consejo de estudio que te haya funcionado..." className="bg-amber-900/50 border-amber-700 text-amber-100 rounded-xl mb-4 min-h-[120px]" />
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setMode('prompt')} className="flex-1 rounded-xl border-amber-600 text-amber-200">Volver</Button>
          <Button onClick={sendScroll} disabled={!content.trim() || sending} className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500">
            {sending ? '...' : 'Enviar 📜'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
