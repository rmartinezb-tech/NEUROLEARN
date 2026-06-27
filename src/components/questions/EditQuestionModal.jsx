import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from "sonner";

export default function EditQuestionModal({ question, onClose, onUpdated }) {
  const [form, setForm] = useState({
    ...question,
    options: question.options || ['', '', '', ''],
    correct_index: question.options ? Math.max(0, question.options.indexOf(question.correct_answer)) : 0,
    sequence_order: question.sequence_order || ['', '', ''],
    matching_pairs: question.matching_pairs || [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }],
  });
  const [saving, setSaving] = useState(false);
  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.statement.trim()) { toast.error('El enunciado es obligatorio'); return; }
    setSaving(true);
    const data = { ...form };
    if (form.type === 'multiple_choice') {
      data.options = form.options.filter(o => o.trim());
      data.correct_answer = data.options[form.correct_index] || data.options[0];
    }
    if (form.type === 'true_false') data.options = ['Verdadero', 'Falso'];
    if (form.type === 'order_sequence') {
      data.sequence_order = form.sequence_order.filter(s => s.trim());
      data.correct_answer = data.sequence_order.join(' → ');
    }
    if (form.type === 'matching') {
      data.matching_pairs = form.matching_pairs.filter(p => p.left.trim() && p.right.trim());
      data.correct_answer = data.matching_pairs.map(p => `${p.left} = ${p.right}`).join('; ');
    }
    await base44.entities.Question.update(question.id, data);
    toast.success('Pregunta actualizada');
    setSaving(false);
    onUpdated();
    onClose();
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
          <DialogTitle>Editar Pregunta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
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
          </div>

          <div>
            <Label>Enunciado *</Label>
            <Textarea value={form.statement} onChange={e => update('statement', e.target.value)} className="mt-1 rounded-xl" />
          </div>

          {form.type === 'multiple_choice' && (
            <div>
              <Label>Opciones</Label>
              <div className="space-y-2 mt-1">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => update('correct_index', i)} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${form.correct_index === i ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; update('options', opts); }} className="rounded-xl" />
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

          {form.type === 'true_false' && (
            <div>
              <Label>Respuesta correcta</Label>
              <Select value={form.correct_answer} onValueChange={v => update('correct_answer', v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verdadero">Verdadero</SelectItem>
                  <SelectItem value="Falso">Falso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {['fill_blank', 'development', 'clinical_case'].includes(form.type) && (
            <div>
              <Label>Respuesta / Guía</Label>
              <Textarea value={form.correct_answer} onChange={e => update('correct_answer', e.target.value)} className="mt-1 rounded-xl" />
            </div>
          )}

          {form.type === 'flashcard' && (
            <div>
              <Label>Reverso de flashcard</Label>
              <Textarea value={form.flashcard_back} onChange={e => update('flashcard_back', e.target.value)} className="mt-1 rounded-xl" />
            </div>
          )}

          {form.type === 'order_sequence' && (
            <div>
              <Label>Secuencia (orden correcto)</Label>
              <div className="space-y-2 mt-1">
                {form.sequence_order.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <Input value={item} onChange={e => { const seq = [...form.sequence_order]; seq[i] = e.target.value; update('sequence_order', seq); }} className="rounded-xl flex-1" />
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveSeq(i, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => moveSeq(i, 1)} disabled={i === form.sequence_order.length - 1} className="p-0.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                    {form.sequence_order.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => update('sequence_order', form.sequence_order.filter((_, j) => j !== i))} className="h-8 w-8 text-destructive">
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

          {form.type === 'matching' && (
            <div>
              <Label>Pares de Matching</Label>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Columna A</p>
                  <p className="text-xs font-medium text-muted-foreground px-1">Columna B</p>
                </div>
                {form.matching_pairs.map((pair, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-center">
                    <Input value={pair.left} onChange={e => { const pairs = [...form.matching_pairs]; pairs[i] = { ...pairs[i], left: e.target.value }; update('matching_pairs', pairs); }} placeholder={`A${i + 1}`} className="rounded-xl" />
                    <div className="flex items-center gap-2">
                      <Input value={pair.right} onChange={e => { const pairs = [...form.matching_pairs]; pairs[i] = { ...pairs[i], right: e.target.value }; update('matching_pairs', pairs); }} placeholder={`B${i + 1}`} className="rounded-xl flex-1" />
                      {form.matching_pairs.length > 5 && (
                        <Button variant="ghost" size="icon" onClick={() => update('matching_pairs', form.matching_pairs.filter((_, j) => j !== i))} className="h-8 w-8 text-destructive shrink-0">
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
            <Label>Explicación</Label>
            <Textarea value={form.explanation || ''} onChange={e => update('explanation', e.target.value)} className="mt-1 rounded-xl" />
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
