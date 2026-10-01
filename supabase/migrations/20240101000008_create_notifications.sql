-- Migration: create_notifications
-- Created for: Lucas App v1 — Requirement (Proactive Notifications)

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,  -- 'payment_reminder' | 'vehicle_expiry' | 'budget_limit' | 'budget_invitation'
  payload     JSONB NOT NULL,
  channel     VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','push','email')),
  read        BOOLEAN NOT NULL DEFAULT false,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports unread-count queries that feed the NotificationBadge and
-- ordered retrieval of a user's notification feed.
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
