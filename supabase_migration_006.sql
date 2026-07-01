-- ============================================================
-- NEUROLEARN — Migración 006: RLS correcta para Biblioteca
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Permite que admins/mentors puedan actualizar CUALQUIER recurso
DROP POLICY IF EXISTS "library_update" ON library_resources;
CREATE POLICY "library_update" ON library_resources FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id OR
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'mentor')
  );

-- Permite que admins/mentors puedan eliminar CUALQUIER recurso
DROP POLICY IF EXISTS "library_delete" ON library_resources;
CREATE POLICY "library_delete" ON library_resources FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'mentor')
  );
