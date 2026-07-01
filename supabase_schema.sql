-- ============================================================
-- NEUROLEARN — Schema completo para Supabase
-- Pegar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Trigger helper para updated_date automático
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLA: user_profiles
-- ============================================================
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  description TEXT,
  avatar_emoji TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_study_date TEXT,
  sabers INTEGER DEFAULT 0,
  league TEXT DEFAULT 'bronze' CHECK (league IN ('bronze','silver','gold','platinum','diamond','master')),
  evocation_points INTEGER DEFAULT 0,
  elaboration_points INTEGER DEFAULT 0,
  neuro_correct_count INTEGER DEFAULT 0,
  health_correct_count INTEGER DEFAULT 0,
  biomed_correct_count INTEGER DEFAULT 0,
  development_correct_count INTEGER DEFAULT 0,
  clinical_correct_count INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  interleaved_sessions INTEGER DEFAULT 0,
  unique_study_days INTEGER DEFAULT 0,
  total_study_hours NUMERIC DEFAULT 0,
  duels_won INTEGER DEFAULT 0,
  duel_win_streak INTEGER DEFAULT 0,
  duel_unbeaten_streak INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  elaboration_posts INTEGER DEFAULT 0,
  elaboration_votes_received INTEGER DEFAULT 0,
  difficulty_rated_count INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  easter_eggs TEXT[] DEFAULT '{}',
  weekly_goals JSONB DEFAULT '{}',
  theme TEXT DEFAULT 'dark',
  sound_enabled BOOLEAN DEFAULT TRUE,
  willie_enabled BOOLEAN DEFAULT TRUE,
  difficulty_ratings JSONB DEFAULT '{}',
  dashboard_layout TEXT[] DEFAULT '{}',
  is_online BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ,
  scroll_never BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE TRIGGER set_updated_date_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: questions
-- ============================================================
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice','true_false','fill_blank','order_sequence','matching','development','clinical_case','flashcard')),
  subject TEXT CHECK (subject IN ('Neurociencias','Cuidados de la Salud','Ciencias Biomédicas','Otras')),
  custom_subject TEXT,
  options TEXT[] DEFAULT '{}',
  correct_answer TEXT,
  correct_index INTEGER,
  explanation TEXT,
  hints TEXT,
  difficulty_suggested INTEGER CHECK (difficulty_suggested BETWEEN 1 AND 5),
  cognitive_skill TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  origin TEXT CHECK (origin IN ('manual','ai','imported')),
  matching_pairs JSONB DEFAULT '[]',
  sequence_order TEXT[] DEFAULT '{}',
  flashcard_back TEXT,
  is_reported BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','draft','reported')),
  created_by UUID REFERENCES auth.users(id),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_type ON questions(type);
CREATE TRIGGER set_updated_date_questions
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: study_sessions
-- ============================================================
CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('personalized','selective','express','duel','tournament','single_subject','difficulty','cognitive','standard','custom')),
  questions_total INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  questions_incorrect INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  duration_minutes NUMERIC DEFAULT 0,
  subjects_covered TEXT[] DEFAULT '{}',
  question_types_covered TEXT[] DEFAULT '{}',
  is_interleaved BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','paused','abandoned')),
  completed_at TIMESTAMPTZ,
  answers_log JSONB DEFAULT '[]',
  reflection_note TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE TRIGGER set_updated_date_study_sessions
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: duels
-- ============================================================
CREATE TABLE duels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL REFERENCES auth.users(id),
  challenger_name TEXT,
  opponent_id UUID NOT NULL REFERENCES auth.users(id),
  opponent_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','in_progress','completed','rejected')),
  questions TEXT[] DEFAULT '{}',
  challenger_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  challenger_accuracy NUMERIC DEFAULT 0,
  opponent_accuracy NUMERIC DEFAULT 0,
  challenger_avg_time NUMERIC DEFAULT 0,
  opponent_avg_time NUMERIC DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_duels_challenger ON duels(challenger_id);
CREATE INDEX idx_duels_opponent ON duels(opponent_id);
CREATE TRIGGER set_updated_date_duels
  BEFORE UPDATE ON duels
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: tournaments
-- ============================================================
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'registration' CHECK (status IN ('registration','in_progress','completed')),
  players JSONB DEFAULT '[]',
  questions TEXT[] DEFAULT '{}',
  min_questions INTEGER DEFAULT 10,
  results_published BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_date_tournaments
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: elaboration_posts
-- ============================================================
CREATE TABLE elaboration_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_name TEXT,
  author_avatar TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN ('Analogía','Mnemotecnia','Mapa Conceptual','Resumen','Explicación en Audio','Otro')),
  subject TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  votes_count INTEGER DEFAULT 0,
  voters JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '{"heart":0,"fire":0}',
  reaction_users JSONB DEFAULT '{"heart":[],"fire":[]}',
  comments JSONB DEFAULT '[]',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_elaboration_posts_author ON elaboration_posts(author_id);
