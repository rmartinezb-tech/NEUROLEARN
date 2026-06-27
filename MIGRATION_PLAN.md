# Plan de Migración: Base44 → Supabase + Anthropic API
## NEUROLEARN — Independencia Total de Plataforma

> **Para el agente que tome este documento:** Este archivo es el plan completo para migrar la app NEUROLEARN de la plataforma Base44 a una arquitectura propia. Contiene el contexto del proyecto, el mapeo completo del surface a reemplazar, el esquema SQL exacto de las 14 tablas, la estrategia de migración y el plan de ejecución fase por fase. No se deja nada para inferir.

---

## 1. Contexto del Proyecto

### ¿Qué es NEUROLEARN?
Plataforma de estudio gamificada para estudiantes de bachillerato en medicina. Combina:
- **Banco de preguntas** con 8 tipos (múltiple opción, verdadero/falso, flashcard, caso clínico, etc.)
- **Modos de estudio** (personalizado, selectivo, express, por dificultad)
- **Sistema de duelos** PvP en tiempo real entre estudiantes
- **Torneos** grupales con ranking
- **Elaboración** — foro de estrategias de aprendizaje con votación
- **Willie** — tutor IA conversacional especializado en medicina (usa LLM)
- **Generación IA de preguntas** desde texto pegado
- **Biblioteca de recursos** con upload de archivos
- **Importación de preguntas** desde documentos (PDF/DOC vía IA)
- **Salas de estudio** en tiempo real con chat
- **Sistema de scrolls** (peer feedback gamificado)
- **Rankings y ligas** (bronce → maestro)
- **Calendario** de eventos personales
- **Wellbeing** — módulo de bienestar con IA
- **Diario de estudio** con registro emocional
- **Notificaciones** en tiempo real
- **Panel admin** para gestión de usuarios

### Stack Frontend Actual
- React 18 + Vite 6
- React Router v6 (SPA)
- TanStack Query v5
- Radix UI + Tailwind CSS + shadcn/ui
- Framer Motion
- Recharts para gráficas
- Leaflet para mapas (Rankings)
- Three.js (efectos 3D)
- `@base44/sdk` — cliente actual que reemplazaremos

### Directorio raíz: `c:\Users\MARBECK\Desktop\Repo\NEUROLEARN`

### Archivo clave actual
`src/api/base44Client.js` — exporta el objeto `base44` que usan TODOS los componentes. Es el único punto de acople. Todas las páginas importan desde aquí:
```js
import { base44 } from '@/api/base44Client';
```

---

## 2. Lo que Base44 Provee Hoy (Surface Completo)

### 2.1 Autenticación (12 métodos)
| Método Base44 | Descripción | Usado en |
|---|---|---|
| `base44.auth.me()` | Obtiene usuario autenticado actual | AuthContext, Onboarding |
| `base44.auth.loginViaEmailPassword(email, pw)` | Login con email | SignIn.jsx |
| `base44.auth.loginWithProvider("google", redirect)` | OAuth Google | SignIn.jsx, Register.jsx |
| `base44.auth.logout(redirectUrl?)` | Cierra sesión | AppLayout.jsx, AuthContext |
| `base44.auth.redirectToLogin(redirectUrl)` | Redirige al login de Base44 | AuthContext, PageNotFound |
| `base44.auth.register({ email, password })` | Registro con email, envía OTP | Register.jsx |
| `base44.auth.verifyOtp({ email, otpCode })` | Verifica OTP, retorna `{ access_token }` | Register.jsx |
| `base44.auth.resendOtp(email)` | Reenvía OTP | Register.jsx |
| `base44.auth.resetPasswordRequest(email)` | Solicita reset de contraseña | ForgotPassword.jsx |
| `base44.auth.resetPassword({ token, password })` | Aplica nueva contraseña | ResetPassword.jsx |
| `base44.auth.setToken(token)` | Guarda el JWT manualmente | Register.jsx |
| `base44.auth.updateMe(data)` | Actualiza datos del usuario auth | Onboarding.jsx |

**El objeto `user` devuelto por `auth.me()` contiene:** `id`, `email`, `role` (`"user"`, `"mentor"`, `"admin"`), `full_name`.

