import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Search, Upload, Star, Download, Eye, BookOpen, X, TrendingUp, Edit2, Trash2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import moment from 'moment';

const RESOURCE_TYPES = [
  { id: 'all', label: 'Todos', emoji: '📚' },
  { id: 'document', label: 'Documentos', emoji: '📄' },
  { id: 'video', label: 'Videos', emoji: '🎬' },
  { id: 'audio', label: 'Audio', emoji: '🎵' },
  { id: 'image', label: 'Imágenes', emoji: '🖼️' },
  { id: 'spreadsheet', label: 'Hojas de cálculo', emoji: '📊' },
];

const SUBJECTS = ['Todos', 'Identidad Personal', 'Taller de Arte', 'Ciencias Biomédicas', 'IA en Salud', 'Neurociencias', 'Cuidados en Salud', 'Laboratorio', 'Representación de Modelos', 'General'];
const ACCEPTED = '.pdf,.doc,.docx,.xlsx,.xls,.mp4,.mp3,.jpg,.jpeg,.png';
const MAX_MB = 50;

function getFileType(mime, name) {
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  if (mime?.startsWith('image/') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image';
  if (mime?.startsWith('video/') || ['mp4','mov','avi'].includes(ext)) return 'video';
  if (mime?.startsWith('audio/') || ['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
  if (['xlsx','xls','csv'].includes(ext)) return 'spreadsheet';
  return 'document';
}

const TYPE_EMOJI = { document: '📄', video: '🎬', audio: '🎵', image: '🖼️', spreadsheet: '📊', questions: '❓', collection: '📦' };
const ROLE_COLOR = { admin: 'text-blue-400 bg-blue-400/10', mentor: 'text-purple-400 bg-purple-400/10', user: 'text-green-400 bg-green-400/10' };
const ROLE_LABEL = { admin: 'Oficial', mentor: 'Mentor', user: 'Estudiante' };

function StarWidget({ value, onRate, readonly }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n}
          onClick={() => !readonly && onRate?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-xl transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}>
          <span className={n <= (hover || value || 0) ? 'text-yellow-400' : 'text-muted-foreground/30'}>★</span>
        </button>
      ))}
    </div>
  );
}

function ResourceDetail({ resource, userId, onClose, onRate, onDownload }) {
  const alreadyVoted = resource.voter_ids?.includes(userId);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{TYPE_EMOJI[resource.type] || '📄'}</span>
            <div>
              <h2 className="font-bold">{resource.title}</h2>
              <p className="text-xs text-muted-foreground">por {resource.author_name} · {moment(resource.created_date).fromNow()}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        {resource.desc && <p className="text-sm text-muted-foreground">{resource.desc}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground">Materia</p><p className="font-medium">{resource.subject || 'General'}</p></div>
          <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground">Nivel</p><p className="font-medium">{resource.level || 'General'}</p></div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Valoración</p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 font-bold">{resource.rating_avg?.toFixed(1) || '—'}</span>
              <span className="text-xs text-muted-foreground">({resource.rating_count || 0})</span>
            </div>
          </div>
          <div className="bg-muted rounded-xl p-3"><p className="text-xs text-muted-foreground">Vistas</p><p className="font-medium">{resource.views || 0}</p></div>
        </div>
        {!alreadyVoted && (
          <div>
            <p className="text-sm font-medium mb-2">Califica este recurso:</p>
            <StarWidget onRate={onRate} />
          </div>
        )}
        {alreadyVoted && <p className="text-xs text-muted-foreground">Ya calificaste este recurso.</p>}
        {resource.file_url && (
          <a href={resource.file_url} download={resource.file_name || resource.title} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gap-2" onClick={onDownload}>
              <Download className="h-4 w-4" /> Descargar recurso
            </Button>
          </a>
        )}
      </motion.div>
    </div>
  );
}

