# CONTEXT_AGENTE.md — Estado actual de NEUROLEARN
> Este archivo fue generado para que un nuevo agente pueda continuar el trabajo sin perder contexto.

---

## ¿Qué es este proyecto?

**NEUROLEARN** es una plataforma de estudio gamificada para estudiantes de bachillerato en medicina. Incluye banco de preguntas, modos de estudio, duelos PvP en tiempo real, torneos, tutor IA (Willie), generación de preguntas con IA, biblioteca de recursos, salas de estudio con chat, rankings, sistema de logros y más.

- **Repositorio GitHub:** `https://github.com/rmartinezb-tech/NEUROLEARN`
- **App publicada:** `https://neurolearn-five.vercel.app`
- **Base de datos:** Supabase — proyecto ID `dgyjmpmobaufezzxftbu` (región: São Paulo)
- **Directorio local:** `c:\Users\MARBECK\Desktop\Repo\NEUROLEARN`

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 6 |
| Routing | React Router v6 |
| UI | Radix UI + Tailwind CSS + shadcn/ui |
| Data/Auth | Supabase (`@supabase/supabase-js`) |
| Animaciones | Framer Motion |
| Deploy | Vercel (conectado al repo de GitHub, auto-deploy en push) |

---

## Lo que ya está funcionando ✅

### Infraestructura
- [x] **Migración completa de Base44 → Supabase** — el proyecto ya NO depende de Base44 para nada
- [x] **14 tablas creadas en Supabase** con RLS, índices y triggers de `updated_date` automático
- [x] **Auth con email/password** funcionando en producción
- [x] **App publicada en Vercel** accesible desde cualquier dispositivo/red
- [x] **Variables de entorno configuradas** en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [x] **URL Configuration en Supabase** apuntando a `https://neurolearn-five.vercel.app`

### Código
- [x] `src/api/supabaseClient.js` — instancia de Supabase
- [x] `src/api/supabaseAdapter.js` — adapter completo con interfaz idéntica al SDK de Base44 (drop-in replacement). Todas las páginas siguen usando `base44.entities.X.list()` etc. sin cambios
- [x] `src/api/base44Client.js` — ahora solo reexporta el supabaseAdapter: `export const base44 = supabaseAdapter`
- [x] `src/lib/AuthContext.jsx` — reescrito para usar `supabase.auth.getSession()` y `onAuthStateChange`
- [x] `vite.config.js` — limpio, sin el plugin de Base44
- [x] `src/components/UserNotRegisteredError.jsx` — se agregó `export default` que faltaba
- [x] Botón de Google OAuth **ocultado temporalmente** en `SignIn.jsx` y `Register.jsx`
- [x] `src/pages/LearningPaths.jsx` — **eliminado** (módulo desconectado que el usuario quería borrar)

### Supabase configurado
- [x] Tablas creadas (ver `supabase_schema.sql` en la raíz del proyecto)
- [x] RLS habilitado en todas las tablas
- [x] Bucket de Storage `neurolearn-files` creado (público)
- [x] "Confirm email" desactivado (para evitar rate limit de 2 emails/hora del free tier)
- [x] Realtime pendiente de verificar (ver sección de pendientes)

---

## Lo que falta ❌

### 1. Edge Functions de IA — CRÍTICO
Es la funcionalidad más importante pendiente. Sin esto, estas páginas dan error:
- `Willie.jsx` — tutor IA conversacional
- `AIGenerate.jsx` — generación de preguntas desde texto
- `Wellbeing.jsx` — módulo de bienestar con IA
- `ImportQuestions.jsx` — extracción de preguntas desde PDFs (usa `ExtractDataFromUploadedFile`)

**Qué hay que hacer:**
1. Instalar Supabase CLI: `npm install -g supabase`
2. `supabase login` (en terminal)
3. `supabase init` (en la raíz del proyecto)
4. Crear las dos Edge Functions:
   - `supabase functions new invoke-llm`
   - `supabase functions new extract-file`
5. Escribir el código de cada función (ver detalle abajo)
6. Configurar el secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
7. Deploy: `supabase functions deploy invoke-llm --no-verify-jwt`
8. Deploy: `supabase functions deploy extract-file --no-verify-jwt`