El `role` es parte del sistema de autenticación (no del UserProfile). Las páginas `AdminUsers.jsx` y `QuickActions` verifican `user.role === 'admin' || user.role === 'mentor'`.

### 2.2 Entidades / Base de Datos (14 entidades)

Cada entidad tiene implícitamente: `id` (string UUID), `created_date` (ISO string), `updated_date` (ISO string).

Los métodos disponibles son:
- `.list(sort?, limit?)` — lista todos
- `.filter(conditions, sort?, limit?)` — filtra por condiciones exactas (equality)
- `.get(id)` — obtiene uno por ID
- `.create(data)` — crea uno nuevo, retorna el objeto con ID
- `.update(id, data)` — actualiza campos (merge), retorna el objeto actualizado
- `.delete(id)` — elimina
- `.subscribe(callback)` — suscripción en tiempo real, retorna función `unsubscribe`

El parámetro `sort` es el nombre del campo con `-` para descendente (ej: `'-created_date'`).
El parámetro `conditions` es un objeto plano de igualdades: `{ user_id: 'abc', status: 'active' }`.

### 2.3 Integraciones IA (3 funciones)
| Función | Descripción | Usado en |
|---|---|---|
| `integrations.Core.InvokeLLM({ prompt, response_json_schema? })` | Llama al LLM. Sin schema retorna string. Con schema retorna objeto JSON | Willie.jsx, AIGenerate.jsx, Wellbeing.jsx, ImportQuestions.jsx |
| `integrations.Core.UploadFile({ file })` | Sube un File a storage, retorna `{ file_url }` | CreateQuestionModal, Elaboration.jsx, ImportQuestions.jsx, Library.jsx |
| `integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema })` | Parsea un archivo subido (PDF/DOC) y extrae datos estructurados | ImportQuestions.jsx |

### 2.4 Tiempo Real (`.subscribe`)
Hay 3 entidades con suscripción en tiempo real activa:
- **`Duel`** — en `src/pages/Duels.jsx:29` — recarga duelos cuando cambia cualquier registro
- **`Notification`** — en `src/components/NotificationBell.jsx:22` — recarga notificaciones en tiempo real
- **`StudyRoom`** — en `src/pages/StudyRooms.jsx:27` — recarga salas y actualiza `roomData` si es la sala activa

El patrón de unsubscribe es:
```js
useEffect(() => {
  const unsub = base44.entities.X.subscribe((event) => { ... });
  return unsub; // cleanup en unmount
}, [deps]);
```

### 2.5 Auth Context (crítico)
`src/lib/AuthContext.jsx` hace una llamada a la API de Base44 en `checkAppState()` para verificar el estado de la app (requiere auth, usuario registrado, etc.) antes de mostrar cualquier cosa. Usa `createAxiosClient` importado de `@base44/sdk/dist/utils/axios-client`. Esta llamada HTTP va a:
```
GET /api/apps/public/prod/public-settings/by-id/{appId}
```
que el `@base44/vite-plugin` proxea a `https://q-copy-57f84222.base44.app`.

**Esta es la primera cosa que hay que eliminar/reemplazar.**

---

## 3. Arquitectura de Destino

### Stack Elegido

```
React/Vite (frontend — sin cambios en pages/ ni components/)
       │
src/api/supabaseAdapter.js  ←  nuevo cliente con interfaz idéntica a base44 SDK
       │
@supabase/supabase-js
       ├── Supabase Auth     → reemplaza base44.auth.*
       ├── Supabase DB       → reemplaza base44.entities.* (CRUD)
       ├── Supabase Realtime → reemplaza base44.entities.*.subscribe
       └── Supabase Storage  → reemplaza integrations.Core.UploadFile
       │
Supabase Edge Functions (Deno, serverless)
       ├── POST /functions/v1/invoke-llm        → Anthropic Claude API
       └── POST /functions/v1/extract-file      → Anthropic Claude API
```

