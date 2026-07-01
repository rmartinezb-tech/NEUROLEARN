-- ============================================================
-- NEUROLEARN — Migración 010
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- Problema: el CHECK constraint en study_sessions.session_type
-- no incluye 'flashcard_custom', causando que las sesiones de
-- flashcards fallen silenciosamente al guardarse.
-- Esta migración amplía el constraint para incluir todos los
-- tipos de sesión que el código realmente utiliza.

ALTER TABLE study_sessions DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;

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
    'cognitive_skill',
    'standard',
    'custom',
    'flashcard_custom',
    'flashcard'
  ));
