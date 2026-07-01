-- ============================================================
-- NEUROLEARN — Migración 003
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Columna stolen_item en duels
--    Almacena el ítem robado al perdedor: { type, key, label }
ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS stolen_item JSONB DEFAULT NULL;

-- 2. Cambiar defaults de challenger_score / opponent_score a NULL
--    Esto permite distinguir "no ha jugado todavía" (NULL) de "jugó y sacó 0" (0)
ALTER TABLE duels ALTER COLUMN challenger_score SET DEFAULT NULL;
ALTER TABLE duels ALTER COLUMN opponent_score   SET DEFAULT NULL;

-- 3. Limpiar duelos pending/in_progress que tienen 0 por el default antiguo
--    (Solo toca duelos que aún no completaron — los completados tienen scores reales)
UPDATE duels
  SET challenger_score = NULL
  WHERE status IN ('pending', 'in_progress')
    AND challenger_score = 0;

UPDATE duels
  SET opponent_score = NULL
  WHERE status IN ('pending', 'in_progress')
    AND opponent_score = 0;