### Por qué Supabase (y no Firebase, Appwrite, etc.)
1. **PostgreSQL real** — permite índices, foreign keys, RLS, migraciones SQL
2. **Realtime nativo** — basado en postgres LISTEN/NOTIFY, cubre el `.subscribe` sin código extra
3. **Auth completa** — email/password + Google OAuth + OTP/MagicLink incluido
4. **Storage integrado** — buckets con URLs públicas, comparte la autenticación
5. **Edge Functions** — Deno serverless para guardar el API key de Anthropic server-side
6. **Free tier generoso** — 500MB DB, 1GB storage, 2M requests/mes, 500K Edge Function invocations
7. **SDK similar** — `supabase.from('table').select()` es análogo al patrón de Base44

### Variables de Entorno Post-Migración
```env
# .env.local (reemplaza las actuales)
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
# NO exponer nunca en frontend:
# ANTHROPIC_API_KEY  ← solo en Supabase Edge Functions (secrets)
```

---

## 4. Schema de Base de Datos (SQL completo para Supabase)

Todas las tablas usan `id UUID DEFAULT gen_random_uuid() PRIMARY KEY` y timestamps automáticos.

### Extensiones necesarias
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Tabla: `user_profiles`
```sql
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
```

### Tabla: `questions`
```sql
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
```

### Tabla: `study_sessions`
```sql
CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('personalized','selective','express','duel','tournament')),
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
CREATE INDEX idx_study_sessions_status ON study_sessions(status);
```

### Tabla: `duels`
```sql
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
CREATE INDEX idx_duels_status ON duels(status);
```

### Tabla: `tournaments`
```sql
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
```

### Tabla: `elaboration_posts`
```sql
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
CREATE INDEX idx_elaboration_posts_subject ON elaboration_posts(subject);
```

### Tabla: `library_resources`
```sql
CREATE TABLE library_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  desc TEXT,
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
```

### Tabla: `notifications`
```sql
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
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

### Tabla: `scrolls`
```sql
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
```

### Tabla: `study_rooms`
```sql
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
```

### Tabla: `study_diaries`
```sql
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
```

### Tabla: `suggestions`
```sql
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
```

### Tabla: `calendar_events`
```sql
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
```

### Tabla: `question_reports`
```sql
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
```

### Row Level Security (RLS)
Supabase requiere configurar RLS para que los usuarios solo accedan a sus datos.

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE elaboration_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- user_profiles: cada uno lee/edita el suyo; todos pueden leer todos (para rankings)
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- questions: todos pueden leer; solo creadores o admins pueden modificar
CREATE POLICY "Questions are viewable by authenticated users" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create questions" ON questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their questions" ON questions FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their questions" ON questions FOR DELETE USING (auth.uid() = created_by);

-- study_sessions: solo el dueño
CREATE POLICY "Users manage own sessions" ON study_sessions USING (auth.uid() = user_id);

-- notifications: solo el destinatario
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can create notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- duels: challenger u opponent
CREATE POLICY "Duel participants can view" ON duels FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Authenticated can create duels" ON duels FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Duel participants can update" ON duels FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- elaboration_posts: todos leen; autor modifica
CREATE POLICY "Posts viewable by all authenticated" ON elaboration_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own posts" ON elaboration_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own posts" ON elaboration_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own posts" ON elaboration_posts FOR DELETE USING (auth.uid() = author_id);

-- El resto de las políticas siguen el mismo patrón
-- Aplicar políticas permisivas para: tournaments, study_rooms, library_resources, suggestions, question_reports, scrolls, study_diaries, calendar_events
```

### Trigger para `updated_date`
```sql
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['user_profiles','questions','study_sessions','duels','tournaments',
    'elaboration_posts','library_resources','notifications','scrolls','study_rooms',
    'study_diaries','suggestions','calendar_events','question_reports'])
  LOOP
    EXECUTE format('CREATE TRIGGER set_updated_date BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_date()', t);
  END LOOP;
END $$;
```

---

## 5. Mapeo de API: Base44 → Supabase

### 5.1 Autenticación