CREATE TRIGGER set_updated_date_elaboration_posts
  BEFORE UPDATE ON elaboration_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: library_resources
-- ============================================================
CREATE TABLE library_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  "desc" TEXT,
  type TEXT CHECK (type IN ('document','video','audio','image','spreadsheet','questions','collection')),
  subject TEXT,
  level TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_name TEXT,
  author_role TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  views INTEGER DEFAULT 0,
  rating_sum NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  rating_avg NUMERIC DEFAULT 0,
  voter_ids TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  license TEXT,
  downloads INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_date_library_resources
  BEFORE UPDATE ON library_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('duel_challenge','duel_result','tournament','elaboration_vote','elaboration_comment','achievement','easter_egg','system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  related_id TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE TRIGGER set_updated_date_notifications
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: scrolls
-- ============================================================
CREATE TABLE scrolls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','evaluated','ignored')),
  stars_given INTEGER,
  sender_milestone INTEGER,
  never_send BOOLEAN DEFAULT FALSE,
  skip_until TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scrolls_sender ON scrolls(sender_id);
CREATE INDEX idx_scrolls_receiver ON scrolls(receiver_id);
CREATE TRIGGER set_updated_date_scrolls
  BEFORE UPDATE ON scrolls
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: study_rooms
-- ============================================================
CREATE TABLE study_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  participants JSONB DEFAULT '[]',
  messages JSONB DEFAULT '[]',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_date_study_rooms
  BEFORE UPDATE ON study_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: study_diaries
-- ============================================================
CREATE TABLE study_diaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL,
  emotion_emoji TEXT,
  cog_load INTEGER,
  note TEXT,
  session_date TEXT NOT NULL,
  session_type TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_study_diaries_user_id ON study_diaries(user_id);
CREATE TRIGGER set_updated_date_study_diaries
  BEFORE UPDATE ON study_diaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: suggestions
-- ============================================================
CREATE TABLE suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_name TEXT,
  sender_avatar TEXT,
  message TEXT NOT NULL,
  reply TEXT,
  replied_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','replied','resolved')),
  is_private BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_date_suggestions
  BEFORE UPDATE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: calendar_events
-- ============================================================
CREATE TABLE calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  day INTEGER,
  hour INTEGER,
  duration INTEGER,
  type TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  view_type TEXT CHECK (view_type IN ('individual','group')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE TRIGGER set_updated_date_calendar_events
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- TABLA: question_reports
-- ============================================================
CREATE TABLE question_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  custom_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  resolved_by UUID REFERENCES auth.users(id),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_date_question_reports
  BEFORE UPDATE ON question_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ============================================================
-- VISTA: public_users (expone auth.users al frontend de forma segura)
-- ============================================================
CREATE VIEW public_users AS
  SELECT
    id,
    email,
    raw_user_meta_data->>'role' AS role,
    raw_user_meta_data->>'full_name' AS full_name,
    created_at
  FROM auth.users;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE elaboration_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrolls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_diaries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports  ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete" ON user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- questions (todos leen, autenticados crean/editan las suyas)
CREATE POLICY "questions_select" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_insert" ON questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "questions_update" ON questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "questions_delete" ON questions FOR DELETE TO authenticated USING (true);

-- study_sessions
CREATE POLICY "sessions_all" ON study_sessions TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- duels
CREATE POLICY "duels_select" ON duels FOR SELECT TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "duels_insert" ON duels FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "duels_update" ON duels FOR UPDATE TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- tournaments (todos leen y participan)
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE TO authenticated USING (true);

-- elaboration_posts
CREATE POLICY "posts_select" ON elaboration_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON elaboration_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update" ON elaboration_posts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "posts_delete" ON elaboration_posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- library_resources
CREATE POLICY "library_select" ON library_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "library_insert" ON library_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "library_update" ON library_resources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "library_delete" ON library_resources FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- notifications
CREATE POLICY "notifs_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifs_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifs_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- scrolls
CREATE POLICY "scrolls_select" ON scrolls FOR SELECT TO authenticated USING (auth.uid() = sender_id OR receiver_id = auth.uid()::text);
CREATE POLICY "scrolls_insert" ON scrolls FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "scrolls_update" ON scrolls FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR receiver_id = auth.uid()::text);

-- study_rooms (todos participan)
CREATE POLICY "rooms_select" ON study_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_insert" ON study_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rooms_update" ON study_rooms FOR UPDATE TO authenticated USING (true);

-- study_diaries
CREATE POLICY "diaries_all" ON study_diaries TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- suggestions
CREATE POLICY "suggestions_select" ON suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "suggestions_insert" ON suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "suggestions_update" ON suggestions FOR UPDATE TO authenticated USING (true);

-- calendar_events
CREATE POLICY "calendar_all" ON calendar_events TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- question_reports
CREATE POLICY "reports_select" ON question_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "reports_insert" ON question_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_update" ON question_reports FOR UPDATE TO authenticated USING (true);
