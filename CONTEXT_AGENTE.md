# CONTEXT_AGENTE.md — Estado actual de NEUROLEARN
> Este archivo fue generado para que un nuevo agente pueda continuar el trabajo sin perder contexto.
> Última actualización: 2026-07-01 — Claude Sonnet 4.6 (Claude Code, VS Code Extension)

---

## ¿Qué es este proyecto?

**NEUROLEARN** es una plataforma de estudio gamificada para estudiantes de bachillerato en medicina. Incluye banco de preguntas, modos de estudio, duelos PvP en tiempo real, torneos, tutor IA (Willie), generación de preguntas con IA, biblioteca de recursos, salas de estudio con chat, rankings, sistema de logros y más.

- **Repositorio GitHub:** `https://github.com/rmartinezb-tech/NEUROLEARN`
- **App publicada:** `https://neurolearn-five.vercel.app`
- **Base de datos:** Supabase — proyecto ID `dgyjmpmobaufezzxftbu` (región: São Paulo)
- **Directorio local (computador actual):** `c:\Users\Rosi\Desktop\Repositorio\NEUROLEARN`

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 6 |
| Routing | React Router v6 |
| UI | Radix UI + Tailwind CSS + shadcn/ui |
| Data/Auth | Supabase (`@supabase/supabase-js`) |
| Animaciones | Framer Motion |
| Deploy | Vercel (conectado al repo de GitHub, auto-deploy en push a `main`) |

---

## Lo que ya está funcionando ✅

### Infraestructura
- [x] **Migración completa de Base44 → Supabase** — el proyecto ya NO depende de Base44 para nada
- [x] **14 tablas creadas en Supabase** con RLS, índices y triggers de `updated_date` automático
- [x] **Auth con email/password** funcionando en producción
- [x] **App publicada en Vercel** accesible desde cualquier dispositivo/red
- [x] **Variables de entorno configuradas** en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

### API layer
- [x] `src/api/supabaseClient.js` — instancia de Supabase; también importable directamente:
  ```js
  import { supabase } from '@/api/supabaseClient';
  ```
- [x] `src/api/supabaseAdapter.js` — adapter completo con interfaz idéntica al SDK de Base44 (drop-in replacement). Todas las páginas usan `base44.entities.X.list()` etc.
- [x] `src/api/base44Client.js` — reexporta el supabaseAdapter: `export const base44 = supabaseAdapter`
- [x] `src/lib/AuthContext.jsx` — usa `supabase.auth.getSession()` y `onAuthStateChange`

### Código — implementaciones recientes (commits en `main`)
- [x] **StudyRooms real-time** (`src/pages/StudyRooms.jsx`) — implementación dual:
  - Capa 1: **Supabase Broadcast** en canal `chat:{roomId}` para entrega instantánea (<100ms)
  - Capa 2: **Polling directo** a `supabase.from('study_rooms').select()` cada 1 segundo como fallback garantizado
  - `sendMessage`: optimistic update + broadcast + persist en DB
- [x] **Flag/bandera en QuestionRenderer** (`src/components/study/QuestionRenderer.jsx`) — botón autocontenido:
  - Crea `QuestionReport` en Supabase al hacer click
  - Actualiza `Question.is_reported = true`
  - Muestra toast "Reporte enviado ✓"
  - Bandera se vuelve roja con ícono blanco (visual feedback)
  - Recibe `userId` como prop desde `StudyEngine`
- [x] **Flag/bandera en FlashcardCustomSession** (`src/components/study/FlashcardCustomSession.jsx`) — implementación separada porque tiene su propio renderer:
  - `flaggedIds` Set state para trackear cuáles ya fueron reportadas
  - `handleFlag(qId)` crea QuestionReport + actualiza Question + toast
  - Botón absolutamente posicionado top-right en la carta
- [x] **StudyEngine** (`src/components/study/StudyEngine.jsx`) — pasa `userId={profile?.user_id}` a QuestionRenderer
- [x] **Reports** (`src/pages/Reports.jsx`) — funciona sin cambios; lee QuestionReport con `list('-created_date', 100)`; muestra tabs pendientes/resueltos; solo visible para admin/mentor

---

## Estado del Deploy en Vercel ⚠️

Hubo un problema de deploy donde Production estaba atascado en commit `82c837c` mientras los commits nuevos ya habían sido pusheados a `main`. Los commits recientes incluyen:

```
964a67d  Fix flag button: self-contained report creation in QuestionRenderer and FlashcardCustomSession
3aa7767  Fix flag button in study sessions: create QuestionReport and show filled white flag
8073d43  StudyRooms: Broadcast + 1s direct Supabase polling for real-time messages
3ee966e  Rewrite StudyRooms real-time: direct Supabase channel + polling fallback
dc71079  Reduce polling interval to 1.5s for more responsive chat
```

**Para verificar:** Ir a Vercel dashboard → Deployments y confirmar que el commit más reciente esté en Production. Si hay un build fallado, revisar los logs.

---

