import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Shield, ShieldOff, Search } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminUsers() {
  const { user } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    const [u, p] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.UserProfile.list(),
    ]);
    setUsers(u);
    setProfiles(p);
    setLoading(false);
  };

  if (user?.role !== 'admin') return (
    <div className="text-center py-20"><div className="text-5xl mb-4">🔒</div><p className="text-muted-foreground">Solo el Administrador puede acceder a esta sección.</p></div>
  );

  const getProfile = (userId) => profiles.find(p => p.user_id === userId);

  const makeMentor = async (u) => {
    // Update role via User entity
    await base44.entities.User.update(u.id, { role: 'mentor' });
    toast.success(`${u.full_name} es ahora Mentor`);
    loadData();
  };

  const removeRole = async (u) => {
    await base44.entities.User.update(u.id, { role: 'user' });
    toast.success(`${u.full_name} ya no es Mentor`);
    loadData();
  };

  const deleteUser = async (u) => {
    const profile = getProfile(u.id);
    if (profile) await base44.entities.UserProfile.delete(profile.id);
    toast.success('Usuario eliminado');
    setConfirm(null);
    loadData();
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-space font-bold mb-6">👥 Gestión de Usuarios</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuarios..." className="pl-9 rounded-xl" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const profile = getProfile(u.id);
            return (
              <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">{profile?.avatar_emoji || '👤'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{u.full_name || 'Sin nombre'}</p>
                    {u.role === 'admin' && <Badge className="bg-red-500 text-white text-xs">Admin</Badge>}
                    {u.role === 'mentor' && <Badge className="bg-blue-500 text-white text-xs">Mentor</Badge>}
                    {u.role === 'user' && <Badge variant="outline" className="text-xs">Usuario</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {profile && <p className="text-xs text-muted-foreground">Nv.{profile.level || 1} • {profile.xp || 0} XP</p>}
                </div>
                {u.role !== 'admin' && (
                  <div className="flex gap-2 shrink-0">
                    {u.role !== 'mentor' ? (
                      <Button size="sm" variant="outline" onClick={() => makeMentor(u)} className="rounded-xl">
                        <Shield className="mr-1 h-3 w-3" />Mentor
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => removeRole(u)} className="rounded-xl">
                        <ShieldOff className="mr-1 h-3 w-3" />Quitar
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setConfirm(u)} className="rounded-xl">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>⚠️ Eliminar Usuario</DialogTitle></DialogHeader>
          <p className="text-sm">¿Estás seguro de que quieres eliminar a <strong>{confirm?.full_name}</strong>? Esta acción no se puede deshacer.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirm(null)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteUser(confirm)} className="flex-1 rounded-xl">Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
