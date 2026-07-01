-- ============================================================
-- NEUROLEARN — Migración 004
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Agrega columna de "destacados" por usuario (array de user_ids)
ALTER TABLE library_resources
  ADD COLUMN IF NOT EXISTS favorited_by TEXT[] DEFAULT '{}';
