-- Migration: create_categories
-- Created for: Lucas App v1 — Requirement 2 (Mandatory Expense Configuration)
--                              Requirement 3 (Optional Expense Configuration)
--
-- Predefined categories have user_id = NULL and is_predefined = true and are
-- available to every user. Custom categories are owned by a single user.

CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = predefined
  name          VARCHAR(40) NOT NULL,
  emoji         VARCHAR(10) NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('mandatory','optional','vehicle','loan','income')),
  is_predefined BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)  -- prevents duplicate category names per user
);

-- Case-insensitive uniqueness per user, including the predefined set (user_id NULL).
-- A plain UNIQUE constraint ignores NULLs, so a partial unique index covers the
-- predefined rows explicitly, while a second index covers per-user custom rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_predefined_name
  ON categories (lower(name))
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name
  ON categories (user_id, lower(name))
  WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Seed predefined categories (shared by all users; user_id = NULL).
-- -----------------------------------------------------------------------------

-- Mandatory (8) — Requirement 2.1
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

-- Optional (3) — Requirement 3.1
INSERT INTO categories (user_id, name, emoji, type, is_predefined)
VALUES
  (NULL, 'Netflix',      '🎬', 'optional', true),
  (NULL, 'Spotify',      '🎵', 'optional', true),
  (NULL, 'Amazon Prime', '📦', 'optional', true)
ON CONFLICT DO NOTHING;
