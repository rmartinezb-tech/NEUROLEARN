import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { COGNITIVE_SKILLS } from '../study/SessionConfigHelpers';
import { toast } from "sonner";

export default function CreateQuestionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    statement: '', type: 'multiple_choice', subject: 'Neurociencias', cognitive_skill: '',
    options: ['', '', '', ''], correct_answer: '', correct_index: 0,
    explanation: '', hints: '', difficulty_suggested: 3,
    flashcard_back: '', image_url: '', audio_url: '', video_url: '',
    status: 'active', origin: 'manual',
    sequence_order: ['', '', ''],
    matching_pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }],
  });
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.statement.trim()) { toast.error('El enunciado es obligatorio'); return; }
    if (!form.subject) { toast.error('La materia es obligatoria'); return; }
    if (form.type === 'multiple_choice' && form.options.filter(o => o.trim()).length < 2) {
      toast.error('Se necesitan al menos 2 opciones'); return;
    }
    if (form.type === 'order_sequence' && form.sequence_order.filter(s => s.trim()).length < 2) {
      toast.error('Se necesitan al menos 2 elementos en la secuencia'); return;
    }
    if (form.type === 'matching') {
      const validPairs = form.matching_pairs.filter(p => p.left.trim() && p.right.trim());
      if (validPairs.length < 5) { toast.error('El matching requiere al menos 5 pares completos'); return; }
    }

    setSaving(true);
    const data = { ...form };

    if (form.type === 'multiple_choice') {
      data.options = form.options.filter(o => o.trim());
      data.correct_answer = data.options[form.correct_index] || data.options[0];
    }
    if (form.type === 'true_false') {
      data.options = ['Verdadero', 'Falso'];
    }
    if (form.type === 'order_sequence') {
      data.sequence_order = form.sequence_order.filter(s => s.trim());
      data.correct_answer = data.sequence_order.join(' → ');
    }
    if (form.type === 'matching') {
      data.matching_pairs = form.matching_pairs.filter(p => p.left.trim() && p.right.trim());
      data.correct_answer = data.matching_pairs.map(p => `${p.left} = ${p.right}`).join('; ');
    }

    await base44.entities.Question.create(data);
    toast.success('Pregunta creada exitosamente');
    setSaving(false);
    onCreated();
    onClose();
  };

  const handleMediaUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update(field, file_url);
    e.target.value = '';
  };

  const moveSeq = (idx, dir) => {
    const seq = [...form.sequence_order];
    const target = idx + dir;
    if (target < 0 || target >= seq.length) return;
    [seq[idx], seq[target]] = [seq[target], seq[idx]];
    update('sequence_order', seq);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Pregunta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de pregunta *</Label>
              <Select value={form.type} onValueChange={v => update('type', v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Opción Múltiple</SelectItem>
                  <SelectItem value="true_false">Verdadero / Falso</SelectItem>
                  <SelectItem value="fill_blank">Llenar Espacios</SelectItem>
                  <SelectItem value="order_sequence">Ordenar Secuencia</SelectItem>
                  <SelectItem value="matching">Matching</SelectItem>
                  <SelectItem value="development">Desarrollo</SelectItem>
                  <SelectItem value="clinical_case">Caso Clínico</SelectItem>
                  <SelectItem value="flashcard">Flashcard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Materia *</Label>
              <Select value={form.subject} onValueChange={v => update('subject', v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Neurociencias">Neurociencias</SelectItem>
                  <SelectItem value="Cuidados de la Salud">Cuidados de la Salud</SelectItem>
                  <SelectItem value="Ciencias Biomédicas">Ciencias Biomédicas</SelectItem>
                  <SelectItem value="Otras">Otras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Habilidad cognitiva <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={form.cognitive_skill || ''} onValueChange={v => update('cognitive_skill', v === '__none__' ? '' : v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Sin clasificar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin clasificar</SelectItem>
                  {COGNITIVE_SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Enunciado *</Label>
            <Textarea value={form.statement} onChange={e => update('statement', e.target.value)} className="mt-1 rounded-xl" placeholder="Escribe el enunciado de la pregunta..." />
          </div>

          {/* Multiple choice */}
          {form.type === 'multiple_choice' && (
            <div>
              <Label>Opciones de respuesta <span className="text-xs text-muted-foreground">(haz clic en la letra para marcar correcta)</span></Label>
              <div className="space-y-2 mt-1">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => update('correct_index', i)} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${form.correct_index === i ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; update('options', opts); }} placeholder={`Opción ${String.fromCharCode(65 + i)}`} className="rounded-xl" />
                    {form.options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => { const opts = form.options.filter((_, j) => j !== i); update('options', opts); if (form.correct_index >= opts.length) update('correct_index', 0); }} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {form.options.length < 6 && (
                  <Button variant="outline" size="sm" onClick={() => update('options', [...form.options, ''])} className="rounded-xl">
                    <Plus className="mr-2 h-3 w-3" /> Agregar opción
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* True/False */}
          {form.type === 'true_false' && (
            <div>
              <Label>Respuesta correcta</Label>
              <Select value={form.correct_answer} onValueChange={v => update('correct_answer', v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verdadero">Verdadero</SelectItem>
                  <SelectItem value="Falso">Falso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fill blank / Development / Clinical */}
          {['fill_blank', 'development', 'clinical_case'].includes(form.type) && (
            <div>
              <Label>Respuesta correcta / Guía</Label>
              <Textarea value={form.correct_answer} onChange={e => update('correct_answer', e.target.value)} className="mt-1 rounded-xl" placeholder="Respuesta esperada..." />
            </div>
          )}

          {/* Flashcard */}
          {form.type === 'flashcard' && (
            <div>
              <Label>Reverso de la flashcard</Label>
              <Textarea value={form.flashcard_back} onChange={e => update('flashcard_back', e.target.value)} className="mt-1 rounded-xl" placeholder="Contenido del reverso..." />
            </div>
          )}

          {/* Order sequence */}
          {form.type === 'order_sequence' && (
            <div>
              <Label>Elementos de la secuencia <span className="text-xs text-muted-foreground">(orden correcto de arriba a abajo)</span></Label>
              <div className="space-y-2 mt-1">
                {form.sequence_order.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <Input value={item} onChange={e => { const seq = [...form.sequence_order]; seq[i] = e.target.value; update('sequence_order', seq); }} placeholder={`Paso ${i + 1}`} className="rounded-xl flex-1" />
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveSeq(i, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => moveSeq(i, 1)} disabled={i === form.sequence_order.length - 1} className="p-0.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                    {form.sequence_order.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => { const seq = form.sequence_order.filter((_, j) => j !== i); update('sequence_order', seq); }} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => update('sequence_order', [...form.sequence_order, ''])} className="rounded-xl">
                  <Plus className="mr-2 h-3 w-3" /> Agregar elemento
                </Button>
              </div>
            </div>
          )}

          {/* Matching */}
          {form.type === 'matching' && (
            <div>
              <Label>Pares de Matching <span className="text-xs text-muted-foreground">(mínimo 5 pares completos)</span></Label>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Columna A (Izquierda)</p>
                  <p className="text-xs font-medium text-muted-foreground px-1">Columna B (Derecha)</p>
                </div>
                {form.matching_pairs.map((pair, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-center">
                    <Input value={pair.left} onChange={e => { const pairs = [...form.matching_pairs]; pairs[i] = { ...pairs[i], left: e.target.value }; update('matching_pairs', pairs); }} placeholder={`A${i + 1}`} className="rounded-xl" />
                    <div className="flex items-center gap-2">
                      <Input value={pair.right} onChange={e => { const pairs = [...form.matching_pairs]; pairs[i] = { ...pairs[i], right: e.target.value }; update('matching_pairs', pairs); }} placeholder={`B${i + 1}`} className="rounded-xl flex-1" />
                      {form.matching_pairs.length > 5 && (
                        <Button variant="ghost" size="icon" onClick={() => { const pairs = form.matching_pairs.filter((_, j) => j !== i); update('matching_pairs', pairs); }} className="h-8 w-8 text-destructive shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => update('matching_pairs', [...form.matching_pairs, { left: '', right: '' }])} className="rounded-xl">
                  <Plus className="mr-2 h-3 w-3" /> Agregar par
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>Explicación (opcional)</Label>
            <Textarea value={form.explanation} onChange={e => update('explanation', e.target.value)} className="mt-1 rounded-xl" placeholder="Explicación de la respuesta..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Pistas (opcional)</Label>
              <Input value={form.hints} onChange={e => update('hints', e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Dificultad sugerida</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => update('difficulty_suggested', n)} className={`h-8 w-8 rounded-md text-sm font-bold ${form.difficulty_suggested === n ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Media attachments */}
          <div className="space-y-3">
            <Label>Archivos multimedia (opcional)</Label>

            {/* Image / GIF */}
            <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border">
              <span className="text-lg shrink-0">🖼️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">Imagen / GIF</p>
                <input type="file" accept="image/*" onChange={e => handleMediaUpload(e, 'image_url')} className="text-xs w-full" />
                {form.image_url && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.image_url} alt="" className="h-20 rounded-lg object-contain" />
                    <button onClick={() => update('image_url', '')} className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">×</button>
                  </div>
                )}
              </div>
            </div>

            {/* Audio */}
            <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border">
              <span className="text-lg shrink-0">🎵</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">Audio (MP3, WAV, OGG)</p>
                <input type="file" accept="audio/*" onChange={e => handleMediaUpload(e, 'audio_url')} className="text-xs w-full" />
                {form.audio_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <audio controls className="h-8 flex-1"><source src={form.audio_url} /></audio>
                    <button onClick={() => update('audio_url', '')} className="h-5 w-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center shrink-0">×</button>
                  </div>
                )}
              </div>
            </div>

            {/* Video */}
            <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border">
              <span className="text-lg shrink-0">🎬</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">Video (MP4, WebM)</p>
                <input type="file" accept="video/*" onChange={e => handleMediaUpload(e, 'video_url')} className="text-xs w-full" />
                {form.video_url && (
                  <div className="mt-2 relative">
                    <video controls className="w-full max-h-32 rounded-lg bg-black"><source src={form.video_url} /></video>
                    <button onClick={() => update('video_url', '')} className="absolute top-1 right-1 h-5 w-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">×</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Guardar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
