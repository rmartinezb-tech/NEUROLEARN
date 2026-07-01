import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Plus, Users, Clock, Play, LogIn, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import TournamentArena from '@/components/tournaments/TournamentArena';

const MAX_PLAYERS = 5;
const TOTAL_Q     = 20;
const ALLOWED_TYPES = ['true_false', 'multiple_choice', 'matching', 'order_sequence'];

const STATUS_COLOR = {
  registration: 'bg-blue-500',
  in_progress:  'bg-yellow-500',
  completed:    'bg-green-500',
};
const STATUS_LABEL = {
  registration: 'Registro abierto',
  in_progress:  'En curso',
  completed:    'Completado',
};

export default function Tournaments() {
  const { profile, user } = useOutletContext();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [newName, setNewName]         = useState('');
  const [creating, setCreating]       = useState(false);
  const [activeArena, setActiveArena] = useState(null); // tournament object when playing

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  useEffect(() => {
    loadTournaments();
    // Subscribe for real-time updates (other players joining/starting)
    const unsub = base44.entities.Tournament.subscribe(() => loadTournaments());
    return unsub;
  }, []); // eslint-disable-line

  const loadTournaments = async () => {
    try {
      const t = await base44.entities.Tournament.list('-created_date', 30);
      setTournaments(t || []);
    } catch (err) {
      console.error('[Tournaments] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const allQ = await base44.entities.Question.list('-created_date', 500);
      const eligible = allQ.filter(q => ALLOWED_TYPES.includes(q.type));
      if (eligible.length < TOTAL_Q) {
        toast.error(`No hay suficientes preguntas compatibles (${eligible.length}/${TOTAL_Q}). Se necesitan preguntas de tipo V/F, Opción múltiple, Matching o Secuencia.`);
        return;
      }
      const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, TOTAL_Q);
      await base44.entities.Tournament.create({
        name: newName.trim(),
        status: 'registration',
        players: [],
        questions: shuffled.map(q => q.id),
        min_questions: TOTAL_Q,
        results_published: false,
      });
      toast.success('Torneo creado ✅');
      setShowCreate(false);
      setNewName('');
      loadTournaments();
    } catch (err) {
      console.error('[Tournaments] create error:', err);
      toast.error('Error al crear el torneo');
    } finally {
      setCreating(false);
    }
  };

  const joinTournament = async (t) => {
    const players = t.players || [];
    if (players.length >= MAX_PLAYERS) { toast.error(`Torneo lleno (${MAX_PLAYERS}/${MAX_PLAYERS})`); return; }
    if (players.find(p => p.user_id === profile.user_id)) { toast.error('Ya estás registrado'); return; }
    try {
      const updated = [...players, {
        user_id: profile.user_id,
        display_name: profile.display_name,
        score: 0, accuracy: 0, avg_time: 0, completed: false,
      }];
      await base44.entities.Tournament.update(t.id, { players: updated });
      toast.success('¡Registrado en el torneo! 🏟️');
      loadTournaments();
    } catch (err) {
      toast.error('Error al unirse al torneo');
    }
  };

  const startTournament = async (t) => {
    if ((t.players || []).length < 2) { toast.error('Se necesitan mínimo 2 jugadores para iniciar'); return; }
    try {
      await base44.entities.Tournament.update(t.id, {
        status: 'in_progress',
        started_by: profile.user_id,
      });
      toast.success('¡Torneo iniciado! Los jugadores pueden comenzar.');
      loadTournaments();
    } catch (err) {
      toast.error('Error al iniciar el torneo');
    }
  };

  const deleteTournament = async (t) => {
    if (!window.confirm(`¿Eliminar el torneo "${t.name}"?`)) return;
    try {
      await base44.entities.Tournament.delete(t.id);
      setTournaments(prev => prev.filter(x => x.id !== t.id));
      toast.success('Torneo eliminado');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  // ── Arena mode ────────────────────────────────────────────────────────────
  if (activeArena) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setActiveArena(null); loadTournaments(); }}
            className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold">🏟️ {activeArena.name}</h1>
            <p className="text-xs text-muted-foreground">{TOTAL_Q} preguntas · 60 segundos c/u</p>
          </div>
        </div>
        <TournamentArena
          tournament={activeArena}
          profile={profile}
          onFinish={() => { setActiveArena(null); loadTournaments(); }}
        />
      </div>
    );
  }

  // ── Tournament list ───────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-space font-bold">🏟️ Torneos</h1>
          <p className="text-sm text-muted-foreground">
            Máx. {MAX_PLAYERS} jugadores · {TOTAL_Q} preguntas · 60 seg/pregunta
          </p>
        </div>
        {isAdminOrMentor && (
          <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Crear torneo
          </Button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="text-5xl mb-3">🏟️</div>
          <p className="text-muted-foreground">No hay torneos disponibles</p>
          {isAdminOrMentor && (
            <Button className="mt-4 rounded-xl" onClick={() => setShowCreate(true)}>Crear el primero</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const players    = t.players || [];
            const isJoined   = players.find(p => p.user_id === profile.user_id);
            const isFull     = players.length >= MAX_PLAYERS;
            const myEntry    = players.find(p => p.user_id === profile.user_id);
            const myCompleted = myEntry?.completed;

            return (
              <motion.div key={t.id} whileHover={{ y: -1 }}
                className="bg-card border border-border rounded-xl p-5 space-y-4">

                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold truncate">{t.name}</h3>
                      <Badge className={`${STATUS_COLOR[t.status]} text-white text-xs shrink-0`}>
                        {STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{players.length}/{MAX_PLAYERS}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{TOTAL_Q} preguntas</span>
                      <span className="flex items-center gap-1">🕐 60s/pregunta</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {/* Join (registration phase) */}
                    {t.status === 'registration' && !isJoined && !isFull && (
                      <Button size="sm" onClick={() => joinTournament(t)} className="rounded-xl gap-1.5">
                        <LogIn className="h-3.5 w-3.5" /> Unirse
                      </Button>
                    )}
                    {t.status === 'registration' && !isJoined && isFull && (
                      <Badge variant="outline" className="text-xs">Lleno</Badge>
                    )}
                    {t.status === 'registration' && isJoined && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">✅ Registrado</Badge>
                    )}

                    {/* Admin start */}
                    {isAdminOrMentor && t.status === 'registration' && (
                      <Button size="sm" variant="outline" onClick={() => startTournament(t)} className="rounded-xl gap-1.5">
                        <Play className="h-3.5 w-3.5" /> Iniciar
                      </Button>
                    )}

                    {/* Enter arena */}
                    {t.status === 'in_progress' && isJoined && !myCompleted && (
                      <Button size="sm" onClick={() => setActiveArena(t)} className="rounded-xl gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black">
                        <Trophy className="h-3.5 w-3.5" /> Competir
                      </Button>
                    )}
                    {t.status === 'in_progress' && isJoined && myCompleted && (
                      <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">⏳ Esperando otros</Badge>
                    )}

                    {/* Admin delete */}
                    {isAdminOrMentor && (
                      <Button size="sm" variant="ghost" className="rounded-xl text-destructive h-8 w-8 p-0"
                        onClick={() => deleteTournament(t)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Players list */}
                {players.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Jugadores</p>
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => (
                        <div key={p.user_id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                          p.completed ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          <span>{p.display_name}</span>
                          {p.completed && <span>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed: results */}
                {t.status === 'completed' && players.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultados finales</p>
                    {[...players]
                      .sort((a, b) => b.score !== a.score ? b.score - a.score : a.avg_time - b.avg_time)
                      .map((p, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                        const isMe  = p.user_id === profile.user_id;
                        return (
                          <div key={p.user_id} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${isMe ? 'bg-primary/5' : ''}`}>
                            <span className="w-7 text-center">{medal}</span>
                            <span className={`flex-1 ${isMe ? 'font-bold' : ''}`}>{p.display_name}</span>
                            <span className="font-mono text-xs">{p.score}/{TOTAL_Q} · {p.accuracy}% · {p.avg_time?.toFixed(1)}s</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🏟️ Crear Torneo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nombre del torneo</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Ej: Torneo Neurociencias Final"
                className="rounded-xl"
                onKeyDown={e => e.key === 'Enter' && createTournament()} />
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1 text-muted-foreground">
              <p>📋 <strong>{TOTAL_Q} preguntas</strong> aleatorias seleccionadas automáticamente</p>
              <p>🕐 <strong>60 segundos</strong> por pregunta, auto-avance al terminar</p>
              <p>👥 Máximo <strong>{MAX_PLAYERS} jugadores</strong> por torneo</p>
              <p>✅ Solo V/F, Opción múltiple, Matching y Secuencia</p>
            </div>
            <Button onClick={createTournament} className="w-full rounded-xl" disabled={!newName.trim() || creating}>
              {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Crear Torneo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
