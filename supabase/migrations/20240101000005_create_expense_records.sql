-- Migration: create_expense_records
-- Created for: Lucas App v1 — Requirement 5 (Expense records / financial entries)
--
-- An expense_record is a dated financial entry (an actual logged transaction)
-- associated with a user and a category. It drives the metrics module.
--
-- Note on budget_id: expense records may optionally belong to a shared budget.
-- The shared_budgets table is introduced in a later migration
-- (20240101000006_create_shared_budgets.sql, task 11.1), so the column is
-- created here without its foreign-key constraint. That later migration adds
-- the FK (ON DELETE SET NULL) once shared_budgets exists.

CREATE TABLE IF NOT EXISTS expense_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  budget_id    UUID,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0 AND amount <= 999999999.99),
  description  VARCHAR(255),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index to support metrics queries filtering by user and date range.
CREATE INDEX IF NOT EXISTS idx_expense_records_user_date
  ON expense_records (user_id, expense_date);

-- Index to support lookups and aggregation by category.
CREATE INDEX IF NOT EXISTS idx_expense_records_category
  ON expense_records (category_id);
