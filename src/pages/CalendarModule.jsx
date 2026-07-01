import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Users, User, X, AlertTriangle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const SUBJECT_COLORS = {
  identidad: { color: '#a78bfa', label: 'Identidad Personal',   emoji: '🎭' },
  arte:      { color: '#f59e0b', label: 'Taller de Arte',        emoji: '🎨' },
  biomed:    { color: '#22c55e', label: 'Ciencias Biomédicas',   emoji: '🔬' },
  ia:        { color: '#06b6d4', label: 'IA en Salud',           emoji: '🤖' },
  neuro:     { color: '#6366f1', label: 'Neurociencias',         emoji: '🧠' },
  cuidados:  { color: '#ec4899', label: 'Cuidados en Salud',     emoji: '🫂' },
  lab:       { color: '#f97316', label: 'Laboratorio',           emoji: '🧪' },
};

const ACTIVITY_TYPES = [
  { id: 'individual', label: 'Lectura individual', emoji: '📖' },
  { id: 'group', label: 'Estudio grupal', emoji: '👥' },
  { id: 'review', label: 'Repaso rápido', emoji: '⚡' },
  { id: 'practice', label: 'Práctica de ejercicios', emoji: '✏️' },
  { id: 'exam', label: 'Evaluación', emoji: '📝' },
  { id: 'break', label: 'Descanso activo', emoji: '🧘' },
];

function EventBlock({ event, onClick }) {
  const subj = SUBJECT_COLORS[event.subject] || Object.values(SUBJECT_COLORS)[0];
  const actType = ACTIVITY_TYPES.find(a => a.id === event.type);
  return (
    <div onClick={() => onClick(event)}
      style={{ backgroundColor: subj.color + '22', borderLeft: `3px solid ${subj.color}`, height: `${event.duration * 48}px` }}
      className={`rounded-r-lg p-1 cursor-pointer hover:opacity-80 transition-all text-xs overflow-hidden relative ${event.is_critical ? 'ring-1 ring-orange-400' : ''}`}>
      {event.is_critical && <span className="absolute top-0.5 right-0.5 text-orange-400 text-xs">🚨</span>}
      <p className="font-semibold truncate" style={{ color: subj.color }}>{event.title}</p>
      <p className="text-muted-foreground truncate">{actType?.emoji} {actType?.label}</p>
    </div>
  );
}