| Método Base44 | Equivalente Supabase |
|---|---|
| `auth.me()` | `supabase.auth.getUser()` → devuelve `{ data: { user } }` |
| `auth.loginViaEmailPassword(email, pw)` | `supabase.auth.signInWithPassword({ email, password })` |
| `auth.loginWithProvider("google", redirect)` | `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` |
| `auth.logout(redirectUrl?)` | `supabase.auth.signOut()` + `window.location.href = '/sign-in'` |
| `auth.redirectToLogin(url)` | `window.location.href = '/sign-in'` |
| `auth.register({ email, password })` | `supabase.auth.signUp({ email, password })` |
| `auth.verifyOtp({ email, otpCode })` | `supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' })` |
| `auth.resendOtp(email)` | `supabase.auth.resend({ email, type: 'signup' })` |
| `auth.resetPasswordRequest(email)` | `supabase.auth.resetPasswordForEmail(email)` |
| `auth.resetPassword({ password })` | `supabase.auth.updateUser({ password })` |
| `auth.setToken(token)` | No necesario — Supabase maneja sesión automáticamente |
| `auth.updateMe(data)` | `supabase.auth.updateUser(data)` (para email/password) |

**Diferencia importante:** En Base44, el `user.id` es un string opaco. En Supabase, `user.id` es un UUID de `auth.users`. Las tablas ya usan `UUID REFERENCES auth.users(id)`.

**Rol de usuario:** En Base44, el rol (`admin`, `mentor`, `user`) vive en el objeto auth `user.role`. En Supabase, el lugar correcto para el rol personalizado es `user_metadata`:
```js
// Al actualizar rol:
await supabase.auth.admin.updateUserById(userId, { user_metadata: { role: 'admin' } });
// Al leer:
const role = user.user_metadata?.role ?? 'user';
```
O alternativamente, almacenar el rol en `user_profiles.role` como columna extra.

### 5.2 Entidades (CRUD)

La **estrategia es el Adapter Pattern**: crear `src/api/supabaseAdapter.js` que expone exactamente la misma interfaz que `@base44/sdk`. Esto permite que NINGÚN componente de `pages/` o `components/` necesite ser modificado.

```
base44.entities.Question.list('-created_date', 10)
  ↓ adapter
supabase.from('questions').select('*').order('created_date', { ascending: false }).limit(10)
```

#### Mapeo de métodos

```js
// .list(sort?, limit?)
supabase.from(table).select('*')
  .order(field, { ascending: !desc })
  .limit(limit)

// .filter(conditions, sort?, limit?)
let q = supabase.from(table).select('*');
Object.entries(conditions).forEach(([k, v]) => { q = q.eq(k, v); });
q.order(field, { ascending: !desc }).limit(limit)

// .get(id)
supabase.from(table).select('*').eq('id', id).single()

// .create(data)
supabase.from(table).insert(data).select().single()

// .update(id, data)
supabase.from(table).update(data).eq('id', id).select().single()

// .delete(id)
supabase.from(table).delete().eq('id', id)
```

#### Nombre de tablas (Base44 entity → Supabase table)

| Entity Base44 | Tabla Supabase |
|---|---|
| `CalendarEvent` | `calendar_events` |
| `Duel` | `duels` |
| `ElaborationPost` | `elaboration_posts` |
| `LibraryResource` | `library_resources` |
| `Notification` | `notifications` |
| `Question` | `questions` |
| `QuestionReport` | `question_reports` |
| `Scroll` | `scrolls` |
| `StudyDiary` | `study_diaries` |
| `StudyRoom` | `study_rooms` |
| `StudySession` | `study_sessions` |
| `Suggestion` | `suggestions` |
| `Tournament` | `tournaments` |
| `UserProfile` | `user_profiles` |
| `User` | `auth.users` (tabla interna de Supabase) |

**Entidad especial — `User`:** En Base44, `base44.entities.User` expone los registros de autenticación. En Supabase, `auth.users` no es accesible directamente desde el frontend. La solución es crear una **vista pública**:
```sql
CREATE VIEW public_users AS
  SELECT id, email, raw_user_meta_data->>'role' as role, created_at
  FROM auth.users;
```
Y hacer que `entities.User.list()` consulte `public_users`.

### 5.3 Tiempo Real (`.subscribe`)

En Supabase, el tiempo real se maneja con canales de PostgreSQL:

