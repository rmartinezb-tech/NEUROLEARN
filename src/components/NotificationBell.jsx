import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import moment from 'moment';

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const notifs = await base44.entities.Notification.filter({ user_id: userId }, '-created_date', 20);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, [userId]);

  const markRead = async (notif) => {
    if (!notif.is_read) {
      await base44.entities.Notification.update(notif.id, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleOpen = (val) => {
    setOpen(val);
    if (val) markAllRead();
  };

  const typeIcon = {
    duel_challenge: '🤺', duel_result: '⚔️', tournament: '🏟️',
    elaboration_vote: '👍', elaboration_comment: '💬',
    achievement: '🏆', easter_egg: '🥚', system: '🔔'
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-xl" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin notificaciones</p>
          ) : (
            notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => markRead(notif)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{typeIcon[notif.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.is_read ? 'font-semibold' : ''}`}>{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{moment(notif.created_date).fromNow()}</p>
                  </div>
                  {!notif.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