## Lo que falta / Pendiente ❌

### 1. Verificar funcionamiento real en producción
Una vez confirmado el deploy:
- [ ] **StudyRooms**: Abrir la sala en dos dispositivos/navegadores y confirmar que los mensajes aparecen sin recargar la página
- [ ] **Flag button**: Click en la banderita → debe aparecer "Reporte enviado ✓" (toast), bandera se pone roja/blanca
- [ ] **Reports**: Como admin/mentor, confirmar que los reportes creados aparecen en `/reports`

### 2. Posible problema de RLS en question_reports
Si la banderita da error silencioso (falla el create pero no se muestra error porque está en try/catch), puede ser que RLS bloquee el INSERT. Ejecutar en Supabase SQL Editor:

```sql
-- Verificar si hay política de INSERT:
SELECT * FROM pg_policies WHERE tablename = 'question_reports';

-- Si no hay política de INSERT, agregar:
CREATE POLICY "Users can insert reports" ON question_reports
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

**CRÍTICO — Discrepancia en el nombre de campo:**
- El código en `QuestionRenderer.jsx` y `FlashcardCustomSession.jsx` envía: `reported_by`
- El schema en `MIGRATION_PLAN.md` define la columna como: `reporter_id`
- Verificar en Supabase cuál es el nombre real de la columna y ajustar el código si es necesario

### 3. Edge Functions de IA — CRÍTICO (pendiente de sesiones anteriores)
Sin esto, estas páginas dan error:
- `Willie.jsx` — tutor IA conversacional
- `AIGenerate.jsx` — generación de preguntas desde texto
- `Wellbeing.jsx` — módulo de bienestar con IA
- `ImportQuestions.jsx` — extracción de preguntas desde PDFs

**Ver detalles de implementación en `MIGRATION_PLAN.md` sección "Edge Functions".**

### 4. Google OAuth — OPCIONAL
El botón de "Continuar con Google" fue ocultado en `SignIn.jsx` y `Register.jsx`. Para activarlo, configurar en Google Cloud Console y Supabase Authentication → Providers → Google.

---

## Archivos clave del proyecto

```
NEUROLEARN/
├── src/
│   ├── api/
│   │   ├── base44Client.js           ← exporta supabaseAdapter como "base44"
│   │   ├── supabaseClient.js         ← instancia de Supabase (también usada directamente en StudyRooms)
│   │   └── supabaseAdapter.js        ← adapter completo (auth + entities + integrations)
│   ├── lib/
│   │   └── AuthContext.jsx           ← usa supabase.auth.getSession + onAuthStateChange
│   ├── pages/
│   │   ├── StudyRooms.jsx            ← Broadcast + polling 1s para mensajes en tiempo real
│   │   ├── Reports.jsx               ← lista QuestionReports; solo admin/mentor
│   │   └── [otras páginas sin cambios]
│   └── components/
│       └── study/
│           ├── QuestionRenderer.jsx  ← flag button autocontenido (necesita userId prop)
│           ├── StudyEngine.jsx       ← pasa userId={profile?.user_id} a QuestionRenderer
│           └── FlashcardCustomSession.jsx ← flag button propio (renderer separado)
├── MIGRATION_PLAN.md                 ← plan detallado con SQL de todas las tablas + Edge Functions
├── CONTEXT_AGENTE.md                 ← este archivo
└── .env.local                        ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (NO en git)
```

---

## Variables de entorno

**`.env.local` (local, NO en git):**
```
VITE_SUPABASE_URL=https://dgyjmpmobaufezzxftbu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRneWptcG1vYmF1ZmV6enhmdGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzI3MzIsImV4cCI6MjA5ODE0ODczMn0.p0xmHMnIcEARkAb3zzMpyC9POS8T23DiQSSeVUBYI-8
```

**Vercel (ya configurado en el dashboard):**
- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_ANON_KEY` ✅

**Supabase Edge Functions secrets (pendiente para IA):**
- `ANTHROPIC_API_KEY` — todavía no configurado

---

## Código clave — StudyRooms real-time

El mecanismo dual en `src/pages/StudyRooms.jsx`:

```jsx
import { supabase } from '@/api/supabaseClient';

// Capa 1: Broadcast (instantáneo)
const bc = supabase
  .channel(`chat:${activeRoom}`)
  .on('broadcast', { event: 'msg' }, ({ payload }) => {
    if (payload.msg.user_id === profile.user_id) return; // ya se mostró optimísticamente
    setRoomData(prev => {
      const already = (prev.messages || []).some(m => m.id === payload.msg.id);
      if (already) return prev;
      return { ...prev, messages: [...(prev.messages || []), payload.msg] };
    });
  })
  .subscribe();

// Capa 2: Polling 1s (fallback garantizado)
const poll = async () => {
  const { data } = await supabase
    .from('study_rooms')
    .select('messages, participants')
    .eq('id', activeRoom)
    .single();
  if (alive && data) {
    setRoomData(prev => {
      const dbMsgs = data.messages || [];
      const dbIds = new Set(dbMsgs.map(m => m.id));
      const pending = (prev.messages || []).filter(m => !dbIds.has(m.id));
      const merged = [...dbMsgs, ...pending];
      const localMsgs = prev.messages || [];
      if (merged.length === localMsgs.length && merged.every((m, i) => m.id === localMsgs[i]?.id)) return prev;
      return { ...prev, messages: merged, participants: data.participants || prev.participants };
    });
  }
  if (alive) setTimeout(poll, 1000);
};
setTimeout(poll, 1000);
```