```js
// Base44:
const unsub = base44.entities.Duel.subscribe((event) => { handler(event); });
return unsub;

// Supabase equivalente:
const channel = supabase
  .channel('duels-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'duels' },
    (payload) => { handler({ data: payload.new }); }
  )
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

**Importante:** Para que Supabase Realtime funcione, hay que habilitar la replicación en cada tabla en el dashboard de Supabase: `Database → Replication → Tables`.

Tablas que requieren replicación activada: `duels`, `notifications`, `study_rooms`.

### 5.4 Integraciones IA

Las llamadas de IA **no deben ir directamente desde el frontend** — el API key de Anthropic debe estar en el servidor. Se usan **Supabase Edge Functions**.

#### Edge Function: `invoke-llm`
Archivo: `supabase/functions/invoke-llm/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { prompt, response_json_schema } = await req.json()

  const systemMsg = response_json_schema
    ? `Respond ONLY with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`
    : 'You are a helpful assistant.'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',  // modelo actual más capaz
    max_tokens: 1024,
    system: systemMsg,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const result = response_json_schema ? JSON.parse(text) : text

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

#### Edge Function: `extract-file`
Archivo: `supabase/functions/extract-file/index.ts`

Recibe `{ file_url, json_schema }`, descarga el archivo desde Supabase Storage, lo convierte a base64, y lo pasa a Claude como contenido de documento (Anthropic soporta PDFs directamente en la API).

```typescript
// Lógica principal:
const fileResponse = await fetch(file_url)
const fileBuffer = await fileResponse.arrayBuffer()
const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))
const mimeType = fileResponse.headers.get('content-type') || 'application/pdf'

const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: mimeType, data: base64 }
      },
      {
        type: 'text',
        text: `Extract data from this document matching this JSON schema: ${JSON.stringify(json_schema)}`
      }
    ]
  }]
})
```

### 5.5 File Upload (Storage)

```js
// Base44:
const { file_url } = await base44.integrations.Core.UploadFile({ file })

// Supabase:
const fileName = `${Date.now()}-${file.name}`
const { data } = await supabase.storage
  .from('neurolearn-files')
  .upload(fileName, file, { cacheControl: '3600', upsert: false })
const { data: { publicUrl } } = supabase.storage
  .from('neurolearn-files')
  .getPublicUrl(data.path)
// publicUrl es el equivalente de file_url
```

Crear el bucket `neurolearn-files` en Supabase Dashboard → Storage → New bucket → público.

---

## 6. Plan de Ejecución por Fases

