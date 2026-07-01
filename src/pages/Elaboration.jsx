import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, MessageSquare, ThumbsUp, Send, Trash2, Info, Award,
  Download, Eye, ArrowLeft, Music, Video, File, FileText, ImageIcon,
} from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// ─── helpers ────────────────────────────────────────────────────────────────

const ACCEPTED = '.jpg,.jpeg,.png,.mp3,.mp4,.pdf,.doc,.docx,.csv,.pptx,.xlsx';

const fileCategory = (att) => {
  const t = att.type || '';
  const n = (att.name || '').toLowerCase();
  if (t.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return 'image';
  if (t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(n)) return 'audio';
  if (t.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/.test(n)) return 'video';
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return 'other';
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote'],
    ['link'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'size', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'indent', 'align',
  'blockquote', 'link',
];

// ─── in-app file preview overlay ────────────────────────────────────────────

function FilePreviewOverlay({ attachment, onClose }) {
  const { url, name } = attachment;
  const cat = fileCategory(attachment);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 shrink-0">
          <ArrowLeft className="h-4 w-4" /> Volver al menú
        </Button>
        <span className="text-sm font-medium flex-1 truncate min-w-0">{name}</span>
        <a href={url} download={name} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <Download className="h-4 w-4" /> Descargar
          </Button>
        </a>
      </div>

      {/* preview area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-muted/30">
        {cat === 'image' && (
          <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
        )}
        {cat === 'audio' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="h-12 w-12 text-primary" />
            </div>
            <p className="font-medium">{name}</p>
            <audio controls src={url} className="w-80 max-w-full" />
          </div>
        )}
        {cat === 'video' && (
          <video
            controls
            src={url}
            className="max-w-full max-h-full rounded-xl shadow-lg"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          />
        )}
        {cat === 'pdf' && (
          <iframe
            src={url}
            title={name}
            className="w-full rounded-xl border border-border shadow-lg"
            style={{ height: 'calc(100vh - 120px)' }}
          />
        )}
        {cat === 'other' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <File className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo</p>
            <a href={url} download={name} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2 rounded-xl">
                <Download className="h-4 w-4" /> Descargar archivo
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── single attachment chip shown in post card ───────────────────────────────

function AttachmentItem({ att, onPreview }) {
  const cat = fileCategory(att);
  const Icon = cat === 'image' ? ImageIcon
    : cat === 'audio' ? Music
    : cat === 'video' ? Video
    : cat === 'pdf' ? FileText
    : File;

  return (
    <div className="flex flex-col gap-1">
      {cat === 'image' && (
        <img
          src={att.url}
          alt={att.name}
          className="h-28 w-auto max-w-[160px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onPreview(att)}
        />
      )}
      {cat !== 'image' && (
        <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 min-w-[180px] max-w-[260px]">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="text-xs truncate flex-1">{att.name}</span>
        </div>
      )}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 rounded-lg px-2"
          onClick={() => onPreview(att)}
        >
          <Eye className="h-3 w-3" /> Vista previa
        </Button>
        <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 rounded-lg px-2">
            <Download className="h-3 w-3" /> Descargar
          </Button>
        </a>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Elaboration() {
  const { profile, user } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', strategy_type: 'Analogía', subject: 'Neurociencias', attachments: [],
  });
  const [commentTexts, setCommentTexts] = useState({});
  const [voteReason, setVoteReason] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setLoading(true);
    const p = await base44.entities.ElaborationPost.list('-created_date', 100);
    setPosts(p ?? []);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Título y descripción son obligatorios');
      return;
    }
    setPublishing(true);
    try {
      await base44.entities.ElaborationPost.create({
        ...form,
        author_id: profile.user_id,
        author_name: profile.display_name,
        author_avatar: profile.avatar_emoji,
        votes_count: 0,
        voters: [],
        reactions: { heart: 0, fire: 0 },
        reaction_users: { heart: [], fire: [] },
        comments: [],
      });
      await base44.entities.UserProfile.update(profile.id, {
        elaboration_points: (profile.elaboration_points || 0) + 10,
      });
      toast.success('+10 puntos de Elaboración!');
      setShowCreate(false);
      setForm({ title: '', content: '', strategy_type: 'Analogía', subject: 'Neurociencias', attachments: [] });
      loadPosts();
    } catch {
      toast.error('Error al publicar. Intenta de nuevo.');
    } finally {
      setPublishing(false);
    }
  };

  const handleVote = async (post) => {
    const voters = [...(post.voters || [])];
    const existing = voters.findIndex(v => v.user_id === profile.user_id);
    for (const p of posts) {
      const pv = [...(p.voters || [])];
      const myIdx = pv.findIndex(v => v.user_id === profile.user_id);
      if (myIdx >= 0 && p.id !== post.id) {
        pv.splice(myIdx, 1);
        await base44.entities.ElaborationPost.update(p.id, { voters: pv, votes_count: pv.length });
      }
    }
    if (existing >= 0) {
      voters.splice(existing, 1);
      await base44.entities.ElaborationPost.update(post.id, { voters, votes_count: voters.length });
      loadPosts();
    } else {
      setShowVoteModal(post.id);
    }
  };

  const submitVote = async (postId) => {
    const post = posts.find(p => p.id === postId);
    const voters = (post.voters || []).filter(v => v.user_id !== profile.user_id);
    voters.push({ user_id: profile.user_id, reason: voteReason });
    await base44.entities.ElaborationPost.update(postId, { voters, votes_count: voters.length });
    await base44.entities.Notification.create({
      user_id: post.author_id,
      type: 'elaboration_vote',
      title: '👍 ¡Nuevo voto!',
      message: `${profile.display_name} votó por "${post.title}"`,
      is_read: false,
    });
    setShowVoteModal(null);
    setVoteReason('');
    loadPosts();
  };

  const handleReaction = async (post, type) => {
    const users = { heart: [], fire: [], ...(post.reaction_users || {}) };
    const reactions = { heart: 0, fire: 0, ...(post.reactions || {}) };
    const arr = [...(users[type] || [])];
    const idx = arr.indexOf(profile.user_id);
    if (idx >= 0) { arr.splice(idx, 1); reactions[type]--; }
    else { arr.push(profile.user_id); reactions[type]++; }
    users[type] = arr;
    await base44.entities.ElaborationPost.update(post.id, { reactions, reaction_users: users });
    loadPosts();
  };

  const addComment = async (post) => {
    const text = commentTexts[post.id];
    if (!text?.trim()) return;
    const comments = [...(post.comments || []), {
      id: Date.now().toString(),
      author_id: profile.user_id,
      author_name: profile.display_name,
      content: text,
      created_at: new Date().toISOString(),
    }];
    await base44.entities.ElaborationPost.update(post.id, { comments });
    await base44.entities.Notification.create({
      user_id: post.author_id,
      type: 'elaboration_comment',
      title: '💬 Nuevo comentario',
      message: `${profile.display_name} comentó en "${post.title}"`,
      is_read: false,
    });
    setCommentTexts(prev => ({ ...prev, [post.id]: '' }));
    loadPosts();
  };

  const deletePost = async (postId) => {
    await base44.entities.ElaborationPost.delete(postId);
    toast.success('Publicación eliminada');
    loadPosts();
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ url: file_url, name: file.name, type: file.type });
      }
      setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...uploaded] }));
      toast.success(`${uploaded.length} archivo(s) subido(s)`);
    } catch {
      toast.error('Error al subir archivos');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (idx) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  };

  return (
    <>
      {preview && <FilePreviewOverlay attachment={preview} onClose={() => setPreview(null)} />}

      <div className="max-w-3xl mx-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-space font-bold">💡 Concurso de Elaboración</h1>
            <p className="text-sm text-muted-foreground">Comparte tus estrategias de aprendizaje</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInfo(true)} className="rounded-xl" size="sm">
              <Info className="mr-2 h-4 w-4" /> Info
            </Button>
            <Button onClick={() => setShowCreate(true)} className="rounded-xl" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Publicar
            </Button>
          </div>
        </div>

        {/* prize banner */}
        <div className="bg-card/50 border border-primary/20 rounded-xl p-4 mb-6 text-center">
          <Award className="h-6 w-6 mx-auto text-primary mb-2" />
          <p className="text-sm font-medium">🏆 Hay un premio real, secreto y valioso para el ganador</p>
          <p className="text-xs text-muted-foreground mt-1">El ganador aún no ha sido anunciado — ¡Pronto se anunciará!</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <div className="text-5xl mb-3">💡</div>
            <p className="text-muted-foreground">Sé el primero en compartir tu estrategia</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const myVote = post.voters?.find(v => v.user_id === profile.user_id);
              const myHeart = post.reaction_users?.heart?.includes(profile.user_id);
              const myFire = post.reaction_users?.fire?.includes(profile.user_id);
              const canDelete = post.author_id === profile.user_id || user?.role === 'admin';
              return (
                <div key={post.id} className="bg-card border border-border rounded-xl p-5">
                  {/* author row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{post.author_avatar || '👤'}</span>
                      <div>
                        <p className="font-semibold text-sm">{post.author_name}</p>
                        <p className="text-xs text-muted-foreground">{moment(post.created_date).fromNow()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{post.strategy_type}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{post.subject}</span>
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePost(post.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg mb-2">{post.title}</h3>

                  <div
                    className="text-sm prose prose-sm dark:prose-invert max-w-none mb-3"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />

                  {post.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/50">
                      {post.attachments.map((att, i) => (
                        <AttachmentItem key={i} att={att} onPreview={setPreview} />
                      ))}
                    </div>
                  )}

                  {/* reactions row */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                    <Button
                      variant={myVote ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-xl gap-1"
                      onClick={() => handleVote(post)}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> {post.votes_count || 0}
                    </Button>
                    <button
                      onClick={() => handleReaction(post, 'heart')}
                      className={`flex items-center gap-1 text-sm transition-colors ${myHeart ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
                    >
                      ❤️ {post.reactions?.heart || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(post, 'fire')}
                      className={`flex items-center gap-1 text-sm transition-colors ${myFire ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-400'}`}
                    >
                      🔥 {post.reactions?.fire || 0}
                    </button>
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {post.comments?.length || 0}
                    </span>
                  </div>

                  {/* comments */}
                  {post.comments?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {post.comments.map(c => (
                        <div key={c.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                          <span className="font-semibold">{c.author_name}: </span>
                          {c.content}
                          <span className="text-xs text-muted-foreground ml-2">{moment(c.created_at).fromNow()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Input
                      value={commentTexts[post.id] || ''}
                      onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Escribe un comentario..."
                      className="rounded-xl text-sm"
                      onKeyDown={e => e.key === 'Enter' && addComment(post)}
                    />
                    <Button size="icon" onClick={() => addComment(post)} className="rounded-xl shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* vote reason modal */}
        <Dialog open={!!showVoteModal} onOpenChange={() => setShowVoteModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>¿Por qué votaste por esta estrategia?</DialogTitle></DialogHeader>
            <Textarea
              value={voteReason}
              onChange={e => setVoteReason(e.target.value)}
              placeholder="Tu razón..."
              className="rounded-xl"
            />
            <Button onClick={() => submitVote(showVoteModal)} className="rounded-xl">Enviar voto</Button>
          </DialogContent>
        </Dialog>

        {/* create post modal */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Estrategia de Elaboración</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 rounded-xl"
                  placeholder="Dale un nombre a tu estrategia"
                />
              </div>

              <div>
                <Label>Descripción *</Label>
                <div className="mt-1 rounded-xl overflow-hidden border border-border quill-dark">
                  <ReactQuill
                    theme="snow"
                    value={form.content}
                    onChange={v => setForm(prev => ({ ...prev, content: v }))}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Describe tu estrategia de elaboración..."
                    style={{ minHeight: 180 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de estrategia</Label>
                  <Select
                    value={form.strategy_type}
                    onValueChange={v => setForm(prev => ({ ...prev, strategy_type: v }))}
                  >
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Analogía', 'Mnemotecnia', 'Mapa Conceptual', 'Resumen', 'Explicación en Audio', 'Otro'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Materia</Label>
                  <Select
                    value={form.subject}
                    onValueChange={v => setForm(prev => ({ ...prev, subject: v }))}
                  >
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Neurociencias">Neurociencias</SelectItem>
                      <SelectItem value="Cuidados de la Salud">Cuidados de la Salud</SelectItem>
                      <SelectItem value="Ciencias Biomédicas">Ciencias Biomédicas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Adjuntos</Label>
                <p className="text-xs text-muted-foreground mb-2">JPG, PNG, MP3, MP4, PDF, DOC, DOCX, CSV, PPTX, XLSX</p>
                <label className="inline-flex cursor-pointer">
                  <div className="flex items-center gap-2 bg-muted hover:bg-muted/80 transition-colors px-4 py-2 rounded-xl text-sm font-medium">
                    {uploading
                      ? <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Subiendo...</>
                      : <><Plus className="h-4 w-4" /> Agregar archivos</>
                    }
                  </div>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED}
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                </label>

                {form.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg text-xs">
                        <span className="truncate max-w-[140px]">{a.name}</span>
                        <button
                          onClick={() => removeAttachment(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handlePublish}
                className="w-full rounded-xl"
                disabled={publishing || uploading}
              >
                {publishing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Publicando...</>
                  : 'Publicar Estrategia (+10 pts Elaboración)'
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* info modal */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>💡 Sobre el Concurso de Elaboración</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <p><strong>¿Qué es?</strong> Un espacio para compartir estrategias de aprendizaje con todos los usuarios.</p>
              <p><strong>¿Por qué es importante?</strong> La elaboración es una técnica cognitiva que mejora la retención y comprensión profunda.</p>
              <p><strong>Votación:</strong> Cada usuario tiene 1 voto. Puedes cambiar tu voto en cualquier momento.</p>
              <p><strong>Adjuntos:</strong> Puedes adjuntar imágenes, audio, video, PDF y documentos de office.</p>
              <p><strong>Reglas:</strong> Sé respetuoso. Comparte estrategias originales y útiles.</p>
              <p className="text-primary font-medium">🏆 ¡Hay un premio real para el ganador!</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
