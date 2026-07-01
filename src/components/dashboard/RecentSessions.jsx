import { Link } from 'react-router-dom';
import { Clock, ArrowRight, CheckCircle } from 'lucide-react';
import moment from 'moment';

const typeLabels = {
  personalized: 'Estudio Entrelazado',
  selective: 'Selectiva',
  express: 'Express',
  duel: 'Duelo',
  tournament: 'Torneo',
  single_subject: 'Materia Única',
  difficulty: 'Por Dificultad',
  cognitive_skill: 'Habilidad Cognitiva',
  flashcard_custom: 'Flashcards',
  flashcard: 'Flashcard',
};

export default function RecentSessions({ sessions }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Sesiones Recientes
        </h3>
        <Link to="/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">Aún no has realizado ninguna sesión</p>
          <Link to="/study" className="text-primary text-sm hover:underline mt-2 inline-block">
            ¡Comienza a estudiar! →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                s.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                {s.accuracy ? `${s.accuracy}%` : '--'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{typeLabels[s.session_type] || s.session_type}</p>
                <p className="text-xs text-muted-foreground">{s.questions_total || 0} preguntas • {moment(s.created_date).fromNow()}</p>
              </div>
              <span className="text-xs font-medium text-primary">+{s.xp_earned || 0} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
