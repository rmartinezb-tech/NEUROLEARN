-- ============================================================
-- NEUROLEARN — Migración 005: Sistema de moderación de Biblioteca
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Destacados por usuario (idempotente — se puede correr aunque se haya corrido 004)
ALTER TABLE library_resources
  ADD COLUMN IF NOT EXISTS favorited_by TEXT[] DEFAULT '{}';

-- 2. Estado de moderación: pending | approved | rejected
ALTER TABLE library_resources
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 3. Todos los recursos existentes quedan aprobados automáticamente
--    (fueron publicados antes de que existiera la moderación)
UPDATE library_resources
  SET status = 'approved'
  WHERE status IS NULL OR status = 'pending';
