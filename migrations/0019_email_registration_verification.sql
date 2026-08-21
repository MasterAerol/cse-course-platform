-- PasaWise Authentication UX v2: pending email/password registration.
-- Existing active learners are preserved and treated as verified legacy users.

CREATE TABLE pending_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'EMAIL_REGISTRATION_VERIFICATION'
    CHECK (purpose = 'EMAIL_REGISTRATION_VERIFICATION'),
  code_hash TEXT NOT NULL,
  code_expires_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (attempt_count BETWEEN 0 AND 5),
  resend_available_at TEXT NOT NULL,
  pending_expires_at TEXT NOT NULL,
  last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pending_registrations_expiry
  ON pending_registrations(pending_expires_at);

ALTER TABLE users ADD COLUMN email_verification_method TEXT
  CHECK (email_verification_method IN ('legacy', 'email_otp', 'google'));

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at),
    email_verification_method = CASE
      WHEN EXISTS (
        SELECT 1
        FROM user_identities
        WHERE user_identities.user_id = users.id
          AND user_identities.provider = 'google'
      ) THEN 'google'
      ELSE 'legacy'
    END,
    updated_at = updated_at;
