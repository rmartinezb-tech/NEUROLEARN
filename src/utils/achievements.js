import { base44 } from '@/api/base44Client';

export const ACHIEVEMENTS = {
  first_session: { label: '🎯 Primera Sesión', check: (p) => (p.total_sessions || 0) >= 1 },
  streak_7: { label: '🔥 Racha 7 Días', check: (p) => (p.streak_days || 0) >= 7 },
  streak_30: { label: '🏆 Racha 30 Días', check: (p) => (p.streak_days || 0) >= 30 },
  accuracy_90: { label: '🎯 90% Precisión', check: (p) => p.total_questions_answered >= 20 && (p.total_correct / p.total_questions_answered) >= 0.9 },
  total_100: { label: '📚 100 Preguntas', check: (p) => (p.total_questions_answered || 0) >= 100 },
  duel_winner: { label: '⚔️ Primer Duelo Ganado', check: (p) => (p.duels_won || 0) >= 1 },
  elaboration_published: { label: '💡 Primera Elaboración', check: (p) => (p.elaboration_posts || 0) >= 1 },
  tournament_winner: { label: '🏟️ Primer Torneo Ganado', check: (p) => (p.tournaments_won || 0) >= 1 },
  sessions_10: { label: '📖 10 Sesiones', check: (p) => (p.total_sessions || 0) >= 10 },
  sessions_50: { label: '📗 50 Sesiones', check: (p) => (p.total_sessions || 0) >= 50 },
  interleaved_10: { label: '🔀 Maestro Entrelazado', check: (p) => (p.interleaved_sessions || 0) >= 10 },
  spaced_7: { label: '📅 7 Días Espaciados', check: (p) => (p.unique_study_days || 0) >= 7 },
};

export const EASTER_EGGS = {
  anatomist: { label: '🦴 El Anatomista', check: (p) => (p.biomed_correct_count || 0) >= 500 },
  neuroscientist: { label: '🧠 El Neurocientífico', check: (p) => (p.neuro_correct_count || 0) >= 500 },
  supreme_carer: { label: '❤️ El Cuidador Supremo', check: (p) => (p.health_correct_count || 0) >= 500 },
  sacred_fire: { label: '🔥 Fuego Sagrado', check: (p) => (p.streak_days || 0) >= 30 },
  centurion: { label: '🛡️ Centurión', check: (p) => (p.total_sessions || 0) >= 100 },
  obsessive: { label: '😤 El Obsesivo', check: (p) => (p.difficulty_rated_count || 0) >= 200 },
  marathon: { label: '🏃 El Maratonista', check: (p) => (p.total_study_hours || 0) >= 50 },
  tournament_king: { label: '👑 El Tournament King', check: (p) => (p.tournaments_won || 0) >= 20 },
  social_strategist: { label: '🤝 El Estratega Social', check: (p) => (p.elaboration_votes_received || 0) >= 20 },
  elaboration_master: { label: '💡 El Elaborador Maestro', check: (p) => (p.elaboration_posts || 0) >= 10 },
  gladiator: { label: '⚔️ El Gladiador', check: (p) => (p.duel_win_streak || 0) >= 50 },
  invincible_duelist: { label: '🗡️ Duelista Invicto', check: (p) => (p.duel_unbeaten_streak || 0) >= 20 },
  legend: { label: '🌟 La Leyenda', check: (p) => (p.easter_eggs || []).length >= 29 },
};

export async function checkAndUpdateAchievements(profile) {
  if (!profile?.id) return [];
  const unlocked = profile.achievements || [];
  const newAchievements = [];

  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (!unlocked.includes(key) && achievement.check(profile)) {
      newAchievements.push(key);
    }
  }

  const unlockedEggs = profile.easter_eggs || [];
  const newEggs = [];
  for (const [key, egg] of Object.entries(EASTER_EGGS)) {
    if (!unlockedEggs.includes(key) && egg.check(profile)) {
      newEggs.push(key);
    }
  }

  if (newAchievements.length > 0 || newEggs.length > 0) {
    await base44.entities.UserProfile.update(profile.id, {
      achievements: [...unlocked, ...newAchievements],
      easter_eggs: [...unlockedEggs, ...newEggs],
    });
    // Create notifications
    for (const a of newAchievements) {
      await base44.entities.Notification.create({
        user_id: profile.user_id, type: 'achievement',
        title: '🏅 Logro Desbloqueado', message: ACHIEVEMENTS[a].label,
        is_read: false,
      });
    }
    for (const e of newEggs) {
      await base44.entities.Notification.create({
        user_id: profile.user_id, type: 'easter_egg',
        title: '🥚 Easter Egg Descubierto', message: EASTER_EGGS[e].label,
        is_read: false,
      });
    }
  }

  return [...newAchievements, ...newEggs];
}
