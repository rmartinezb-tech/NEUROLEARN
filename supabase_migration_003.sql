-- ============================================================
-- NEUROLEARN — Migración 003 (reemplaza versión anterior)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Flags booleanos explícitos para saber si cada jugador ya jugó.
--    Esto es más robusto que depender del score (que puede ser 0 legítimamente).
ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS challenger_played BOOLEAN DEFAULT FALSE;

ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS opponent_played BOOLEAN DEFAULT FALSE;

-- 2. Ítem robado al perdedor (JSON: { type, key, label })
ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS stolen_item JSONB DEFAULT NULL;

-- 3. Cambiar DEFAULT de scores a NULL para distinguir
--    "no ha jugado" (NULL) de "jugó y sacó 0/10" (0)
ALTER TABLE duels ALTER COLUMN challenger_score SET DEFAULT NULL;
ALTER TABLE duels ALTER COLUMN opponent_score   SET DEFAULT NULL;

-- 4. Limpiar duelos pending/in_progress que tienen 0 por el DEFAULT antiguo
--    (seguro: duelos completados no se tocan porque tienen scores reales)
UPDATE duels
  SET challenger_score = NULL,
      challenger_played = FALSE
  WHERE status IN ('pending', 'in_progress')
    AND (challenger_played IS NULL OR challenger_played = FALSE)
    AND challenger_score = 0;

UPDATE duels
  SET opponent_score = NULL,
      opponent_played = FALSE
  WHERE status IN ('pending', 'in_progress')
    AND (opponent_played IS NULL OR opponent_played = FALSE)
    AND opponent_score = 0;

-- 5. Marcar como played = TRUE los duelos completados
--    para que el historial no quede roto
UPDATE duels
  SET challenger_played = TRUE,
      opponent_played   = TRUE
  WHERE status = 'completed';
