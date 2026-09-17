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

-- INSERT INTO categories (id, user_id, name, emoji, type, is_predefined)
-- VALUES
--   (gen_random_uuid(), NULL, 'Agua',       '💧', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Luz',        '💡', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Gas',        '🔥', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Arriendo',   '🏠', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Comida',     '🍔', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Internet',   '🌐', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Colegio',    '🎒', 'mandatory', true),
--   (gen_random_uuid(), NULL, 'Transporte', '🚌', 'mandatory', true)
-- ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Predefined Categories — Optional
-- -----------------------------------------------------------------------------

-- INSERT INTO categories (id, user_id, name, emoji, type, is_predefined)
-- VALUES
--   (gen_random_uuid(), NULL, 'Netflix',      '🎬', 'optional', true),
--   (gen_random_uuid(), NULL, 'Spotify',      '🎵', 'optional', true),
--   (gen_random_uuid(), NULL, 'Amazon Prime', '📦', 'optional', true)
-- ON CONFLICT DO NOTHING;


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
