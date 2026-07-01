-- ============================================================
-- NEUROLEARN — Migración 008
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Calendario: la duración del evento se elige en la UI en pasos de
-- 0.5h (0.5, 1, 1.5, 2, 2.5, 3), pero la columna era INTEGER y
-- truncaba/redondeaba esos valores. La ampliamos a NUMERIC(3,1).
ALTER TABLE calendar_events ALTER COLUMN duration TYPE NUMERIC(3,1);
