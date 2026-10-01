-- Migration: create_user_expenses
-- Created for: Lucas App v1 — Requirement 2 & 3 (Expense Configuration)
--
-- A user_expense represents a user's selected/configured monthly expense slot,
-- linking a user to a category with an optional payment day (1-28) and an
-- optional configured amount.

CREATE TABLE IF NOT EXISTS user_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount         NUMERIC(14,2),
  payment_day    SMALLINT CHECK (payment_day BETWEEN 1 AND 28),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- Index to support payment reminder lookups by payment_day.
CREATE INDEX IF NOT EXISTS idx_user_expenses_payment_day
  ON user_expenses (payment_day)
  WHERE payment_day IS NOT NULL;

-- Reuse the shared set_updated_at() trigger function defined in the users
-- migration; create only the trigger for this table.
CREATE TRIGGER user_expenses_set_updated_at
BEFORE UPDATE ON user_expenses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
