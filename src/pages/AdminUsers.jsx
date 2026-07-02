import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Shield, ShieldOff, Search, Mail, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminUsers() {
  const { user } = useOutletContext() as any;
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await base44.entities.UserProfile.list('-created_date', 500);
      setProfiles(p || []);
    } catch (err) {
      toast.error('Error cargando usuarios: ' + err.message);
    }
    setLoading(false);
  };

  if (user?.role !== 'admin') return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-muted-foreground">Solo el Administrador puede acceder a esta sección.</p>
    </div>
  );

  const makeMentor = async (p) => {
    try {
      await base44.entities.UserProfile.update(p.id, { role: 'mentor' });
      toast.success(`${p.display_name} es ahora Mentor`);
      loadData();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const removeRole = async (p) => {
    try {
      await base44.entities.UserProfile.update(p.id, { role: 'user' });
      toast.success(`${p.display_name} ya no es Mentor`);
      loadData();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const deleteUser = async (p) => {
    try {
      await base44.entities.UserProfile.delete(p.id);
      toast.success('Usuario eliminado');
      setConfirm(null);
      loadData();
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
      setConfirm(null);
    }
  };

  const filtered = profiles.filter(p =>
    p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-space font-bold">👥 Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">{profiles.length} usuarios registrados</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl gap-2">
          <RefreshCw className="h-3.5 w-3.5" />Actualizar
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email..." className="pl-9 rounded-xl" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No hay usuarios</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{p.avatar_emoji || '👤'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{p.display_name || 'Sin nombre'}</p>
                  {p.role === 'admin'  && <Badge className="bg-red-500 text-white text-xs">Admin</Badge>}
                  {p.role === 'mentor' && <Badge className="bg-blue-500 text-white text-xs">Mentor</Badge>}
                  {(!p.role || p.role === 'user') && <Badge variant="outline" className="text-xs">Usuario</Badge>}
                </div>
                {p.email ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3 shrink-0" />{p.email}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 mt-0.5 italic">email pendiente de sincronizar</p>
                )}
                <p className="text-xs text-muted-foreground">Nv.{p.level || 1} • {p.xp || 0} XP</p>
              </div>
              {p.role !== 'admin' && (
                <div className="flex gap-2 shrink-0">
                  {(!p.role || p.role === 'user') ? (
                    <Button size="sm" variant="outline" onClick={() => makeMentor(p)} className="rounded-xl text-blue-500 border-blue-400/30 hover:bg-blue-500/10">
                      <Shield className="mr-1 h-3 w-3" />Mentor
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => removeRole(p)} className="rounded-xl">
                      <ShieldOff className="mr-1 h-3 w-3" />Quitar
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => setConfirm(p)} className="rounded-xl">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>⚠️ Eliminar Usuario</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">
            ¿Estás seguro de que quieres eliminar a <strong className="text-foreground">{confirm?.display_name}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirm(null)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteUser(confirm)} className="flex-1 rounded-xl">Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
