import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Plus, Users, X, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';

const SUBJECTS = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'General', 'Otras'];

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 min — matches AppLayout heartbeat interval

// Participant is active if they have a recent last_active timestamp.
// Legacy entries without the field are shown (backward compat).
const isParticipantActive = (p) => {
  if (!p.last_active) return true;
  return Date.now() - new Date(p.last_active).getTime() < ONLINE_THRESHOLD_MS;
};

export default function StudyRooms() {
  const { profile, user } = useOutletContext();
  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', subject: 'General', description: '' });
  const messagesEndRef = useRef();

  useEffect(() => {
    loadRooms();
    const unsub = base44.entities.StudyRoom.subscribe((event) => {
      loadRooms();
      if (activeRoom && event.data?.id === activeRoom) {
        setRoomData(event.data);
      }
    });
    return unsub;
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.messages]);

  // Heartbeat: update our last_active in the room every 30 s so others see us as present.
  // Also cleans up any participants that have gone stale in the same pass.
  useEffect(() => {
    if (!activeRoom) return;
    const beat = setInterval(async () => {
      const fresh = await base44.entities.StudyRoom.get(activeRoom);
      if (!fresh) return;
      const participants = (fresh.participants || [])
        .filter(p => p.user_id === profile.user_id || isParticipantActive(p))
        .map(p => p.user_id === profile.user_id
          ? { ...p, last_active: new Date().toISOString() }
          : p,
        );
      await base44.entities.StudyRoom.update(activeRoom, { participants });
    }, 30_000);
    return () => clearInterval(beat);
  }, [activeRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRooms = async () => {
    const r = await base44.entities.StudyRoom.filter({ is_active: true });
    setRooms(r);
  };

  const joinRoom = async (room) => {
    // Remove stale participants + remove self (will be re-added below with fresh timestamp)
    const freshParticipants = (room.participants || [])
      .filter(p => p.user_id !== profile.user_id)
      .filter(isParticipantActive);

    freshParticipants.push({
      user_id: profile.user_id,
      display_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji,
      joined_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      current_activity: 'Estudiando',
    });
    await base44.entities.StudyRoom.update(room.id, { participants: freshParticipants });
    setActiveRoom(room.id);
    setRoomData({ ...room, participants: freshParticipants });
  };

  const leaveRoom = async () => {
    if (!roomData) return;
    const participants = (roomData.participants || []).filter(p => p.user_id !== profile.user_id);
    await base44.entities.StudyRoom.update(roomData.id, { participants });
    setActiveRoom(null);
    setRoomData(null);
  };

  const sendMessage = async () => {
    if (!message.trim() || !roomData) return;
    const messages = [...(roomData.messages || []), {
      id: Date.now().toString(),
      user_id: profile.user_id,
      user_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji,
      text: message,
      created_at: new Date().toISOString(),
    }];
    await base44.entities.StudyRoom.update(roomData.id, { messages });
    setMessage('');
    setRoomData(prev => ({ ...prev, messages }));
  };

  const deleteRoom = async (room) => {
    if (activeRoom === room.id) {
      await leaveRoom();
    }
    await base44.entities.StudyRoom.delete(room.id);
    toast.success('Sala eliminada');
    loadRooms();
  };

  const createRoom = async () => {
    if (!newRoom.name.trim()) return;
    await base44.entities.StudyRoom.create({ ...newRoom, is_active: true, participants: [], messages: [], created_by: profile.user_id });
    toast.success('Sala creada');
    setShowCreate(false);
    setNewRoom({ name: '', subject: 'General', description: '' });
    loadRooms();
  };

  if (activeRoom && roomData) {
    const activeParticipants = (roomData.participants || []).filter(isParticipantActive);
    return (
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">{roomData.name}</h2>
            <p className="text-sm text-muted-foreground">{roomData.subject} • {activeParticipants.length} participante{activeParticipants.length !== 1 ? 's' : ''} en línea</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdminOrMentor && (
              <Button variant="outline" onClick={() => deleteRoom(roomData)} className="rounded-xl text-red-500 border-red-400/30 hover:bg-red-500/10">
                <Trash2 className="mr-2 h-4 w-4" />Eliminar sala
              </Button>
            )}
            <Button variant="outline" onClick={leaveRoom} className="rounded-xl"><X className="mr-2 h-4 w-4" />Salir</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
          {/* Participants */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">EN LÍNEA ({activeParticipants.length})</p>
            <div className="space-y-2">
              {activeParticipants.map(p => (
                <div key={p.user_id} className="flex items-center gap-2">
                  <span className="text-xl">{p.avatar_emoji || '👤'}</span>
                  <div>
                    <p className="text-xs font-medium">{p.display_name}</p>
                    <p className="text-xs text-green-500">● {p.current_activity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(roomData.messages || []).map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.user_id === profile.user_id ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xl shrink-0">{msg.avatar_emoji || '👤'}</span>
                  <div className={`max-w-[70%] ${msg.user_id === profile.user_id ? 'items-end' : 'items-start'} flex flex-col`}>
                    <p className="text-xs text-muted-foreground mb-1">{msg.user_name}</p>
                    <div className={`px-3 py-2 rounded-xl text-sm ${msg.user_id === profile.user_id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.text}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{moment(msg.created_at).fromNow()}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Escribe un mensaje..." className="rounded-xl" onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <Button onClick={sendMessage} className="rounded-xl shrink-0"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-space font-bold">🏠 Salas de Estudio</h1>
          <p className="text-sm text-muted-foreground">Estudia en tiempo real con otros usuarios</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Crear Sala</Button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="text-5xl mb-3">🏠</div>
          <p className="text-muted-foreground">No hay salas activas</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4 rounded-xl">Crear la primera sala</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => {
            const activeCount = (room.participants || []).filter(isParticipantActive).length;
            return (
              <div key={room.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{room.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>📚 {room.subject}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {activeCount > 0
                        ? <><span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block mr-0.5" />{activeCount} en línea</>
                        : 'Vacía'}
                    </span>
                  </div>
                  {room.description && <p className="text-xs text-muted-foreground mt-1">{room.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => joinRoom(room)} className="rounded-xl" size="sm">Unirse</Button>
                  {isAdminOrMentor && (
                    <Button onClick={() => deleteRoom(room)} variant="outline" size="sm" className="rounded-xl text-red-500 border-red-400/30 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crear Sala de Estudio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre</Label><Input value={newRoom.name} onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))} className="mt-1 rounded-xl" /></div>
            <div><Label>Materia</Label>
              <Select value={newRoom.subject} onValueChange={v => setNewRoom(p => ({ ...p, subject: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción (opcional)</Label><Input value={newRoom.description} onChange={e => setNewRoom(p => ({ ...p, description: e.target.value }))} className="mt-1 rounded-xl" /></div>
            <Button onClick={createRoom} className="w-full rounded-xl" disabled={!newRoom.name.trim()}>Crear Sala</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
