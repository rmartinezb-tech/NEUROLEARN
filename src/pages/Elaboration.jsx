import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Heart, Flame, MessageSquare, ThumbsUp, Send, Trash2, Info, Award } from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';
import ReactQuill from 'react-quill';

export default function Elaboration() {
  const { profile, user } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', strategy_type: 'Analogía', subject: 'Neurociencias', attachments: [] });
  const [commentTexts, setCommentTexts] = useState({});
  const [voteReason, setVoteReason] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(null);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const p = await base44.entities.ElaborationPost.list('-created_date', 100);
    setPosts(p);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Título y descripción son obligatorios'); return; }
    await base44.entities.ElaborationPost.create({
      ...form,
      author_id: profile.user_id,
      author_name: profile.display_name,
      author_avatar: profile.avatar_emoji,
      votes_count: 0, voters: [],
      reactions: { heart: 0, fire: 0 },
      reaction_users: { heart: [], fire: [] },
      comments: [],
    });
    // +10 elaboration points
    await base44.entities.UserProfile.update(profile.id, {
      elaboration_points: (profile.elaboration_points || 0) + 10,
    });
    toast.success('+10 puntos de Elaboración!');
    setShowCreate(false);
    setForm({ title: '', content: '', strategy_type: 'Analogía', subject: 'Neurociencias', attachments: [] });
    loadPosts();
  };

  const handleVote = async (post) => {
    const voters = post.voters || [];
    const existing = voters.findIndex(v => v.user_id === profile.user_id);
    
    // Remove previous vote from any post
    for (const p of posts) {
      const pVoters = p.voters || [];
      const myVote = pVoters.findIndex(v => v.user_id === profile.user_id);
      if (myVote >= 0 && p.id !== post.id) {
        pVoters.splice(myVote, 1);
        await base44.entities.ElaborationPost.update(p.id, { voters: pVoters, votes_count: pVoters.length });
      }
    }

    if (existing >= 0) {
      voters.splice(existing, 1);
      await base44.entities.ElaborationPost.update(post.id, { voters, votes_count: voters.length });
    } else {
      setShowVoteModal(post.id);
    }
    loadPosts();
  };

  const submitVote = async (postId) => {
    const post = posts.find(p => p.id === postId);
    const voters = (post.voters || []).filter(v => v.user_id !== profile.user_id);
    voters.push({ user_id: profile.user_id, reason: voteReason });
    await base44.entities.ElaborationPost.update(postId, { voters, votes_count: voters.length });
    
    await base44.entities.Notification.create({
      user_id: post.author_id, type: 'elaboration_vote',
      title: '👍 ¡Nuevo voto!', message: `${profile.display_name} votó por "${post.title}"`,
      is_read: false,
    });
    
    setShowVoteModal(null);
    setVoteReason('');
    loadPosts();
  };

  const handleReaction = async (post, type) => {
    const users = { ...(post.reaction_users || { heart: [], fire: [] }) };
    const reactions = { ...(post.reactions || { heart: 0, fire: 0 }) };
    const arr = users[type] || [];
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
      user_id: post.author_id, type: 'elaboration_comment',
      title: '💬 Nuevo comentario', message: `${profile.display_name} comentó en "${post.title}"`,
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
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, name: file.name, type: file.type });
    }
    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...uploaded] }));
  };

  return (
    <div className="max-w-3xl mx-auto">
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

      <div className="bg-card/50 border border-primary/20 rounded-xl p-4 mb-6 text-center">
        <Award className="h-6 w-6 mx-auto text-primary mb-2" />
        <p className="text-sm font-medium">🏆 Hay un premio real, secreto y valioso para el ganador</p>
        <p className="text-xs text-muted-foreground mt-1">El ganador aún no ha sido anunciado — ¡Pronto se anunciará!</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
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
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{post.author_avatar || '👤'}</span>
                    <div>
                      <p className="font-semibold text-sm">{post.author_name}</p>
                      <p className="text-xs text-muted-foreground">{moment(post.created_date).fromNow()} • {post.strategy_type} • {post.subject}</p>
                    </div>
                  </div>
                  {canDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePost(post.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>

                <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />

                {post.attachments?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {post.attachments.map((a, i) => (
                      a.type?.startsWith('image/') ? (
                        <img key={i} src={a.url} alt={a.name} className="h-32 rounded-lg cursor-pointer hover:scale-105 transition-transform" />
                      ) : (
                        <a key={i} href={a.url} target="_blank" rel="noopener" className="text-xs bg-muted px-3 py-1.5 rounded-lg hover:bg-muted/80">{a.name}</a>
                      )
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                  <Button variant={myVote ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => handleVote(post)}>
                    <ThumbsUp className="mr-1 h-3 w-3" /> {post.votes_count || 0}
                  </Button>
                  <button onClick={() => handleReaction(post, 'heart')} className={`flex items-center gap-1 text-sm ${myHeart ? 'text-red-500' : 'text-muted-foreground'}`}>
                    ❤️ {post.reactions?.heart || 0}
                  </button>
                  <button onClick={() => handleReaction(post, 'fire')} className={`flex items-center gap-1 text-sm ${myFire ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    🔥 {post.reactions?.fire || 0}
                  </button>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {post.comments?.length || 0}
                  </span>
                </div>

                {/* Comments */}
                {post.comments?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {post.comments.map(c => (
                      <div key={c.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                        <span className="font-semibold">{c.author_name}: </span>{c.content}
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

      {/* Vote reason modal */}
      <Dialog open={!!showVoteModal} onOpenChange={() => setShowVoteModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Por qué votaste por esta estrategia?</DialogTitle></DialogHeader>
          <Textarea value={voteReason} onChange={e => setVoteReason(e.target.value)} placeholder="Tu razón..." className="rounded-xl" />
          <Button onClick={() => submitVote(showVoteModal)} className="rounded-xl">Enviar voto</Button>
        </DialogContent>
      </Dialog>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Estrategia de Elaboración</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Descripción *</Label>
              <div className="mt-1 border border-border rounded-xl overflow-hidden quill-bottom-toolbar">
                <ReactQuill 
                  value={form.content} 
                  onChange={v => setForm(prev => ({ ...prev, content: v }))} 
                  modules={{
                    toolbar: {
                      container: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ color: [] }, { background: [] }],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ indent: '-1' }, { indent: '+1' }],
                        [{ align: [] }],
                        [{ size: ['small', false, 'large', 'huge'] }],
                        ['blockquote', 'code-block'],
                        ['link'],
                        ['clean'],
                      ]
                    }
                  }}
                  formats={['header','bold','italic','underline','strike','color','background','list','bullet','indent','align','size','blockquote','code-block','link']}
                  style={{ minHeight: 160 }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de estrategia</Label>
                <Select value={form.strategy_type} onValueChange={v => setForm(prev => ({ ...prev, strategy_type: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Analogía', 'Mnemotecnia', 'Mapa Conceptual', 'Resumen', 'Explicación en Audio', 'Otro'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Materia</Label>
                <Select value={form.subject} onValueChange={v => setForm(prev => ({ ...prev, subject: v }))}>
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
              <Label>Adjuntos (JPG, PNG, MP3, PDF, DOC)</Label>
              <input type="file" multiple accept=".jpg,.jpeg,.png,.mp3,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="mt-1 text-sm" />
              {form.attachments.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{form.attachments.map((a, i) => <span key={i} className="text-xs bg-muted px-2 py-1 rounded">{a.name}</span>)}</div>}
            </div>
            <Button onClick={handlePublish} className="w-full rounded-xl">Publicar Estrategia (+10 pts Elaboración)</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info modal */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>💡 Sobre el Concurso de Elaboración</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p><strong>¿Qué es?</strong> Un espacio para compartir estrategias de aprendizaje con todos los usuarios.</p>
            <p><strong>¿Por qué es importante?</strong> La elaboración es una técnica cognitiva que mejora la retención y comprensión profunda.</p>
            <p><strong>Votación:</strong> Cada usuario tiene 1 voto. Puedes cambiar tu voto en cualquier momento.</p>
            <p><strong>Adjuntos:</strong> Puedes adjuntar imágenes, audio, PDF y documentos de texto.</p>
            <p><strong>Reglas:</strong> Sé respetuoso. Comparte estrategias originales y útiles.</p>
            <p className="text-primary font-medium">🏆 ¡Hay un premio real para el ganador!</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
