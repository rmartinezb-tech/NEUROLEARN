import { Link } from 'react-router-dom';
import { BookOpen, Swords, Trophy, Zap, Brain, FileUp, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const actions = [
  { path: '/wellbeing', label: 'Bienestar', color: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20', emoji: '❤️' },
  { path: '/calendar', label: 'Calendario', color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20', emoji: '🗓️' },

  { path: '/library', label: 'Biblioteca', color: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20', emoji: '🏛️' },
  { path: '/suggestions', label: 'Sugerencias', color: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20', emoji: '💭' },
  { path: '/study', icon: BookOpen, label: 'Estudiar', color: 'bg-primary/10 text-primary hover:bg-primary/20', emoji: '📚' },
  { path: '/questions', icon: Brain, label: 'Banco', color: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20', emoji: '🧠' },
  { path: '/duels', icon: Swords, label: 'Duelos', color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20', emoji: '🤺' },
  { path: '/tournaments', icon: Trophy, label: 'Torneos', color: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20', emoji: '🏟️' },
  { path: '/elaboration', icon: MessageSquare, label: 'Concurso', color: 'bg-green-500/10 text-green-500 hover:bg-green-500/20', emoji: '💡' },
  { path: '/study-rooms', icon: BookOpen, label: 'Salas', color: 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20', emoji: '🏠' },
  { path: '/willie', icon: Brain, label: 'WILLIE', color: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20', emoji: '🐥' },
];

const adminActions = [
  { path: '/import', icon: FileUp, label: 'Importar', color: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20', emoji: '📥' },
  { path: '/ai-generate', icon: Zap, label: 'IA', color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20', emoji: '⚡' },
];

export default function QuickActions({ isAdmin }) {
  const items = isAdmin ? [...actions, ...adminActions] : actions;
  
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
      {items.map((a, i) => (
        <motion.div
          key={a.path}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link
            to={a.path}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${a.color} transition-all hover:scale-105`}
          >
            <span className="text-2xl">{a.emoji}</span>
            <span className="text-xs font-medium">{a.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
