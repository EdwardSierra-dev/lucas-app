-- Migration: create_vehicles
-- Created for: Lucas App v1 — Requirement 4 (Vehicle Document Tracking)
--
-- Stores a single vehicle record per user. The expiry date columns drive the
-- vehicle document expiry reminder notifications (SOAT, Tecnomecánica, and the
-- optional road emergency kit) dispatched when a document is within 30 calendar
-- days of expiring.

CREATE TABLE IF NOT EXISTS vehicles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type         VARCHAR(50)  NOT NULL,
  model                VARCHAR(100) NOT NULL,
  purchase_date        DATE         NOT NULL,
  soat_expiry          DATE         NOT NULL,
  tecnomecanica_expiry DATE         NOT NULL,
  kit_expiry           DATE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index to accelerate the scheduler's lookups by user and the daily expiry scans.
CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON vehicles (user_id);

-- Reuse the shared set_updated_at() trigger function defined in the users
-- migration to keep updated_at current on every row modification.
CREATE TRIGGER vehicles_set_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
