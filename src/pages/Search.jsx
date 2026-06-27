import { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Brain, Users, BookOpen } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export default function Search() {
  const { profile } = useOutletContext();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setQuestions([]); setUsers([]); return; }
    search(debouncedQuery);
  }, [debouncedQuery]);

  const search = async (q) => {
    setLoading(true);
    const [allQ, allU] = await Promise.all([
      base44.entities.Question.list('-created_date', 200),
      base44.entities.UserProfile.list(),
    ]);
    const lower = q.toLowerCase();
    setQuestions(allQ.filter(qu => qu.statement?.toLowerCase().includes(lower) || qu.subject?.toLowerCase().includes(lower) || qu.tags?.some(t => t.toLowerCase().includes(lower))).slice(0, 10));
    setUsers(allU.filter(u => u.display_name?.toLowerCase().includes(lower)).slice(0, 5));
    setLoading(false);
  };

  const typeLabels = { multiple_choice: 'OM', true_false: 'V/F', fill_blank: 'LL', flashcard: 'FC', development: 'Des', clinical_case: 'CC', order_sequence: 'Ord', matching: 'Mat' };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar preguntas, usuarios..."
          className="pl-12 rounded-xl h-12 text-base"
        />
      </div>

      {!query && (
        <div className="text-center py-16 text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Escribe para buscar</p>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && query && (
        <div className="space-y-6">
          {/* Users */}
          {users.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Users className="h-4 w-4" />Usuarios</h3>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <span className="text-2xl">{u.avatar_emoji || '👤'}</span>
                    <div>
                      <p className="font-medium text-sm">{u.display_name}</p>
                      <p className="text-xs text-muted-foreground">Nv. {u.level || 1} • {u.xp || 0} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Brain className="h-4 w-4" />Preguntas ({questions.length})</h3>
              <div className="space-y-2">
                {questions.map(q => (
                  <div key={q.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{typeLabels[q.type] || q.type}</Badge>
                      <Badge variant="outline" className="text-xs">{q.subject?.split(' ')[0]}</Badge>
                    </div>
                    <p className="text-sm font-medium">{q.statement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {users.length === 0 && questions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Sin resultados para "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
