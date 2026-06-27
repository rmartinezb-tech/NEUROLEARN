import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Eye } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Reports() {
  const { user } = useOutletContext();
  const [reports, setReports] = useState([]);
  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'mentor') {
      loadReports();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadReports = async () => {
    const r = await base44.entities.QuestionReport.list('-created_date', 100);
    setReports(r);
    const qIds = [...new Set(r.map(rep => rep.question_id))];
    const qMap = {};
    for (const qid of qIds) {
      const res = await base44.entities.Question.filter({ id: qid });
      if (res.length > 0) qMap[qid] = res[0];
    }
    setQuestions(qMap);
    setLoading(false);
  };

  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';

  if (!isAdminOrMentor) return (
    <div className="text-center py-20"><div className="text-5xl mb-4">🔒</div><p className="text-muted-foreground">Solo Admin y Mentor pueden acceder a los reportes.</p></div>
  );

  const resolve = async (report) => {
    await base44.entities.QuestionReport.update(report.id, { status: 'resolved', resolved_by: user?.id });
    await base44.entities.Question.update(report.question_id, { is_reported: false });
    toast.success('Reporte resuelto');
    loadReports();
  };

  const deleteQuestion = async (report) => {
    await base44.entities.Question.delete(report.question_id);
    await base44.entities.QuestionReport.update(report.id, { status: 'resolved', resolved_by: user?.id });
    toast.success('Pregunta eliminada');
    loadReports();
  };

  const pending = reports.filter(r => r.status === 'pending');
  const resolved = reports.filter(r => r.status === 'resolved');

  const ReportCard = ({ r }) => {
    const q = questions[r.question_id];
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Pregunta reportada</p>
            <p className="font-medium text-sm line-clamp-2">{q?.statement || 'Cargando...'}</p>
          </div>
          <Badge variant={r.status === 'pending' ? 'destructive' : 'outline'} className="ml-2 shrink-0">
            {r.status === 'pending' ? 'Pendiente' : 'Resuelto'}
          </Badge>
        </div>
        <p className="text-xs bg-muted/50 rounded-lg p-2 mt-2"><strong>Razón:</strong> {r.reason} {r.custom_reason ? `— ${r.custom_reason}` : ''}</p>
        {r.status === 'pending' && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setSelected(q)} className="rounded-xl"><Eye className="mr-1 h-3 w-3" />Ver</Button>
            <Button size="sm" onClick={() => resolve(r)} className="rounded-xl"><CheckCircle className="mr-1 h-3 w-3" />Resolver</Button>
            <Button size="sm" variant="destructive" onClick={() => deleteQuestion(r)} className="rounded-xl">Eliminar</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-space font-bold mb-6">🚩 Reportes de Preguntas</h1>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending" className="flex-1">Pendientes ({pending.length})</TabsTrigger>
            <TabsTrigger value="resolved" className="flex-1">Resueltos ({resolved.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pending.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-xl">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-muted-foreground">No hay reportes pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">{pending.map(r => <ReportCard key={r.id} r={r} />)}</div>
            )}
          </TabsContent>
          <TabsContent value="resolved">
            {resolved.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin reportes resueltos</p>
            ) : (
              <div className="space-y-3">{resolved.map(r => <ReportCard key={r.id} r={r} />)}</div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Vista previa de pregunta</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <p className="font-medium">{selected.statement}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{selected.type}</Badge>
                <Badge variant="outline">{selected.subject}</Badge>
                {selected.difficulty_suggested && <Badge variant="outline">Dificultad {selected.difficulty_suggested}/5</Badge>}
              </div>
              {selected.options?.length > 0 && (
                <div className="space-y-1">
                  {selected.options.map((opt, i) => (
                    <div key={i} className={`text-sm p-2 rounded-lg ${opt === selected.correct_answer ? 'bg-green-500/10 text-green-700 font-medium' : 'bg-muted/50'}`}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              )}
              {selected.explanation && <p className="text-sm text-muted-foreground">💡 {selected.explanation}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
