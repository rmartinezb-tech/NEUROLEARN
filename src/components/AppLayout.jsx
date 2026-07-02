import { useState, useEffect, useRef } from 'react';
import { applyTheme, loadSavedTheme } from '../utils/themes';
import { supabase } from '@/api/supabaseClient';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, BookOpen, Swords, Trophy, MessageSquare, BarChart3,
  Settings, LogOut, Bell, Search, Menu, X, Users, Flag, FileUp, Brain,
  Zap, Home, Bot, Heart, Calendar, TrendingUp, Lightbulb
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import NotificationBell from './NotificationBell';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/study', icon: BookOpen, label: 'Estudiar' },
  { path: '/questions', icon: Brain, label: 'Banco de Preguntas' },
  { path: '/duels', icon: Swords, label: 'Duelos 🤺' },
  { path: '/tournaments', icon: Trophy, label: 'Torneos 🏟️' },
  { path: '/elaboration', icon: Lightbulb, label: 'Concurso 💡' },
  { path: '/study-rooms', icon: Home, label: 'Salas de Estudio 🏠' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics 📊' },
  { path: '/rankings', icon: Users, label: 'Ranking 🥇' },
  { path: '/willie', icon: Bot, label: 'WILLIE 🐥' },
  { path: '/wellbeing', icon: Heart, label: 'Bienestar ❤️' },
  { path: '/calendar', icon: Calendar, label: 'Calendario 🗓️' },

  { path: '/library', icon: BookOpen, label: 'Biblioteca 🏛️' },
  { path: '/suggestions', icon: MessageSquare, label: 'Sugerencias 💭' },
];

const adminItems = [
  { path: '/import', icon: FileUp, label: 'Importar Preguntas 📥' },
  { path: '/ai-generate', icon: Zap, label: 'Generar con IA ✨' },
  { path: '/reports', icon: Flag, label: 'Reportes 🚩' },
  { path: '/admin-users', icon: Users, label: 'Usuarios 👥' },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sessionTokenRef = useRef(null);

  // Cache the session JWT so the synchronous beforeunload handler can use it
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      sessionTokenRef.current = data.session?.access_token ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionTokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadSavedTheme();
    async function load() {
      const me = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: me.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        if (!p.onboarding_complete) {
          navigate('/onboarding');
          return;
        }
        // Sync email to profile on every login; also update online status
        const updates = { is_online: true, last_active: new Date().toISOString() };
        if (me.email && !p.email) updates.email = me.email;
        base44.entities.UserProfile.update(p.id, updates);

        // Role in profile takes precedence (mentor grants); fall back to auth metadata (admin)
        const effectiveRole = (p.role === 'admin' || p.role === 'mentor') ? p.role : (me.role ?? 'user');
        setUser({ ...me, role: effectiveRole });
        setProfile({ ...p, email: p.email || me.email });
        if (p.theme) applyTheme(p.theme);
      } else {
        navigate('/onboarding');
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh profile in context when StudyEngine (or anything) updates it in DB
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = base44.entities.UserProfile.subscribe((event) => {
      if (event.data?.user_id === profile.user_id) {
        setProfile(prev => prev ? { ...prev, ...event.data } : event.data);
      }
    });
    return unsub;
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat: keep last_active fresh every 30 s so other users see us as online.
  // On tab close, use fetch+keepalive (browser-guaranteed delivery even after unload).
  useEffect(() => {
    if (!profile?.id) return;

    const beat = setInterval(() => {
      base44.entities.UserProfile.update(profile.id, {
        is_online: true,
        last_active: new Date().toISOString(),
      });
    }, 30_000);

    // Synchronous handler — uses cached token so no await is needed before fetch
    const handleUnload = () => {
      const token = sessionTokenRef.current ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profile.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ is_online: false }),
          keepalive: true, // browser guarantees delivery even after page closes
        },
      );
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(beat);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  const handleLogout = () => {
    if (profile) {
      base44.entities.UserProfile.update(profile.id, { is_online: false });
    }
    base44.auth.logout('/landing');
  };

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active 
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const xpForLevel = (lvl) => lvl * 100;
  const xpProgress = profile.xp ? ((profile.xp % xpForLevel(profile.level || 1)) / xpForLevel(profile.level || 1)) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Profile section */}
        <div className="p-4 border-b border-border">
          <Link to="/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 group">
            <div className="text-3xl cursor-pointer hover:animate-glow transition-all group-hover:scale-110">
              {profile.avatar_emoji || '🧠'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{profile.display_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-primary font-medium">Nv. {profile.level || 1}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
                </div>
              </div>
            </div>
          </Link>
        </div>

        <ScrollArea className="flex-1 p-3">
          <nav className="space-y-1">
            {navItems.map(item => <NavLink key={item.path} item={item} />)}
            
            {isAdminOrMentor && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin / Mentor</p>
                </div>
                {adminItems.map(item => <NavLink key={item.path} item={item} />)}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <Link to="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Settings className="h-4 w-4" /> Configuración
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all w-full">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1">
            <Link to="/search" className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-all max-w-md">
              <Search className="h-4 w-4" />
              <span>Buscar preguntas, usuarios...</span>
              <kbd className="hidden sm:inline ml-auto text-xs bg-background px-1.5 py-0.5 rounded border">⌘K</kbd>
            </Link>
          </div>

          <NotificationBell userId={user?.id} />
          
          <Link to="/profile" className="text-2xl hover:scale-110 transition-transform cursor-pointer hover:animate-glow">
            {profile.avatar_emoji || '🧠'}
          </Link>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-6">
          <Outlet context={{ profile, user, setProfile }} />
        </div>
      </main>
    </div>
  );
}