### Fase 0 — Setup Supabase (estimado: 30 min)
1. Crear cuenta en [supabase.com](https://supabase.com) (gratis)
2. Crear nuevo proyecto (elegir región cercana, ej: `South America (São Paulo) — sa-east-1`)
3. Anotar: `Project URL` y `anon public key` (Settings → API)
4. En Authentication → Providers → habilitar **Google** (requiere configurar OAuth app en Google Cloud Console)
5. En Authentication → Providers → habilitar **Email** con confirmación OTP
6. En Database → SQL Editor → ejecutar todo el SQL de la Sección 4 (tablas + RLS + triggers)
7. En Database → Replication → habilitar para tablas: `duels`, `notifications`, `study_rooms`
8. En Storage → crear bucket `neurolearn-files` (público)
9. Crear `.env.local` con:
   ```
   VITE_SUPABASE_URL=https://XXXX.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### Fase 1 — Adapter Frontend (estimado: 4-6 hs)

**Archivos a crear:**

#### `src/api/supabaseClient.js`
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

#### `src/api/supabaseAdapter.js`
Implementar la interfaz completa de `base44` sobre Supabase. Estructura:

```js
import { supabase } from './supabaseClient'

// Mapeo de nombres de entidades a tablas
const TABLE_MAP = {
  CalendarEvent: 'calendar_events',
  Duel: 'duels',
  ElaborationPost: 'elaboration_posts',
  LibraryResource: 'library_resources',
  Notification: 'notifications',
  Question: 'questions',
  QuestionReport: 'question_reports',
  Scroll: 'scrolls',
  StudyDiary: 'study_diaries',
  StudyRoom: 'study_rooms',
  StudySession: 'study_sessions',
  Suggestion: 'suggestions',
  Tournament: 'tournaments',
  UserProfile: 'user_profiles',
  User: 'public_users',
}

// Helper de sort
const parseSort = (sort) => {
  if (!sort) return null
  const desc = sort.startsWith('-')
  return { column: desc ? sort.slice(1) : sort, ascending: !desc }
}

// Fábrica de entity adapter
const createEntity = (tableName) => ({
  async list(sort, limit) { ... },
  async filter(conditions, sort, limit) { ... },
  async get(id) { ... },
  async create(data) { ... },
  async update(id, data) { ... },
  async delete(id) { ... },
  subscribe(callback) {
    const channel = supabase
      .channel(`${tableName}-changes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName },
        (payload) => callback({ data: payload.new, event: payload.eventType })
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
})

// Auth adapter
const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw Object.assign(new Error('Not authenticated'), { status: 401 })
    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role ?? 'user',
      full_name: user.user_metadata?.full_name,
    }
  },
  // ... resto de métodos
}

// Integrations adapter
const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema }) {
      const res = await supabase.functions.invoke('invoke-llm', {
        body: { prompt, response_json_schema }
      })
      if (res.error) throw res.error
      return res.data
    },
    async UploadFile({ file }) {
      const path = `${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('neurolearn-files').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('neurolearn-files').getPublicUrl(data.path)
      return { file_url: publicUrl }
    },
    async ExtractDataFromUploadedFile({ file_url, json_schema }) {
      const res = await supabase.functions.invoke('extract-file', {
        body: { file_url, json_schema }
      })
      if (res.error) throw res.error
      return res.data
    },
  }
}

export const supabaseAdapter = {
  auth,
  entities: Object.fromEntries(
    Object.entries(TABLE_MAP).map(([name, table]) => [name, createEntity(table)])
  ),
  integrations,
}
```

#### `src/api/base44Client.js` (reemplazar)
```js
// Único cambio: apuntar al adapter en lugar del SDK de Base44
import { supabaseAdapter } from './supabaseAdapter'
export const base44 = supabaseAdapter
```

### Fase 2 — AuthContext (estimado: 2 hs)

`src/lib/AuthContext.jsx` necesita reescritura parcial. Los puntos de cambio son:

1. **Eliminar** la llamada a `createAxiosClient` y el fetch a `/api/apps/public/prod/public-settings/by-id/...` — eso era la verificación de app de Base44, no tiene equivalente en Supabase.

2. **Reemplazar** `checkAppState` por una verificación simple de sesión:
```js
const checkAppState = async () => {
  setIsLoadingPublicSettings(false)
  setAppPublicSettings({ id: 'local', public_settings: {} }) // mock del settings
  await checkUserAuth()
}
```

3. **Reemplazar** `checkUserAuth` para usar `supabase.auth.getSession()`:
```js
const checkUserAuth = async () => {
  setIsLoadingAuth(true)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    setUser({ id: session.user.id, email: session.user.email, role: session.user.user_metadata?.role ?? 'user' })
    setIsAuthenticated(true)
  } else {
    setIsAuthenticated(false)
  }
  setIsLoadingAuth(false)
  setAuthChecked(true)
}
```

4. **Agregar listener** de cambios de sesión (importante para OAuth redirect):
```js
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      setUser({ ... })
      setIsAuthenticated(true)
    } else {
      setUser(null)
      setIsAuthenticated(false)
    }
    setIsLoadingAuth(false)
    setAuthChecked(true)
  })
  return () => subscription.unsubscribe()
}, [])
```

5. **`navigateToLogin`**: ya no redirige a Base44 sino a la ruta local `/sign-in`.

### Fase 3 — Edge Functions (estimado: 1-2 hs)

1. Instalar Supabase CLI: `npm install -g supabase`
2. `supabase login`
3. `supabase init` (en la raíz del proyecto)
4. Crear functions:
   - `supabase functions new invoke-llm`
   - `supabase functions new extract-file`
5. Escribir el código de las funciones (ver Sección 5.4)
6. Configurar el secret de Anthropic:
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
7. Deploy:
   ```
   supabase functions deploy invoke-llm --no-verify-jwt
   supabase functions deploy extract-file --no-verify-jwt
   ```
   Nota: `--no-verify-jwt` permite que las funciones se llamen desde el frontend sin un JWT adicional. Si se prefiere seguridad adicional, se puede pasar el JWT de Supabase en el header.

### Fase 4 — Google OAuth (estimado: 1 hs)

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear un nuevo proyecto o usar uno existente
3. Habilitar Google+ API
4. Credentials → Create OAuth 2.0 Client ID
5. Tipo: Web Application
6. Authorized redirect URIs: `https://XXXX.supabase.co/auth/v1/callback`
7. Copiar Client ID y Client Secret
8. En Supabase → Authentication → Providers → Google → pegar las credenciales
9. El frontend no necesita cambios — `supabase.auth.signInWithOAuth({ provider: 'google' })` maneja todo

