import { Target } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function WeeklyGoals({ profile }) {
  const goals = profile.weekly_goals || { sessions_target: 5, questions_target: 100, minutes_target: 120 };
  const completed = profile.total_sessions || 0;
  const answered = profile.total_questions_answered || 0;

  const items = [
    { label: 'Sesiones', current: Math.min(completed, goals.sessions_target), target: goals.sessions_target, color: 'bg-primary' },
    { label: 'Preguntas', current: Math.min(answered, goals.questions_target), target: goals.questions_target, color: 'bg-green-500' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" /> Metas Semanales
      </h3>
      <div className="space-y-4">
        {items.map(g => {
          const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
          return (
            <div key={g.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{g.label}</span>
                <span className="text-xs font-medium">{g.current}/{g.target}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${g.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
