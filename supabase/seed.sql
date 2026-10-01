-- =============================================================================
-- Lucas App — Seed Data
-- =============================================================================
-- This file is executed automatically by `supabase db reset` after all
-- migrations have been applied. Use it to populate the local development
-- database with initial / reference data.
--
-- Run manually:   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.sql
-- Reset + seed:   supabase db reset
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Predefined Categories — Mandatory
-- These are the system-level categories available to every user (user_id NULL).
-- Seeded once; do NOT duplicate on subsequent resets (use ON CONFLICT DO NOTHING).
-- -----------------------------------------------------------------------------

INSERT INTO categories (user_id, name, emoji, type, is_predefined)
VALUES
  (NULL, 'Agua',       '💧', 'mandatory', true),
  (NULL, 'Luz',        '💡', 'mandatory', true),
  (NULL, 'Gas',        '🔥', 'mandatory', true),
  (NULL, 'Arriendo',   '🏠', 'mandatory', true),
  (NULL, 'Comida',     '🍔', 'mandatory', true),
  (NULL, 'Internet',   '🌐', 'mandatory', true),
  (NULL, 'Colegio',    '🎒', 'mandatory', true),
  (NULL, 'Transporte', '🚌', 'mandatory', true)
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Predefined Categories — Optional
-- -----------------------------------------------------------------------------

INSERT INTO categories (user_id, name, emoji, type, is_predefined)
VALUES
  (NULL, 'Netflix',      '🎬', 'optional', true),
  (NULL, 'Spotify',      '🎵', 'optional', true),
  (NULL, 'Amazon Prime', '📦', 'optional', true)
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Development / Test Users (local only — never commit real credentials)
-- Password below is bcrypt hash of "Test1234!" — change before staging use.
-- -----------------------------------------------------------------------------

-- INSERT INTO users (id, email, password_hash, display_name, currency, email_verified, onboarding_done)
-- VALUES
--   (
--     '00000000-0000-0000-0000-000000000001',
--     'dev@lucas-app.local',
--     '$2b$10$exampleHashReplaceWithRealBcryptHash',
--     'Dev User',
--     'COP',
--     true,
--     false
--   )
-- ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Add additional seed data below this line
-- -----------------------------------------------------------------------------