### Fase 5 — Vite Config Cleanup (estimado: 30 min)

1. Eliminar `@base44/vite-plugin` de las dependencias:
   ```
   npm uninstall @base44/vite-plugin @base44/sdk
   ```
2. Actualizar `vite.config.js`:
   ```js
   import react from '@vitejs/plugin-react'
   import { defineConfig } from 'vite'
   import path from 'path'

   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: { '@': path.resolve(__dirname, './src') }
     }
   })
   ```
3. Instalar dependencias nuevas:
   ```
   npm install @supabase/supabase-js @anthropic-ai/sdk
   ```
   Nota: `@anthropic-ai/sdk` se usa solo en las Edge Functions, no en el frontend.

### Fase 6 — Testing (estimado: 2-3 hs)

Checklist de verificación funcional:

- [ ] Registro con email + verificación OTP
- [ ] Login con email/password
- [ ] Login con Google OAuth
- [ ] Onboarding completo (crea UserProfile)
- [ ] Dashboard carga sesiones, questions count, usuarios online
- [ ] Crear una pregunta de tipo multiple choice
- [ ] Sesión de estudio express (carga preguntas, guarda StudySession)
- [ ] Willie responde (InvokeLLM funciona)
- [ ] AIGenerate genera preguntas desde texto
- [ ] Subir un archivo en Library (UploadFile funciona)
- [ ] Notificación en tiempo real (crear una Notification y verificar que el NotificationBell la muestra sin recargar)
- [ ] Duelos — desafío, aceptar, jugar en tiempo real
- [ ] StudyRooms — crear sala, enviar mensaje, verlo en tiempo real
- [ ] AdminUsers — ver lista de usuarios, cambiar rol
- [ ] ImportQuestions — subir PDF y extraer preguntas (ExtractDataFromUploadedFile)

---

## 7. Archivos a Crear / Modificar

### Crear (nuevos)
| Archivo | Descripción |
|---|---|
| `src/api/supabaseClient.js` | Instancia de Supabase |
| `src/api/supabaseAdapter.js` | Adapter completo (interfaz idéntica a Base44 SDK) |
| `supabase/functions/invoke-llm/index.ts` | Edge Function — llama a Anthropic Claude |
| `supabase/functions/extract-file/index.ts` | Edge Function — parsea archivos con Claude |
| `supabase/config.toml` | Config de Supabase CLI (generado por `supabase init`) |

### Modificar (cambios mínimos)
| Archivo | Qué cambia |
|---|---|
| `src/api/base44Client.js` | Reemplazar export: `export const base44 = supabaseAdapter` |
| `src/lib/AuthContext.jsx` | Eliminar llamada HTTP a Base44, usar `supabase.auth.getSession()` y `onAuthStateChange` |
| `vite.config.js` | Eliminar plugin de Base44, agregar alias `@` |
| `.env.local` | Reemplazar `VITE_BASE44_*` por `VITE_SUPABASE_*` |
| `package.json` | Agregar `@supabase/supabase-js`, eliminar `@base44/sdk` y `@base44/vite-plugin` |

### No tocar (cero cambios)
Todo `src/pages/`, todo `src/components/`, `src/lib/` (excepto AuthContext), `src/hooks/`, `src/utils/`.

---

## 8. Riesgos y Consideraciones

### 8.1 Diferencia en IDs
Base44 usa IDs tipo string hex (`69f69d94...`). Supabase usa UUIDs (`123e4567-e89b-12d3-...`). Si hay datos migrados de Base44, los IDs no van a coincidir. Para un proyecto nuevo esto no es problema.

### 8.2 `User.role` en Base44 vs Supabase
En Base44, el `role` es una propiedad de primer nivel en el objeto de auth. En Supabase, el lugar correcto es `user.user_metadata.role`. El adapter debe mapear esto correctamente. Alternativamente, agregar una columna `role` en `user_profiles` y leerla desde ahí.

