import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Search, Upload, Star, Download, Eye, BookOpen, X,
  TrendingUp, Edit2, Trash2, Bookmark, BookmarkCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ── Constants ──────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Identidad Personal', 'Taller de Arte', 'Ciencias Biomédicas', 'IA en Salud',
  'Neurociencias', 'Cuidados en Salud', 'Laboratorio', 'Representación de Modelos',
  'General', 'Otros',
];
const SUBJECTS_FILTER = ['Todos', ...SUBJECTS];
const LEVELS = ['Introductorio', 'Intermedio', 'Avanzado', 'Especializado'];
const ACCEPTED = '.pdf,.txt,.csv,.xlsx,.doc,.docx,.mp4,.mp3,.zip,.jpg,.jpeg,.png,.json';
const MAX_MB = 50;

const TYPE_INFO = {
  document:    { emoji: '📄', label: 'Documentos',      exts: 'TXT, DOC, DOCX, PDF' },
  image:       { emoji: '🎞️', label: 'Imágenes',        exts: 'JPG, PNG' },
  video:       { emoji: '🎬', label: 'Videos y Audio',  exts: 'MP4' },
  audio:       { emoji: '🎬', label: 'Videos y Audio',  exts: 'MP3' },
  spreadsheet: { emoji: '📊', label: 'Hoja de cálculo', exts: 'CSV, XLSX' },
  collection:  { emoji: '📦', label: 'Colecciones',     exts: 'ZIP' },
  questions:   { emoji: '❓', label: 'Preguntas',        exts: 'JSON' },
};

const LICENSE_INFO = {
  free:     { label: 'Uso libre',        color: 'bg-green-500/10 text-green-500 border border-green-500/30' },
  readonly: { label: 'Solo lectura',     color: 'bg-blue-500/10 text-blue-500 border border-blue-500/30' },
  internal: { label: 'Solo uso interno', color: 'bg-orange-500/10 text-orange-500 border border-orange-500/30' },
};

const ROLE_COLOR = {
  admin:  'text-blue-400 bg-blue-400/10',
  mentor: 'text-purple-400 bg-purple-400/10',
  user:   'text-green-400 bg-green-400/10',
};
const ROLE_LABEL = { admin: 'Oficial', mentor: 'Mentor', user: 'Estudiante' };

function getFileType(mime, name) {
  const ext = (name?.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(ext) || mime?.startsWith('image/')) return 'image';
  if (ext === 'mp4' || mime?.startsWith('video/')) return 'video';
  if (ext === 'mp3' || mime?.startsWith('audio/')) return 'audio';
  if (['csv', 'xlsx', 'xls'].includes(ext)) return 'spreadsheet';
  if (ext === 'zip') return 'collection';
  if (ext === 'json') return 'questions';
  return 'document';
}

// ── StarWidget ─────────────────────────────────────────────────────────────────