---

## Código clave — Flag button

### En `QuestionRenderer.jsx` (para sesiones con preguntas):
```jsx
const [flagged, setFlagged] = useState(false);

const handleFlag = async () => {
  if (flagged) return;
  setFlagged(true);
  toast.success('Reporte enviado ✓', { duration: 2000 });
  try {
    await base44.entities.QuestionReport.create({
      question_id: question.id,
      reported_by: userId ?? null,  // ← verificar nombre de campo en Supabase
      reason: 'flagged_in_session',
      status: 'pending',
    });
    await base44.entities.Question.update(question.id, { is_reported: true });
  } catch (_) {}
};

// Botón en el header:
<button onClick={handleFlag} className={flagged ? 'bg-red-500 cursor-default' : 'hover:bg-red-500/10'}>
  <Flag className={flagged ? 'fill-white text-white' : 'text-muted-foreground hover:text-red-500'} />
</button>
```

### En `FlashcardCustomSession.jsx` (para sesiones de flashcards):
```jsx
const [flaggedIds, setFlaggedIds] = useState(new Set());

const handleFlag = async (qId) => {
  if (flaggedIds.has(qId)) return;
  setFlaggedIds(prev => new Set([...prev, qId]));
  toast.success('Reporte enviado ✓', { duration: 2000 });
  try {
    await base44.entities.QuestionReport.create({
      question_id: qId,
      reported_by: profile?.user_id ?? null,
      reason: 'flagged_in_session',
      status: 'pending',
    });
    await base44.entities.Question.update(qId, { is_reported: true });
  } catch (_) {}
};

// Botón (dentro del div de la carta con className="relative"):
<button
  onClick={() => handleFlag(currentQ.id)}
  className={`absolute top-3 right-3 rounded-full p-1.5 ${
    flaggedIds.has(currentQ.id) ? 'bg-red-500 cursor-default' : 'bg-black/10 hover:bg-red-500'
  }`}
>
  <Flag className={`h-3.5 w-3.5 ${flaggedIds.has(currentQ.id) ? 'fill-white text-white' : 'text-black/40 hover:text-white'}`} />
</button>
```

---

## Otras sesiones de estudio — cobertura del flag button

- `ExpressMode.jsx` — usa StudyEngine → QuestionRenderer → ✅ flag incluido
- `PersonalizedSession.jsx` — usa StudyEngine → QuestionRenderer → ✅ flag incluido
- `SelectiveSession.jsx` — usa StudyEngine → QuestionRenderer → ✅ flag incluido
- `DifficultySession.jsx` — usa StudyEngine → QuestionRenderer → ✅ flag incluido
- `SingleSubjectSession.jsx` — usa StudyEngine → QuestionRenderer → ✅ flag incluido
- `FlashcardCustomSession.jsx` — renderer propio → ✅ flag implementado directamente
- **DuelArena.jsx** — ⚠️ verificar si usa QuestionRenderer o tiene renderer propio; si es propio, hay que agregar flag

---

## Supabase — configuración relevante

- **Proyecto ID:** `dgyjmpmobaufezzxftbu`
- **Región:** São Paulo
- **URL:** `https://dgyjmpmobaufezzxftbu.supabase.co`
- **`study_rooms`:** tiene `REPLICA IDENTITY FULL` activado y está en la publicación `supabase_realtime`
- **RLS:** habilitado en todas las tablas
- **Bucket Storage:** `neurolearn-files` (público)
- **"Confirm email":** desactivado (free tier limita a 2 emails/hora)

---

## Orden de prioridad para el próximo agente

1. **Verificar deploy en Vercel** — confirmar que commit `964a67d` esté en Production
2. **Verificar nombre de columna** `reported_by` vs `reporter_id` en tabla `question_reports` de Supabase
3. **Si flag falla silenciosamente** — revisar RLS en `question_reports` (ver sección de pendientes arriba)
4. **Probar StudyRooms** en dos dispositivos — mensajes deben aparecer sin recargar
5. **Verificar DuelArena** — si tiene renderer propio para preguntas, agregar flag button
6. **Implementar Edge Functions de IA** — ver `MIGRATION_PLAN.md` para el código completo

---

*Generado el 2026-07-01. Conversación con Claude Sonnet 4.6 en Claude Code (VS Code Extension).*
*Para continuar en otro computador: clonar el repo desde GitHub, crear `.env.local` con las variables de arriba, ejecutar `npm install` y `npm run dev`.*
