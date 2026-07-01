-- ============================================================
-- NEUROLEARN — Migración 002
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Agregar columna cognitive_skill a questions
--    (almacena la habilidad cognitiva asignada a cada pregunta)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS cognitive_skill TEXT;

-- 2. Ampliar el CHECK de session_type en study_sessions
--    para incluir todos los tipos de sesión actuales del código
ALTER TABLE study_sessions
  DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_session_type_check
  CHECK (session_type IN (
    'personalized',
    'selective',
    'express',
    'duel',
    'tournament',
    'single_subject',
    'difficulty',
    'cognitive',
    'standard',
    'custom'
  ));
