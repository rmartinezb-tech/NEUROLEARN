import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Plus, Users, Clock } from 'lucide-react';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Tournaments() {
  const { profile, user } = useOutletContext();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  useEffect(() => { loadTournaments(); }, []);

  const loadTournaments = async () => {
    const t = await base44.entities.Tournament.list('-created_date', 20);
    setTournaments(t);
    setLoading(false);
  };

  const createTournament = async () => {
    if (!newName.trim()) return;
    const allQ = await base44.entities.Question.list('-created_date', 500);
    const eligible = allQ.filter(q => !['development', 'clinical_case'].includes(q.type));
    const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 30);
    
    await base44.entities.Tournament.create({
      name: newName,
      status: 'registration',
      players: [],
      questions: shuffled.map(q => q.id),
      min_questions: 30,
      results_published: false,
    });
    toast.success('Torneo creado');
    setShowCreate(false);
    setNewName('');
    loadTournaments();
  };

  const joinTournament = async (t) => {
    const players = t.players || [];
    if (players.length >= 10) { toast.error('Torneo lleno (10/10)'); return; }
    if (players.find(p => p.user_id === profile.user_id)) { toast.error('Ya estás registrado'); return; }
    players.push({ user_id: profile.user_id, display_name: profile.display_name, score: 0, accuracy: 0, avg_time: 0, completed: false });
    await base44.entities.Tournament.update(t.id, { players });
    toast.success('¡Registrado en el torneo!');
    loadTournaments();
  };

  const statusColors = { registration: 'bg-blue-500', in_progress: 'bg-yellow-500', completed: 'bg-green-500' };
  const statusLabels = { registration: 'Registro', in_progress: 'En Curso', completed: 'Completado' };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-space font-bold">🏟️ Torneos</h1>
          <p className="text-sm text-muted-foreground">10 jugadores • 30 preguntas • 5 seg por pregunta</p>
        </div>
        {isAdminOrMentor && (
          <Button onClick={() => setShowCreate(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Crear Torneo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="text-5xl mb-3">🏟️</div>
          <p className="text-muted-foreground">No hay torneos disponibles</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const playerCount = t.players?.length || 0;
            const isRegistered = t.players?.find(p => p.user_id === profile.user_id);
            return (
              <div key={t.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{t.name}</h3>
                      <Badge className={`${statusColors[t.status]} text-white text-xs`}>{statusLabels[t.status]}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {playerCount}/10</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.min_questions || 30} preguntas</span>
                    </div>
                  </div>
                  {t.status === 'registration' && !isRegistered && (
                    <Button onClick={() => joinTournament(t)} className="rounded-xl" size="sm">Unirse</Button>
                  )}
                  {isRegistered && t.status === 'registration' && <Badge variant="outline">Registrado ✅</Badge>}
                </div>

                {t.status === 'completed' && t.players?.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-semibold mb-2">Resultados:</p>
                    {[...t.players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, i) => (
                      <div key={p.user_id} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-center font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                        <span className="flex-1">{p.display_name}</span>
                        <span className="font-mono">{p.score || 0} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crear Torneo 🏟️</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del torneo</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Torneo Final" className="mt-1 rounded-xl" />
            </div>
            <Button onClick={createTournament} className="w-full rounded-xl" disabled={!newName.trim()}>Crear Torneo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
