import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Plus, Users, X } from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';

const SUBJECTS = ['Neurociencias', 'Cuidados de la Salud', 'Ciencias Biomédicas', 'General', 'Otras'];

export default function StudyRooms() {
  const { profile } = useOutletContext();
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

  const loadRooms = async () => {
    const r = await base44.entities.StudyRoom.filter({ is_active: true });
    setRooms(r);
  };

  const joinRoom = async (room) => {
    const participants = room.participants || [];
    const already = participants.find(p => p.user_id === profile.user_id);
    if (!already) {
      participants.push({
        user_id: profile.user_id,
        display_name: profile.display_name,
        avatar_emoji: profile.avatar_emoji,
        joined_at: new Date().toISOString(),
        current_activity: 'Estudiando',
      });
      await base44.entities.StudyRoom.update(room.id, { participants });
    }
    setActiveRoom(room.id);
    setRoomData({ ...room, participants });
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

  const createRoom = async () => {
    if (!newRoom.name.trim()) return;
    await base44.entities.StudyRoom.create({ ...newRoom, is_active: true, participants: [], messages: [], created_by: profile.user_id });
    toast.success('Sala creada');
    setShowCreate(false);
    setNewRoom({ name: '', subject: 'General', description: '' });
    loadRooms();
  };

  if (activeRoom && roomData) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">{roomData.name}</h2>
            <p className="text-sm text-muted-foreground">{roomData.subject} • {roomData.participants?.length || 0} participantes</p>
          </div>
          <Button variant="outline" onClick={leaveRoom} className="rounded-xl"><X className="mr-2 h-4 w-4" />Salir</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
          {/* Participants */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">PARTICIPANTES</p>
            <div className="space-y-2">
              {(roomData.participants || []).map(p => (
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
          {rooms.map(room => (
            <div key={room.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{room.name}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>📚 {room.subject}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{room.participants?.length || 0}</span>
                </div>
                {room.description && <p className="text-xs text-muted-foreground mt-1">{room.description}</p>}
              </div>
              <Button onClick={() => joinRoom(room)} className="rounded-xl" size="sm">Unirse</Button>
            </div>
          ))}
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