**Código de `invoke-llm` (archivo: `supabase/functions/invoke-llm/index.ts`):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { prompt, response_json_schema } = await req.json()

  const systemMsg = response_json_schema
    ? `Respond ONLY with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}. Return only the JSON, no markdown, no explanation.`
    : 'You are a helpful assistant.'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemMsg,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  
  let result
  if (response_json_schema) {
    try {
      result = JSON.parse(text)
    } catch {
      // Try to extract JSON from text
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      result = match ? JSON.parse(match[0]) : text
    }
  } else {
    result = text
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

**Código de `extract-file` (archivo: `supabase/functions/extract-file/index.ts`):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { file_url, json_schema } = await req.json()

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
          text: `Extract data from this document matching exactly this JSON schema: ${JSON.stringify(json_schema)}. Return only valid JSON, no markdown.`
        }
      ]
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  const result = match ? JSON.parse(match[0]) : {}

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

**El usuario necesita:**
- Una API key de Anthropic (`sk-ant-...`) — conseguirla en [console.anthropic.com](https://console.anthropic.com)
- Instalar Supabase CLI

---

### 2. Google OAuth — OPCIONAL
El botón de "Continuar con Google" fue ocultado porque Google OAuth requiere configuración externa.

**Para activarlo:**
1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → Habilitar Google Identity API
3. Credentials → Create OAuth 2.0 Client ID (tipo: Web Application)
4. Authorized redirect URI: `https://dgyjmpmobaufezzxftbu.supabase.co/auth/v1/callback`
5. Copiar Client ID y Client Secret
6. En Supabase → Authentication → Providers → Google → pegar las credenciales
7. Descomentar los botones de Google en `SignIn.jsx` y `Register.jsx`

---

### 3. Realtime — VERIFICAR
Las suscripciones en tiempo real (`Duel.subscribe`, `Notification.subscribe`, `StudyRoom.subscribe`) requieren que Supabase Replication esté activado para esas tablas.

**Para verificar/activar:**
- Supabase → Database → Publications → `supabase_realtime` → activar `duels`, `notifications`, `study_rooms`

**Nota:** En la UI actual de Supabase, la sección "Replication" que aparece en el menú es para Read Replicas (feature de pago). La configuración de Realtime para tablas está en **Database → Publications**.

---

### 4. Subida de archivos — PROBAR
El bucket `neurolearn-files` ya existe en Supabase Storage. El adapter ya tiene implementado `UploadFile`. Habría que probar subiendo una imagen en una pregunta o un archivo en la Biblioteca para confirmar que funciona.

---

## Archivos clave del proyecto

```
NEUROLEARN/
├── src/
│   ├── api/
│   │   ├── base44Client.js        ← exporta supabaseAdapter como "base44"
│   │   ├── supabaseClient.js      ← instancia de Supabase
│   │   └── supabaseAdapter.js     ← adapter completo (auth + entities + integrations)
│   ├── lib/
│   │   └── AuthContext.jsx        ← usa supabase.auth.getSession + onAuthStateChange
│   ├── pages/                     ← 20 páginas, ninguna fue modificada (excepto SignIn y Register para ocultar Google)
│   └── components/
├── supabase/                      ← TODAVÍA NO EXISTE — crear con "supabase init"
│   └── functions/                 ← crear invoke-llm y extract-file acá
├── supabase_schema.sql            ← SQL completo ya ejecutado en Supabase
├── MIGRATION_PLAN.md              ← plan detallado de migración Base44 → Supabase
├── CONTEXT_AGENTE.md              ← este archivo
└── .env.local                     ← contiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (NO en git)
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

**Supabase Edge Functions secrets (pendiente):**
- `ANTHROPIC_API_KEY` — todavía no configurado

---

## Orden de prioridad para el próximo agente

1. **Crear las Edge Functions de IA** (invoke-llm + extract-file) — desbloquea Willie, AIGenerate, Wellbeing e ImportQuestions
2. **Verificar Realtime** en Database → Publications para duelos, notificaciones y salas de estudio
3. **Probar upload de archivos** en Library o CreateQuestionModal
4. **Google OAuth** (opcional, según necesidad del usuario)

---

*Generado el 2026-06-28. Conversación original con Claude Sonnet 4.6 en Claude Code (VS Code Extension).*