function AddEventModal({ onClose, onSave, defaultDay }) {
  const [form, setForm] = useState({ title: '', subject: 'neuro', day: defaultDay ?? 0, hour: 9, duration: 1, type: 'individual', is_critical: false });
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Nuevo evento</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Nombre del evento"
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Materia</label>
            <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
              {Object.entries(SUBJECT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
              {ACTIVITY_TYPES.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Día</label>
            <select value={form.day} onChange={e => setForm({...form, day: Number(e.target.value)})}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hora inicio</label>
            <select value={form.hour} onChange={e => setForm({...form, hour: Number(e.target.value)})}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
              {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duración (h)</label>
            <select value={form.duration} onChange={e => setForm({...form, duration: Number(e.target.value)})}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
              {[0.5, 1, 1.5, 2, 2.5, 3].map(d => <option key={d} value={d}>{d}h</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="critical" checked={form.is_critical} onChange={e => setForm({...form, is_critical: e.target.checked})} className="rounded" />
            <label htmlFor="critical" className="text-sm">¿Evento crítico? 🚨</label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => { onSave(form); onClose(); }} disabled={!form.title}>Guardar</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CalendarModule() {
  const { profile } = useOutletContext();
  const [view, setView] = useState('individual');
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [defaultDay, setDefaultDay] = useState(null);
  const [weekGoal, setWeekGoal] = useState('');
  const [goalSet, setGoalSet] = useState(false);

  useEffect(() => { loadEvents(); }, [profile, view]); // eslint-disable-line

  const loadEvents = async () => {
    if (!profile) return;
    try {
      const all = view === 'individual'
        ? await base44.entities.CalendarEvent.filter({ user_id: profile.user_id }, '-created_date', 200)
        : await base44.entities.CalendarEvent.filter({ view_type: 'group' }, '-created_date', 200);
      setEvents(all || []);
    } catch (err) {
      console.error('[Calendar] load error:', err);
    }
  };

  const totalHours = events.reduce((sum, e) => sum + (e.duration || 0), 0);
  const loadColor = totalHours < 15 ? 'text-green-500' : totalHours < 25 ? 'text-yellow-500' : 'text-red-500';
  const loadBg = totalHours < 15 ? 'bg-green-500' : totalHours < 25 ? 'bg-yellow-500' : 'bg-red-500';
  const criticalEvents = events.filter(e => e.is_critical);

  const handleSave = async (form) => {
    try {
      const created = await base44.entities.CalendarEvent.create({ ...form, user_id: profile.user_id, view_type: view });
      setEvents(prev => [...prev, created]);
    } catch (err) {
      console.error('[Calendar] save error:', err);
      alert('No se pudo crear el evento. Intenta de nuevo.');
    }
  };

  const handleDelete = async (ev) => {
    if (ev.user_id !== profile.user_id) {
      alert('Solo puedes eliminar tus propios eventos');
      return;
    }
    try {
      await base44.entities.CalendarEvent.delete(ev.id);
      setEvents(prev => prev.filter(e => e.id !== ev.id));
      setSelectedEvent(null);
    } catch (err) {
      console.error('[Calendar] delete error:', err);
    }
  };

  const getEventsForSlot = (day, hour) => events.filter(e => e.day === day && e.hour === hour);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {showAdd && <AddEventModal onClose={() => setShowAdd(false)} onSave={handleSave} defaultDay={defaultDay} />}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            {(() => {
              const subj = SUBJECT_COLORS[selectedEvent.subject];
              const act = ACTIVITY_TYPES.find(a => a.id === selectedEvent.type);
              return (
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Materia:</span> {subj?.emoji} {subj?.label}</p>
                  <p><span className="text-muted-foreground">Tipo:</span> {act?.emoji} {act?.label}</p>
                  <p><span className="text-muted-foreground">Día:</span> {DAYS[selectedEvent.day]}</p>
                  <p><span className="text-muted-foreground">Hora:</span> {selectedEvent.hour}:00 — {(selectedEvent.hour || 0) + (selectedEvent.duration || 0)}:00</p>
                  {selectedEvent.is_critical && <p className="text-orange-400 font-medium">🚨 Evento crítico</p>}
                </div>
              );
            })()}
            <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(selectedEvent)}>
              Eliminar evento
            </Button>
          </motion.div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">🗓️ Calendario de Estudio</h1>
          <p className="text-muted-foreground mt-1">Organiza tu tiempo de forma colaborativa e inteligente</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {[{id:'individual', icon: User, label:'Individual'}, {id:'group', icon: Users, label:'Público'}].map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${view === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <v.icon className="h-4 w-4" /> {v.label}
              </button>
            ))}
          </div>
          <Button onClick={() => { setDefaultDay(null); setShowAdd(true); }} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Evento
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Horas esta semana</p>
          <p className={`text-2xl font-bold ${loadColor}`}>{totalHours}h</p>
          <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div className={`h-full ${loadBg} rounded-full transition-all`} style={{ width: `${Math.min(totalHours / 30 * 100, 100)}%` }} />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Eventos críticos</p>
          <p className="text-2xl font-bold text-orange-400">{criticalEvents.length}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{criticalEvents.map(e => e.title).join(', ') || 'Ninguno'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total eventos</p>
          <p className="text-2xl font-bold">{events.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Meta semanal</p>
          {goalSet ? (
            <p className="text-sm font-medium mt-1 truncate">{weekGoal}</p>
          ) : (
            <button onClick={() => document.getElementById('goal-input')?.focus()} className="text-xs text-primary">+ Definir meta</button>
          )}
        </div>
      </div>

      {!goalSet && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Flame className="h-5 w-5 text-orange-400 shrink-0" />
          <input id="goal-input" value={weekGoal} onChange={e => setWeekGoal(e.target.value)}
            placeholder="Define tu meta de esta semana..."
            className="flex-1 bg-transparent text-sm focus:outline-none" />
          <Button size="sm" onClick={() => weekGoal && setGoalSet(true)}>Guardar</Button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {Object.entries(SUBJECT_COLORS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
            <span className="text-muted-foreground">{v.emoji} {v.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="p-2 border-b border-r border-border bg-muted" />
          {DAYS.map((d, i) => (
            <div key={i} className="p-2 border-b border-r border-border bg-muted text-center">
              <p className="text-xs font-semibold">{d}</p>
            </div>
          ))}
          {HOURS.map(hour => (
            <>
              <div key={`h-${hour}`} className="p-2 border-b border-r border-border text-xs text-muted-foreground flex items-start justify-center pt-3">
                {hour}:00
              </div>
              {DAYS.map((_, dayIdx) => {
                const slotEvents = getEventsForSlot(dayIdx, hour);
                return (
                  <div key={`${dayIdx}-${hour}`}
                    className="border-b border-r border-border min-h-[48px] p-0.5 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => { if (slotEvents.length === 0) { setDefaultDay(dayIdx); setShowAdd(true); } }}>
                    {slotEvents.map(ev => (
                      <EventBlock key={ev.id} event={ev} onClick={setSelectedEvent} />
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {criticalEvents.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-400" /> Fechas críticas
          </h3>
          <div className="space-y-2">
            {criticalEvents.map(ev => {
              const subj = SUBJECT_COLORS[ev.subject];
              return (
                <div key={ev.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{subj?.emoji || '📅'}</span>
                    <div>
                      <p className="font-medium text-sm">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{DAYS[ev.day]} • {ev.hour}:00</p>
                    </div>
                  </div>
                  <span className="text-xs text-orange-400 font-medium">🚨 Crítico</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