### 8.3 El campo `isCritical` en CalendarEvent
El schema de Base44 usa `isCritical` (camelCase). La tabla SQL la define como `is_critical` (snake_case). Verificar en `CalendarModule.jsx` qué nombre usa el código y ajustar el adapter si es necesario.

### 8.4 Suscripciones en Supabase con múltiples componentes
Si `NotificationBell` y otro componente intentan suscribirse a la misma tabla simultáneamente, Supabase crea canales separados (uno por `.channel(name)`). Usar nombres de canal únicos con `Date.now()` o un UUID para evitar conflictos.

### 8.5 CORS en Edge Functions
Las Edge Functions de Supabase tienen CORS habilitado por defecto para el dominio del proyecto. Para desarrollo local (`localhost:5173`), agregar el header `Access-Control-Allow-Origin: *` o configurarlo explícitamente.

### 8.6 Latencia de Edge Functions
La primera invocación de una Edge Function (cold start) puede tardar 1-2 segundos. Esto afecta a Willie y AIGenerate en el primer mensaje. No es un problema funcional pero sí de UX. El warm-up es casi instantáneo en llamadas subsiguientes.

### 8.7 Free Tier de Anthropic
El API key de Anthropic en el tier gratuito tiene límites de rate (5 requests/minuto en el tier más bajo). Willie podría dar errores de rate limit bajo uso intenso. Monitorear y actualizar el plan si es necesario.

---

## 9. Referencia Rápida de Archivos Clave del Proyecto

```
NEUROLEARN/
├── src/
│   ├── api/
│   │   ├── base44Client.js        ← punto de entrada único (MODIFICAR)
│   │   ├── supabaseClient.js      ← CREAR
│   │   └── supabaseAdapter.js     ← CREAR (el trabajo principal)
│   ├── lib/
│   │   ├── AuthContext.jsx        ← MODIFICAR (quitar llamada a Base44)
│   │   ├── app-params.js          ← ELIMINAR o dejar vacío (solo era para Base44)
│   │   └── query-client.js        ← no tocar
│   ├── pages/                     ← NO TOCAR (21 páginas)
│   └── components/                ← NO TOCAR (excepto si hay bugs)
├── entities/                      ← referencia de schemas (ya se usaron para el SQL)
│   ├── Question.json
│   ├── UserProfile.json
│   └── ... (14 archivos)
├── supabase/                      ← CREAR
│   └── functions/
│       ├── invoke-llm/index.ts
│       └── extract-file/index.ts
├── vite.config.js                 ← MODIFICAR (quitar plugin Base44)
├── .env.local                     ← MODIFICAR (nuevas vars de entorno)
└── MIGRATION_PLAN.md              ← este archivo
```

---

## 10. Orden de Ejecución Sugerido

```
1. Crear proyecto Supabase → anotar URL y anon key
2. Ejecutar SQL completo (Sección 4) en Supabase SQL Editor
3. Configurar Google OAuth en Supabase + Google Cloud Console
4. Crear .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
5. npm install @supabase/supabase-js
6. Crear src/api/supabaseClient.js
7. Crear src/api/supabaseAdapter.js (implementación completa)
8. Modificar src/api/base44Client.js (cambiar el export)
9. Modificar src/lib/AuthContext.jsx (quitar Base44, usar Supabase Auth)
10. Modificar vite.config.js (quitar @base44/vite-plugin)
11. npm uninstall @base44/sdk @base44/vite-plugin
12. npm run dev → verificar que la app arranca
13. Probar registro y login
14. Probar CRUD básico (crear pregunta, ver dashboard)
15. supabase init → crear Edge Functions → deploy
16. Configurar ANTHROPIC_API_KEY como secret
17. Probar Willie (InvokeLLM)
18. Probar upload de archivo
19. Probar tiempo real (duelos, notificaciones, salas)
20. Testing completo con checklist de Fase 6
```

---

*Documento generado el 2026-06-27. Proyecto: NEUROLEARN. Repo: `c:\Users\MARBECK\Desktop\Repo\NEUROLEARN`.*
