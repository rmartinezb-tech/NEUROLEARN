-- ============================================================
-- NEUROLEARN — Migración 007
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Calendario: RLS separada para eventos individuales vs grupales
--    La política anterior solo permitía ver los propios eventos.
--    Ahora los eventos grupales son visibles a todos los autenticados.
DROP POLICY IF EXISTS "calendar_all" ON calendar_events;

-- Control total sobre los propios eventos
CREATE POLICY "calendar_own" ON calendar_events FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lectura de eventos grupales de cualquier usuario
CREATE POLICY "calendar_group_select" ON calendar_events FOR SELECT TO authenticated
  USING (view_type = 'group');

-- 2. Torneos: columna para registrar quién inició el torneo
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS started_by UUID;
