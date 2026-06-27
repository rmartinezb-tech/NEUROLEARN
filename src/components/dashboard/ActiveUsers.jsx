import { Users } from 'lucide-react';

export default function ActiveUsers({ users }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" /> En Línea ({users.length})
      </h3>
      {users.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nadie en línea</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-auto">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-2">
              <span className="text-lg">{u.avatar_emoji || '👤'}</span>
              <span className="text-sm truncate flex-1">{u.display_name}</span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