function UploadModal({ onClose, profile, user, onUploaded }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [form, setForm] = useState({ title: '', desc: '', subject: 'General', level: 'Introductorio', tags: '' });

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`El archivo supera los ${MAX_MB}MB`); return; }
    setFile(f);
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
      setForm(prev => ({ ...prev, title: prev.title || f.name.replace(/\.[^.]+$/, '') }));
      toast.success('Archivo subido ✓');
      setStep(2);
    } catch {
      toast.error('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim()) { toast.error('Título obligatorio'); return; }
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    await base44.entities.LibraryResource.create({
      title: form.title, desc: form.desc, subject: form.subject, level: form.level,
      type: getFileType(file?.type, file?.name),
      author_id: profile.user_id, author_name: profile.display_name,
      author_role: user?.role || 'user',
      file_url: fileUrl, file_name: file?.name || form.title, file_type: file?.type || '',
      views: 0, rating_sum: 0, rating_count: 0, rating_avg: 0, voter_ids: [], downloads: 0,
      tags: tagsArr,
    });
    toast.success('¡Recurso publicado en la Biblioteca! 🏛️');
    onUploaded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Subir recurso — Paso {step}/2</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="flex gap-2">
          {[1,2].map(s => <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />)}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <label htmlFor="lib-file-input"
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${uploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary hover:bg-muted/30'}`}>
              {uploading ? (
                <><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" /><p className="text-sm text-muted-foreground">Subiendo archivo...</p></>
              ) : file ? (
                <><div className="text-4xl mb-2">{TYPE_EMOJI[getFileType(file.type, file.name)] || '📄'}</div><p className="text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size/1024/1024).toFixed(2)} MB</p></>
              ) : (
                <><Upload className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-medium text-sm">Arrastra o haz clic para subir</p><p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, MP4, MP3, JPG, PNG — máx. 50MB</p></>
              )}
            </label>
            <input id="lib-file-input" type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} disabled={uploading} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Título del recurso *"
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary" />
            <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="Descripción breve..." rows={3} maxLength={300}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
                {SUBJECTS.slice(1).map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
                {['Introductorio','Intermedio','Avanzado','Especializado'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="Etiquetas separadas por coma (ej: neurociencia, repaso)"
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Volver</Button>
              <Button className="flex-1 gap-2" onClick={handlePublish} disabled={!form.title.trim()}>
                <Upload className="h-4 w-4" /> Publicar
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function EditModal({ resource, onClose, onSaved }) {
  const [form, setForm] = useState({ title: resource.title, desc: resource.desc || '', subject: resource.subject || 'General' });
  const save = async () => {
    await base44.entities.LibraryResource.update(resource.id, form);
    toast.success('Recurso actualizado');
    onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Editar recurso</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Título *"
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary" />
        <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="Descripción" rows={3}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary resize-none" />
        <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value}) } className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
          {SUBJECTS.slice(1).map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={save}>Guardar</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Library() {
  const { profile, user } = useOutletContext();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('Todos');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editResource, setEditResource] = useState(null);
  const [activeSection, setActiveSection] = useState('explore');
  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  useEffect(() => { loadResources(); }, []);

  const loadResources = async () => {
    const all = await base44.entities.LibraryResource.list('-created_date', 100);
    setResources(all);
    setLoading(false);
  };

  const openResource = async (resource) => {
    setSelectedResource(resource);
    const newViews = (resource.views || 0) + 1;
    await base44.entities.LibraryResource.update(resource.id, { views: newViews });
    setResources(prev => prev.map(r => r.id === resource.id ? {...r, views: newViews} : r));
  };

  const rateResource = async (resource, value) => {
    if ((resource.voter_ids || []).includes(profile.user_id)) { toast.error('Ya calificaste este recurso'); return; }
    const newVoterIds = [...(resource.voter_ids || []), profile.user_id];
    const newSum = (resource.rating_sum || 0) + value;
    const newCount = (resource.rating_count || 0) + 1;
    const newAvg = newSum / newCount;
    await base44.entities.LibraryResource.update(resource.id, { voter_ids: newVoterIds, rating_sum: newSum, rating_count: newCount, rating_avg: newAvg });
    const updated = { ...resource, voter_ids: newVoterIds, rating_sum: newSum, rating_count: newCount, rating_avg: newAvg };
    setResources(prev => prev.map(r => r.id === resource.id ? updated : r));
    setSelectedResource(updated);
    toast.success(`Calificaste con ${value} ⭐`);
  };

  const deleteResource = async (resource) => {
    if (!window.confirm('¿Eliminar este recurso?')) return;
    await base44.entities.LibraryResource.delete(resource.id);
    setResources(prev => prev.filter(r => r.id !== resource.id));
    if (selectedResource?.id === resource.id) setSelectedResource(null);
    toast.success('Recurso eliminado');
  };

  const trackDownload = async (resource) => {
    await base44.entities.LibraryResource.update(resource.id, { downloads: (resource.downloads || 0) + 1 });
  };

  const canEdit = (r) => r.author_id === profile.user_id || isAdminOrMentor;

  let displayed = [...resources];
  if (activeSection === 'trending') displayed = [...resources].sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
  else if (activeSection === 'mine') displayed = resources.filter(r => r.author_id === profile.user_id);

  const filtered = displayed.filter(r => {
    const mt = typeFilter === 'all' || r.type === typeFilter;
    const ms = subjectFilter === 'Todos' || r.subject === subjectFilter;
    const mq = !query || r.title?.toLowerCase().includes(query.toLowerCase()) ||
      r.desc?.toLowerCase().includes(query.toLowerCase()) ||
      r.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()));
    return mt && ms && mq;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">
      {selectedResource && (
        <ResourceDetail
          resource={selectedResource}
          userId={profile.user_id}
          onClose={() => setSelectedResource(null)}
          onRate={(v) => rateResource(selectedResource, v)}
          onDownload={() => trackDownload(selectedResource)}
        />
      )}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} profile={profile} user={user} onUploaded={loadResources} />}
      {editResource && <EditModal resource={editResource} onClose={() => setEditResource(null)} onSaved={loadResources} />}

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">🏛️ Biblioteca</h1>
          <p className="text-muted-foreground mt-1">Repositorio colaborativo de recursos académicos</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Subir recurso
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Recursos', value: resources.length, icon: BookOpen, color: 'text-primary' },
          { label: 'Tendencias', value: resources.filter(r => (r.rating_avg || 0) >= 4).length, icon: TrendingUp, color: 'text-green-500' },
          { label: 'Mis recursos', value: resources.filter(r => r.author_id === profile.user_id).length, icon: Star, color: 'text-yellow-400' },
          { label: 'Total vistas', value: resources.reduce((s, r) => s + (r.views || 0), 0), icon: Eye, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar recursos, temas, etiquetas..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{id:'explore',label:'Explorar'},{id:'trending',label:'Tendencias 🔥'},{id:'mine',label:'Mis recursos'}].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeSection === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {RESOURCE_TYPES.map(t => (
          <button key={t.id} onClick={() => setTypeFilter(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${typeFilter === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => setSubjectFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${subjectFilter === s ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-muted-foreground">{activeSection === 'mine' ? 'Aún no has subido recursos' : 'No hay recursos con esos criterios'}</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowUpload(true)}>Subir el primero</Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-3">{filtered.length} recursos encontrados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => (
              <motion.div key={r.id} whileHover={{ y: -2 }} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/50 transition-all">
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => openResource(r)}>
                  <div className="text-3xl">{TYPE_EMOJI[r.type] || '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.subject || 'General'}</span>
                  <span>•</span>
                  <span className={`px-1.5 py-0.5 rounded-full ${ROLE_COLOR[r.author_role] || ROLE_COLOR.user}`}>{ROLE_LABEL[r.author_role] || 'Estudiante'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm font-medium">{r.rating_avg?.toFixed(1) || '—'}</span>
                    <span className="text-xs text-muted-foreground">({r.rating_count || 0})</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {r.views || 0}</span>
                </div>
                {r.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {r.tags.slice(0, 3).map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">#{t}</span>)}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  {r.file_url && (
                    <a href={r.file_url} download={r.file_name || r.title} target="_blank" rel="noopener noreferrer"
                      onClick={() => trackDownload(r)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="h-3 w-3" /> Descargar
                    </a>
                  )}
                  {canEdit(r) && (
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setEditResource(r); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={e => { e.stopPropagation(); deleteResource(r); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
