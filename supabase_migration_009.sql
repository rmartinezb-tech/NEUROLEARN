-- ============================================================
-- NEUROLEARN — Migración 009
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Nuevas columnas de media en preguntas
-- (image_url ya existe; GIFs usan image_url porque son imágenes)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS video_url TEXT;
