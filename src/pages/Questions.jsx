import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, Flag, Trash2, Edit2, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import CreateQuestionModal from '../components/questions/CreateQuestionModal';
import EditQuestionModal from '../components/questions/EditQuestionModal';
import { toast } from "sonner";

const typeLabels = {
  multiple_choice: 'Opción Múltiple', true_false: 'V/F', fill_blank: 'Llenar Espacios',
  order_sequence: 'Ordenar', matching: 'Matching', development: 'Desarrollo',
  clinical_case: 'Caso Clínico', flashcard: 'Flashcard',
};

const PAGE_SIZE = 30;

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-sm leading-none transition-all"
        >
          <span className={(hover || value) >= n ? 'text-yellow-400' : 'text-muted-foreground/30'}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function Questions() {
  const { profile, user, setProfile } = useOutletContext();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    setLoading(true);
    const qs = await base44.entities.Question.list('-created_date', 1000);
    setQuestions(qs);
    setLoading(false);
  };

  const filtered = questions.filter(q => {
    if (search && !q.statement?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject !== 'all' && q.subject !== filterSubject) return false;
    if (filterType !== 'all' && q.type !== filterType) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleExport = () => {
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'neurolearn_questions.json'; a.click();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await base44.entities.Question.delete(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast.success('Pregunta eliminada');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} preguntas seleccionadas?`)) return;
    for (const id of selected) {
      await base44.entities.Question.delete(id);
    }
    setQuestions(prev => prev.filter(q => !selected.has(q.id)));
    setSelected(new Set());
    toast.success(`${selected.size} preguntas eliminadas`);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pageIds = new Set(paginated.map(q => q.id));
    const allSelected = paginated.every(q => selected.has(q.id));
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); pageIds.forEach(id => n.add(id)); return n; });
    }
  };

  const handleDifficultyChange = async (questionId, stars) => {
    if (!profile) return;
    const newRatings = { ...(profile.difficulty_ratings || {}), [questionId]: stars };
    await base44.entities.UserProfile.update(profile.id, { difficulty_ratings: newRatings });
    setProfile(prev => ({ ...prev, difficulty_ratings: newRatings }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-space font-bold">🧠 Banco de Preguntas</h1>
          <p className="text-sm text-muted-foreground">{questions.length} preguntas en el banco</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && isAdminOrMentor && (
            <Button variant="destructive" onClick={handleBulkDelete} size="sm" className="rounded-xl gap-2">
              <Trash2 className="h-4 w-4" /> Eliminar {selected.size}
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} className="rounded-xl" size="sm">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          {isAdminOrMentor && (
            <Button onClick={() => setShowCreate(true)} className="rounded-xl" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Crear Pregunta
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar preguntas..." className="pl-10 rounded-xl" />
        </div>
        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue placeholder="Materia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las materias</SelectItem>
            <SelectItem value="Neurociencias">Neurociencias</SelectItem>
            <SelectItem value="Cuidados de la Salud">Cuidados de la Salud</SelectItem>
            <SelectItem value="Ciencias Biomédicas">Ciencias Biomédicas</SelectItem>
            <SelectItem value="Otras">Otras</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-muted-foreground">No se encontraron preguntas</p>
          {isAdminOrMentor && <Button onClick={() => setShowCreate(true)} className="mt-4 rounded-xl"><Plus className="mr-2 h-4 w-4" /> Crear primera pregunta</Button>}
        </div>
      ) : (
        <>
          {/* Page header with select all */}
          {isAdminOrMentor && (
            <div className="flex items-center justify-between mb-2 px-1">
              <button onClick={selectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {paginated.every(q => selected.has(q.id)) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                Seleccionar todo ({PAGE_SIZE})
              </button>
              <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages || 1} · {filtered.length} resultados</span>
            </div>
          )}

          <div className="space-y-2">
            {paginated.map(q => {
              const personalDiff = profile?.difficulty_ratings?.[q.id] || 0;
              const isSelected = selected.has(q.id);
              return (
                <div key={q.id} className={`bg-card border rounded-xl p-4 hover:shadow-sm transition-all ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-start gap-3">
                    {isAdminOrMentor && (
                      <button onClick={() => toggleSelect(q.id)} className="mt-0.5 shrink-0">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{q.statement}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{typeLabels[q.type] || q.type}</Badge>
                        <Badge variant="outline" className="text-xs">{q.subject}</Badge>
                        {q.origin && <Badge variant="outline" className="text-xs capitalize">{q.origin}</Badge>}
                        <StarRating value={personalDiff} onChange={(v) => handleDifficultyChange(q.id, v)} />
                        {personalDiff === 0 && <span className="text-xs text-muted-foreground/50">Sin clasificar</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {q.is_reported && <Flag className="h-4 w-4 text-red-500" />}
                      {isAdminOrMentor && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditQuestion(q)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`h-9 w-9 rounded-xl text-sm font-medium transition-all ${i === page ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                  {i + 1}
                </button>
              ))}
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="rounded-xl">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateQuestionModal onClose={() => setShowCreate(false)} onCreated={loadQuestions} />}
      {editQuestion && <EditQuestionModal question={editQuestion} onClose={() => setEditQuestion(null)} onUpdated={loadQuestions} />}
    </div>
  );
}
