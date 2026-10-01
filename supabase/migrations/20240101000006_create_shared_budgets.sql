-- Migration: create_shared_budgets
-- Created for: Lucas App v1 — Requirement 5 (Shared Budgets)
-- Tables created in dependency order:
--   shared_budgets -> budget_members, budget_invitations, budget_incomes

CREATE TABLE IF NOT EXISTS shared_budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100),
  monthly_limit   NUMERIC(14,2) CHECK (monthly_limit > 0 AND monthly_limit <= 999999999.99),
  limit_notified  BOOLEAN NOT NULL DEFAULT false,  -- tracks if over-limit notification was sent this cycle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_members (
  budget_id   UUID NOT NULL REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (budget_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_members_user ON budget_members(user_id);

CREATE TABLE IF NOT EXISTS budget_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id     UUID NOT NULL REFERENCES shared_budgets(id) ON DELETE CASCADE,
  inviter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(254) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_budget_invitations_budget ON budget_invitations(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_invitations_email  ON budget_invitations(invitee_email);

CREATE TABLE IF NOT EXISTS budget_incomes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   UUID NOT NULL REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0 AND amount <= 999999999.99),
  description VARCHAR(255),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_incomes_budget ON budget_incomes(budget_id);

-- Reuse the shared set_updated_at() trigger function (defined in the users migration)
-- for the only table in this migration that carries an updated_at column.
CREATE TRIGGER shared_budgets_set_updated_at
BEFORE UPDATE ON shared_budgets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Deferred FK: expense_records.budget_id -> shared_budgets(id).
-- The expense_records table (migration 20240101000005) created budget_id
-- without its FK because shared_budgets did not yet exist. Now that it does,
-- add the constraint with ON DELETE SET NULL so deleting a shared budget
-- detaches its expense records rather than deleting them.
-- -----------------------------------------------------------------------------
ALTER TABLE expense_records
  ADD CONSTRAINT fk_expense_records_budget
  FOREIGN KEY (budget_id) REFERENCES shared_budgets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_records_budget
  ON expense_records (budget_id)
  WHERE budget_id IS NOT NULL;
