-- Migration: create_loans
-- Created for: Lucas App v1 — Requirement 7 (Loan Tracking)
--
-- Stores loan records per user. A loan is either a bank loan (fixed
-- installment_amount) or a person loan (capital + interest_per_inst accrued
-- over total_installments). Active loans are those where installments_paid is
-- still below total_installments. The CHECK constraints enforce the loan input
-- validation rules exercised by properties P18 and P19.

CREATE TABLE IF NOT EXISTS loans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source              VARCHAR(10) NOT NULL CHECK (source IN ('bank','person')),
  -- bank loan fields
  installment_amount  NUMERIC(14,2) CHECK (installment_amount > 0),
  -- person loan fields
  capital             NUMERIC(14,2) CHECK (capital > 0),
  interest_per_inst   NUMERIC(14,2) CHECK (interest_per_inst >= 0),
  total_installments  INTEGER CHECK (total_installments > 0),
  installments_paid   INTEGER NOT NULL DEFAULT 0,
  -- common
  description         VARCHAR(255),
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bank_loan_fields   CHECK (source <> 'bank'   OR installment_amount IS NOT NULL),
  CONSTRAINT person_loan_fields CHECK (source <> 'person' OR (capital IS NOT NULL AND interest_per_inst IS NOT NULL AND total_installments IS NOT NULL)),
  -- P18/P19 loan validation: paid installments stay within bounds
  CONSTRAINT installments_paid_non_negative CHECK (installments_paid >= 0),
  CONSTRAINT installments_paid_within_total CHECK (total_installments IS NULL OR installments_paid <= total_installments)
);

-- Index to accelerate per-user active-loan lookups.
CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans (user_id);

-- Reuse the shared set_updated_at() trigger function defined in the users
-- migration to keep updated_at current on every row modification.
CREATE TRIGGER loans_set_updated_at
BEFORE UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
