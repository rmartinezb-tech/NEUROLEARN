import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { BookOpen, Shuffle, ListChecks, Palette, Star, Brain, ArrowRight } from 'lucide-react';
import WellnessChecklist from '../components/study/WellnessChecklist';
import SingleSubjectSession from '../components/study/SingleSubjectSession';
import PersonalizedSession from '../components/study/PersonalizedSession';
import SelectiveSession from '../components/study/SelectiveSession';
import FlashcardCustomSession from '../components/study/FlashcardCustomSession';
import DifficultySession from '../components/study/DifficultySession';
import CognitiveSkillSession from '../components/study/CognitiveSkillSession';

const modes = [
  { id: 'single', icon: BookOpen, emoji: '🎯', title: 'Sesión de Materia Única', desc: 'Estudia una sola materia configurando ciclos, bloques y tiempo.', color: 'border-green-500/30 hover:border-green-500' },
  { id: 'personalized', icon: Shuffle, emoji: '🔀', title: 'Sesión Personalizada (Entrelazada)', desc: 'Mezcla 2 materias con repetición espaciada, ciclos y bloques configurables.', color: 'border-primary/30 hover:border-primary' },
  { id: 'selective', icon: ListChecks, emoji: '✅', title: 'Sesión Selectiva', desc: 'Elige exactamente qué preguntas quieres trabajar desde el banco.', color: 'border-purple-500/30 hover:border-purple-500' },
  { id: 'difficulty', icon: Star, emoji: '⭐', title: 'Sesión por Dificultad', desc: 'Practica preguntas según tu clasificación personal de dificultad (1-5 estrellas).', color: 'border-yellow-500/30 hover:border-yellow-500' },
  { id: 'cognitive', icon: Brain, emoji: '🧠', title: 'Sesión de Habilidades Cognitivas', desc: 'Filtra preguntas por habilidad cognitiva: Análisis, Síntesis, Aplicación y más.', color: 'border-teal-500/30 hover:border-teal-500' },
  { id: 'flashcard_custom', icon: Palette, emoji: '🎨', title: 'Flashcards con Personalización Visual', desc: 'Seleccioná hasta 5 flashcards, personalizá sus colores y estudiá con tu estilo.', color: 'border-pink-500/30 hover:border-pink-500' },
];

export default function Study() {
  const { profile, user } = useOutletContext();
  const [checklistDone, setChecklistDone] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  if (!checklistDone) return <WellnessChecklist onComplete={() => setChecklistDone(true)} />;

  const back = () => setSelectedMode(null);

  if (selectedMode === 'personalized') return <PersonalizedSession profile={profile} onBack={back} />;
  if (selectedMode === 'selective') return <SelectiveSession profile={profile} onBack={back} />;
  if (selectedMode === 'flashcard_custom') return <FlashcardCustomSession profile={profile} onBack={back} />;
  if (selectedMode === 'single') return <SingleSubjectSession profile={profile} onBack={back} />;
  if (selectedMode === 'difficulty') return <DifficultySession profile={profile} onBack={back} />;
  if (selectedMode === 'cognitive') return <CognitiveSkillSession profile={profile} onBack={back} />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-space font-bold">Selecciona tu modo de estudio</h1>
        <p className="text-muted-foreground mt-2">Elige cómo quieres estudiar hoy</p>
      </div>
      <div className="space-y-4">
        {modes.map((mode, i) => (
          <motion.button key={mode.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setSelectedMode(mode.id)}
            className={`w-full text-left bg-card border-2 ${mode.color} rounded-xl p-6 transition-all hover:shadow-lg group`}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{mode.emoji}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {mode.title}
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{mode.desc}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
