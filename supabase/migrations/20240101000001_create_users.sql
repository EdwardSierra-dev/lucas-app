-- Migration: create_users
-- Created for: Lucas App v1 — Requirement 1 (User Registration)

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(254) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(100),
  currency        VARCHAR(10)  NOT NULL DEFAULT 'COP',
  vehicle_owner   BOOLEAN      NOT NULL DEFAULT false,
  email_verified  BOOLEAN      NOT NULL DEFAULT false,
  onboarding_done BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Automatically update the updated_at timestamp on every row modification.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
