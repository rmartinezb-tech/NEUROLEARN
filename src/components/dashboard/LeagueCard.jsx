import { Award } from 'lucide-react';

export default function LeagueCard({ league, sabers }) {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" /> Liga Actual
      </h3>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{league.emoji}</span>
        <div>
          <p className={`text-lg font-bold ${league.color}`}>{league.name}</p>
          <p className="text-xs text-muted-foreground">⚔️ {sabers} sables</p>
        </div>
      </div>
    </div>
  );
}