function StarWidget({ value = 0, onRate, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => !readonly && onRate?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          className={`text-3xl transition-transform leading-none ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
        >
          <span className={n <= (hover || value) ? 'text-yellow-400' : 'text-muted-foreground/25'}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── InAppPreview overlay ───────────────────────────────────────────────────────

function InAppPreview({ resource, onClose }) {
  const isInternal = resource.license === 'internal';
  const type = resource.type;
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{TYPE_INFO[type]?.emoji || '📄'}</span>
          <span className="font-medium text-sm truncate">{resource.title}</span>
          {isInternal && (
            <span className="shrink-0 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Solo uso interno</span>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 ml-3">
          <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {/* Disclaimer for internal */}
      {isInternal && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 shrink-0">
          <p className="text-xs text-orange-400">
            ⚠️ Este material es de uso exclusivo dentro de la app. Al visualizarlo te comprometes a no compartirlo ni distribuirlo fuera de este entorno.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0">
        {type === 'image' ? (
          <img src={resource.file_url} alt={resource.title}
            className="max-w-full max-h-full rounded-xl object-contain" />
        ) : type === 'video' ? (
          <video src={resource.file_url} controls
            className="max-w-full max-h-full rounded-xl" />
        ) : type === 'audio' ? (
          <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center gap-4">
            <span className="text-7xl">🎵</span>
            <p className="font-semibold">{resource.title}</p>
            <audio src={resource.file_url} controls className="w-full max-w-sm" />
          </div>
        ) : (
          <iframe
            src={resource.file_url}
            title={resource.title}
            className="w-full h-full min-h-[70vh] rounded-xl border border-border bg-white"
          />
        )}
      </div>
    </div>
  );
}

// ── ResourceDetail modal ───────────────────────────────────────────────────────

function ResourceDetail({ resource, userId, isFavorited, onClose, onRate, onToggleFavorite, onDownload }) {
  const [showPreview, setShowPreview] = useState(false);
  const alreadyVoted = (resource.voter_ids || []).includes(userId);
  const license = resource.license || 'free';
  const licInfo = LICENSE_INFO[license] || LICENSE_INFO.free;
  const canDownload = license === 'free';
  const opensInApp  = license === 'readonly' || license === 'internal';

  const handleView = () => {
    if (opensInApp) setShowPreview(true);
    else window.open(resource.file_url, '_blank');
  };

  return (
    <>
      {showPreview && <InAppPreview resource={resource} onClose={() => setShowPreview(false)} />}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-4xl shrink-0">{TYPE_INFO[resource.type]?.emoji || '📄'}</span>
              <div className="min-w-0">
                <h2 className="font-bold leading-tight">{resource.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">por {resource.author_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 mt-0.5">
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {/* Description */}
          {resource.desc && (
            <p className="text-sm text-primary font-medium leading-relaxed">{resource.desc}</p>
          )}

          {/* License badge */}
          <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${licInfo.color}`}>
            {licInfo.label}
          </span>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Materia</p>
              <p className="font-semibold text-sm">{resource.subject || 'General'}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Nivel</p>
              <p className="font-semibold text-sm">{resource.level || '—'}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Valoración</p>
              <p className="font-bold text-sm">
                <span className="text-yellow-400">⭐ {resource.rating_avg?.toFixed(1) || '—'}</span>
                <span className="text-muted-foreground font-normal text-xs"> ({resource.rating_count || 0})</span>
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Vistas</p>
              <p className="font-semibold text-sm">{resource.views || 0}</p>
            </div>
          </div>

          {/* Tags */}
          {resource.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resource.tags.map(t => (
                <span key={t} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          {/* Rating */}
          <div>
            <p className="text-sm font-semibold mb-2">¿Te fue útil este recurso?</p>
            {alreadyVoted ? (
              <p className="text-xs text-muted-foreground">Ya calificaste este recurso.</p>
            ) : (
              <StarWidget onRate={onRate} />
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {/* Favorites */}
            <Button
              variant={isFavorited ? 'default' : 'outline'}
              className="w-full gap-2 rounded-xl"
              onClick={onToggleFavorite}
            >
              {isFavorited
                ? <><BookmarkCheck className="h-4 w-4" /> Quitar de destacados</>
                : <><Bookmark className="h-4 w-4" /> Agregar a destacados</>}
            </Button>

            {/* View + Download */}
            <div className="flex gap-2">
              {resource.file_url && (
                <Button className="flex-1 gap-2 rounded-xl" onClick={handleView}>
                  <Eye className="h-4 w-4" /> Ver recurso
                </Button>
              )}
              {canDownload && resource.file_url && (
                <a
                  href={resource.file_url}
                  download={resource.file_name || resource.title}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onDownload}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full gap-2 rounded-xl">
                    <Download className="h-4 w-4" /> Descargar
                  </Button>
                </a>
              )}
            </div>
            {!canDownload && (
              <p className="text-xs text-center text-muted-foreground">
                {license === 'readonly'
                  ? '🔒 Solo lectura — descarga no disponible'
                  : '🔒 Uso interno — descarga no disponible'}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ── UploadModal — 3 steps ──────────────────────────────────────────────────────

function UploadModal({ onClose, profile, user, onUploaded }) {
  const [step, setStep]         = useState(1);
  const [file, setFile]         = useState(null);
  const [fileUrl, setFileUrl]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm]         = useState({ title: '', desc: '', subject: 'General', level: 'Introductorio', tags: '' });
  const [license, setLicense]   = useState('free');
  const [agreed, setAgreed]     = useState(false);
  const [publishing, setPublishing] = useState(false);

  const detectedType = file ? getFileType(file.type, file.name) : null;

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`El archivo supera los ${MAX_MB} MB`); return; }
    setFile(f);
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
      setForm(prev => ({ ...prev, title: prev.title || f.name.replace(/\.[^.]+$/, '') }));
      toast.success('Archivo listo ✓');
    } catch {
      toast.error('Error al subir el archivo');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim()) { toast.error('Título obligatorio'); return; }
    if (license === 'internal' && !agreed) { toast.error('Debes aceptar el compromiso de uso interno'); return; }
    setPublishing(true);
    try {
      const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await base44.entities.LibraryResource.create({
        title: form.title, desc: form.desc, subject: form.subject, level: form.level,
        type: detectedType || 'document',
        author_id: profile.user_id, author_name: profile.display_name,
        author_role: user?.role || 'user',
        file_url: fileUrl, file_name: file?.name || form.title, file_type: file?.type || '',
        views: 0, rating_sum: 0, rating_count: 0, rating_avg: 0,
        voter_ids: [], downloads: 0, favorited_by: [],
        tags: tagsArr, license,
      });
      toast.success('¡Recurso publicado en la Biblioteca! 🏛️');
      onUploaded();
      onClose();
    } catch {
      toast.error('Error al publicar el recurso');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Subir recurso — Paso {step}/3</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="space-y-4">
            <label htmlFor="lib-file-input"
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                uploading ? 'border-primary/50 bg-primary/5' :
                file      ? 'border-primary/40 bg-primary/5' :
                            'border-border hover:border-primary hover:bg-muted/30'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
                </>
              ) : file ? (
                <>
                  <div className="text-5xl mb-2">{TYPE_INFO[detectedType]?.emoji || '📄'}</div>
                  <p className="text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · {TYPE_INFO[detectedType]?.label}
                  </p>
                  <p className="text-xs text-green-500 mt-2">✓ Listo para continuar</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium text-sm">Arrastra o haz clic para subir</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    PDF, TXT, CSV, XLSX, DOC, DOCX, MP4, MP3, ZIP, JPG, PNG, JSON
                  </p>
                  <p className="text-xs text-muted-foreground">máx. {MAX_MB} MB</p>
                </>
              )}
            </label>
            <input id="lib-file-input" type="file" accept={ACCEPTED} className="hidden"
              onChange={handleFileChange} disabled={uploading} />
            <Button className="w-full rounded-xl" onClick={() => setStep(2)} disabled={!fileUrl || uploading}>
              Continuar →
            </Button>
          </div>
        )}

        {/* ── Step 2: Metadata ── */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Detected type badge */}
            {detectedType && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                <span className="text-2xl">{TYPE_INFO[detectedType]?.emoji}</span>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo detectado</p>
                  <p className="text-sm font-semibold">{TYPE_INFO[detectedType]?.label}</p>
                </div>
              </div>
            )}

            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Título del recurso *"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:border-primary"
            />

            <div className="relative">
              <textarea
                value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value.slice(0, 300) })}
                placeholder="Descripción breve (máx. 300 caracteres) *"
                rows={3}
                className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:border-primary resize-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{form.desc.length}/300</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                className="bg-muted rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none w-full">
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                className="bg-muted rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none w-full">
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>

            <input
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="Etiquetas separadas por coma (ej: anatomía, repaso)"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:border-primary"
            />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}>← Volver</Button>
              <Button className="flex-1 rounded-xl" onClick={() => setStep(3)} disabled={!form.title.trim()}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: License ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">Licencia de uso *</p>
            <p className="text-xs text-muted-foreground -mt-3">Define quién puede acceder a este recurso.</p>

            {[
              { id: 'free',     label: 'Uso libre',        desc: 'Cualquiera puede visualizarlo y descargarlo' },
              { id: 'readonly', label: 'Solo lectura',      desc: 'Vista previa dentro de la app, sin posibilidad de descarga' },
              { id: 'internal', label: 'Solo uso interno',  desc: 'Vista previa en la app, sin descarga, con compromiso de confidencialidad' },
            ].map(opt => (
              <label key={opt.id}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  license === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <input type="radio" name="license" value={opt.id}
                  checked={license === opt.id}
                  onChange={() => { setLicense(opt.id); setAgreed(false); }}
                  className="mt-0.5 accent-primary" />
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}

            {/* Internal disclaimer */}
            {license === 'internal' && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
                <p className="text-xs text-orange-400 leading-relaxed italic">
                  "Comprendo que el material se puede usar exclusivamente dentro de la app. Me comprometo a no compartir, distribuir, comercializar ni permitir utilización por terceros de material fuera de la app o en otros contextos."
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    className="rounded accent-primary" />
                  <span className="text-xs font-semibold text-foreground">Acepto el compromiso de uso interno</span>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}>← Volver</Button>
              <Button
                className="flex-1 gap-2 rounded-xl"
                onClick={handlePublish}
                disabled={publishing || (license === 'internal' && !agreed)}
              >
                {publishing
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Upload className="h-4 w-4" /> Enviar para revisión</>
                }
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── EditModal ──────────────────────────────────────────────────────────────────

function EditModal({ resource, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:   resource.title,
    desc:    resource.desc || '',
    subject: resource.subject || 'General',
    level:   resource.level || 'Introductorio',
    license: resource.license || 'free',
  });

  const save = async () => {
    await base44.entities.LibraryResource.update(resource.id, form);
    toast.success('Recurso actualizado');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Editar recurso</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Título *"
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary" />
        <textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })}
          placeholder="Descripción" rows={3}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:border-primary resize-none" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
            className="bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
            className="bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <select value={form.license} onChange={e => setForm({ ...form, license: e.target.value })}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border focus:outline-none">
          <option value="free">Uso libre</option>
          <option value="readonly">Solo lectura</option>
          <option value="internal">Solo uso interno</option>
        </select>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 rounded-xl" onClick={save}>Guardar</Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Library() {
  const { profile, user } = useOutletContext();
  const [resources, setResources]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [query, setQuery]                   = useState('');
  const [subjectFilter, setSubjectFilter]   = useState('Todos');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showUpload, setShowUpload]         = useState(false);
  const [editResource, setEditResource]     = useState(null);
  const [section, setSection]               = useState('explore');
  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  useEffect(() => { loadResources(); }, []);

  const loadResources = async () => {
    setLoading(true);
    const all = await base44.entities.LibraryResource.list('-created_date', 200);
    setResources(all || []);
    setLoading(false);
  };

  const openResource = async (resource) => {
    setSelectedResource(resource);
    const newViews = (resource.views || 0) + 1;
    await base44.entities.LibraryResource.update(resource.id, { views: newViews });
    setResources(prev => prev.map(r => r.id === resource.id ? { ...r, views: newViews } : r));
  };

  const rateResource = async (value) => {
    const resource = selectedResource;
    if ((resource.voter_ids || []).includes(profile.user_id)) { toast.error('Ya calificaste este recurso'); return; }
    const newVoterIds = [...(resource.voter_ids || []), profile.user_id];
    const newSum      = (resource.rating_sum || 0) + value;
    const newCount    = (resource.rating_count || 0) + 1;
    const newAvg      = newSum / newCount;
    await base44.entities.LibraryResource.update(resource.id, {
      voter_ids: newVoterIds, rating_sum: newSum, rating_count: newCount, rating_avg: newAvg,
    });
    const updated = { ...resource, voter_ids: newVoterIds, rating_sum: newSum, rating_count: newCount, rating_avg: newAvg };
    setResources(prev => prev.map(r => r.id === resource.id ? updated : r));
    setSelectedResource(updated);
    toast.success(`Calificaste con ${value} ⭐`);
  };

  const toggleFavorite = async () => {
    const resource = selectedResource;
    const favs    = resource.favorited_by || [];
    const already = favs.includes(profile.user_id);
    const newFavs = already
      ? favs.filter(id => id !== profile.user_id)
      : [...favs, profile.user_id];
    await base44.entities.LibraryResource.update(resource.id, { favorited_by: newFavs });
    const updated = { ...resource, favorited_by: newFavs };
    setResources(prev => prev.map(r => r.id === resource.id ? updated : r));
    setSelectedResource(updated);
    toast.success(already ? 'Quitado de Destacados' : '⭐ Agregado a Destacados');
  };

  const deleteResource = async (resource) => {
    if (!window.confirm('¿Eliminar este recurso?')) return;
    await base44.entities.LibraryResource.delete(resource.id);
    setResources(prev => prev.filter(r => r.id !== resource.id));
    if (selectedResource?.id === resource.id) setSelectedResource(null);
    toast.success('Recurso eliminado');
  };

  const trackDownload = () => {
    if (!selectedResource) return;
    base44.entities.LibraryResource.update(selectedResource.id, {
      downloads: (selectedResource.downloads || 0) + 1,
    });
  };

  const canEdit    = (r) => r.author_id === profile.user_id || isAdminOrMentor;
  const isFav      = (r) => (r.favorited_by || []).includes(profile.user_id);
  const favCount   = resources.filter(isFav).length;

  // Build base list for current section
  let baseList = [...resources];
  if (section === 'trending')   baseList = [...resources].sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
  if (section === 'destacados') baseList = resources.filter(isFav);
  if (section === 'mine')       baseList = resources.filter(r => r.author_id === profile.user_id);

  const filtered = baseList.filter(r => {
    const ms = subjectFilter === 'Todos' || r.subject === subjectFilter;
    const mq = !query ||
      r.title?.toLowerCase().includes(query.toLowerCase()) ||
      r.desc?.toLowerCase().includes(query.toLowerCase()) ||
      r.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()));
    return ms && mq;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">
      {/* Modals */}
      {selectedResource && (
        <ResourceDetail
          resource={selectedResource}
          userId={profile.user_id}
          isFavorited={isFav(selectedResource)}
          onClose={() => setSelectedResource(null)}
          onRate={rateResource}
          onToggleFavorite={toggleFavorite}
          onDownload={trackDownload}
        />
      )}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} profile={profile} user={user} onUploaded={loadResources} />
      )}
      {editResource && (
        <EditModal resource={editResource} onClose={() => setEditResource(null)} onSaved={loadResources} />
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">🏛️ Biblioteca</h1>
          <p className="text-sm text-muted-foreground">Repositorio colaborativo de recursos académicos</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="gap-2 rounded-xl">
          <Upload className="h-4 w-4" /> Subir recurso
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Recursos',      value: resources.length,                                    icon: BookOpen,  color: 'text-primary' },
          { label: 'Destacados',    value: favCount,                                             icon: Bookmark,  color: 'text-yellow-400' },
          { label: 'Mis recursos',  value: resources.filter(r => r.author_id === profile.user_id).length, icon: Star, color: 'text-green-500' },
          { label: 'Total vistas',  value: resources.reduce((s, r) => s + (r.views || 0), 0),   icon: Eye,       color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar recursos, temas, etiquetas..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary" />
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'explore',    label: 'Explorar' },
          { id: 'trending',   label: 'Tendencias 🔥' },
          { id: 'destacados', label: `Destacados ⭐${favCount > 0 ? ` (${favCount})` : ''}` },
          { id: 'mine',       label: 'Mis recursos' },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              section === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Subject filter — underline tab style */}
      <div className="flex gap-0 overflow-x-auto border-b border-border">
        {SUBJECTS_FILTER.map(s => (
          <button key={s} onClick={() => setSubjectFilter(s)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-all font-medium -mb-px ${
              subjectFilter === s
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Resource grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <p className="text-4xl mb-3">{section === 'destacados' ? '⭐' : '📚'}</p>
          <p className="text-muted-foreground">
            {section === 'destacados' ? 'No tienes recursos en Destacados aún — abre uno y agrégalo' :
             section === 'mine'       ? 'Aún no has subido recursos' :
                                        'No hay recursos con esos criterios'}
          </p>
          {section !== 'destacados' && (
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setShowUpload(true)}>
              Subir recurso
            </Button>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} recurso{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const licInfo = LICENSE_INFO[r.license] || LICENSE_INFO.free;
              const favd    = isFav(r);
              return (
                <motion.div key={r.id} whileHover={{ y: -2 }}
                  onClick={() => openResource(r)}
                  className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/50 transition-all cursor-pointer">

                  {/* Title row */}
                  <div className="flex items-start gap-3">
                    <div className="text-3xl shrink-0">{TYPE_INFO[r.type]?.emoji || '📄'}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight">{r.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.desc}</p>
                    </div>
                    {favd && <Bookmark className="h-4 w-4 text-yellow-400 shrink-0 fill-yellow-400 mt-0.5" />}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                    <span>{r.subject || 'General'}</span>
                    <span>•</span>
                    <span>{r.level}</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[r.author_role] || ROLE_COLOR.user}`}>
                      {ROLE_LABEL[r.author_role] || 'Estudiante'}
                    </span>
                  </div>

                  {/* Rating + Views */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="font-semibold">{r.rating_avg?.toFixed(1) || '—'}</span>
                      <span className="text-muted-foreground">({r.rating_count || 0})</span>
                    </div>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" /> {r.views || 0}
                    </span>
                  </div>

                  {/* Tags */}
                  {r.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {r.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Footer: license + edit buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${licInfo.color}`}>
                      {licInfo.label}
                    </span>
                    {canEdit(r) && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={e => { e.stopPropagation(); setEditResource(r); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={e => { e.stopPropagation(); deleteResource(r); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
