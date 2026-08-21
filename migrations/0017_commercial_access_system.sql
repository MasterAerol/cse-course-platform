PRAGMA foreign_keys = ON;

ALTER TABLE users
    ADD COLUMN learner_session_generation INTEGER NOT NULL DEFAULT 0
        CHECK (learner_session_generation >= 0);

ALTER TABLE users
    ADD COLUMN last_active_at TEXT;

ALTER TABLE user_sessions
    ADD COLUMN learner_session_generation INTEGER
        CHECK (
            learner_session_generation IS NULL
            OR learner_session_generation >= 0
        );

CREATE INDEX idx_users_last_active_at
    ON users(last_active_at);

CREATE INDEX idx_user_sessions_learner_generation
    ON user_sessions(user_id, learner_session_generation, revoked_at, expires_at);

CREATE TABLE subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PHP'
        CHECK (currency = upper(currency) AND length(currency) = 3),
    price_minor INTEGER NOT NULL
        CHECK (price_minor >= 0),
    duration_type TEXT NOT NULL
        CHECK (duration_type IN ('fixed_days', 'manual')),
    duration_days INTEGER
        CHECK (duration_days IS NULL OR duration_days > 0),
    access_type TEXT NOT NULL
        CHECK (access_type IN ('PREMIUM', 'TESTER')),
    entitlements_json TEXT NOT NULL DEFAULT '["premium_suite"]',
    active INTEGER NOT NULL DEFAULT 0
        CHECK (active IN (0, 1)),
    public_visible INTEGER NOT NULL DEFAULT 0
        CHECK (public_visible IN (0, 1)),
    checkout_enabled INTEGER NOT NULL DEFAULT 0
        CHECK (checkout_enabled IN (0, 1)),
    counts_as_revenue INTEGER NOT NULL DEFAULT 1
        CHECK (counts_as_revenue IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (duration_type = 'fixed_days' AND duration_days IS NOT NULL)
        OR (duration_type = 'manual' AND duration_days IS NULL)
    ),
    CHECK (public_visible = 0 OR active = 1),
    CHECK (checkout_enabled = 0 OR (active = 1 AND public_visible = 1))
);

INSERT INTO subscription_plans (
    public_id,
    slug,
    name,
    description,
    currency,
    price_minor,
    duration_type,
    duration_days,
    access_type,
    active,
    public_visible,
    checkout_enabled,
    counts_as_revenue
) VALUES
    (
        'plan-tester-premium-v1',
        'tester-premium',
        'Tester Premium',
        'Fourteen days of Premium access for approved external testers.',
        'PHP',
        0,
        'fixed_days',
        14,
        'TESTER',
        1,
        0,
        0,
        0
    ),
    (
        'plan-founding-learner-v1',
        'founding-learner',
        'Founding Learner',
        'Future thirty-day launch offer.',
        'PHP',
        14900,
        'fixed_days',
        30,
        'PREMIUM',
        1,
        0,
        0,
        1
    ),
    (
        'plan-regular-monthly-v1',
        'regular-monthly',
        'Regular Monthly',
        'Future thirty-day standard Premium offer.',
        'PHP',
        29900,
        'fixed_days',
        30,
        'PREMIUM',
        1,
        0,
        0,
        1
    ),
    (
        'plan-exam-pass-v1',
        'exam-pass',
        'Exam Pass',
        'Future exam-oriented offer; entitlement duration is not finalized.',
        'PHP',
        49900,
        'manual',
        NULL,
        'PREMIUM',
        0,
        0,
        0,
        1
    );

CREATE TABLE commercial_settings (
    setting_key TEXT PRIMARY KEY
        CHECK (
            setting_key IN (
                'public_signup',
                'show_pricing',
                'public_checkout',
                'premium_access_enforcement'
            )
        ),
    enabled INTEGER NOT NULL DEFAULT 0
        CHECK (enabled IN (0, 1)),
    description TEXT NOT NULL,
    updated_by_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO commercial_settings(setting_key, enabled, description) VALUES
    (
        'public_signup',
        0,
        'Allows public account registration only when the deployment registration gate is also open.'
    ),
    (
        'show_pricing',
        0,
        'Allows public-facing plan prices to be displayed.'
    ),
    (
        'public_checkout',
        0,
        'Allows learners to create manual payment requests.'
    ),
    (
        'premium_access_enforcement',
        0,
        'Enforces Premium entitlements for commercial learner features.'
    );

CREATE TABLE commercial_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    account_display_name TEXT,
    masked_account_info TEXT,
    instructions TEXT NOT NULL,
    qr_object_key TEXT UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0
        CHECK (enabled IN (0, 1)),
    position INTEGER NOT NULL DEFAULT 1
        CHECK (position > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_commercial_payment_methods_position
    ON commercial_payment_methods(position);

CREATE TABLE payment_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    expected_amount_minor INTEGER NOT NULL
        CHECK (expected_amount_minor >= 0),
    currency TEXT NOT NULL
        CHECK (currency = upper(currency) AND length(currency) = 3),
    status TEXT NOT NULL DEFAULT 'awaiting_payment'
        CHECK (
            status IN (
                'awaiting_payment',
                'proof_submitted',
                'under_review',
                'approved',
                'rejected',
                'cancelled',
                'refunded'
            )
        ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    proof_submitted_at TEXT,
    reviewed_at TEXT,
    approved_at TEXT,
    rejected_at TEXT,
    cancelled_at TEXT,
    refunded_at TEXT,
    reviewer_user_id INTEGER,
    rejection_reason_code TEXT,
    rejection_note TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payment_requests_user_created
    ON payment_requests(user_id, created_at DESC);

CREATE INDEX idx_payment_requests_status_submitted
    ON payment_requests(status, proof_submitted_at DESC);

CREATE TABLE payment_proofs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    payment_request_id INTEGER NOT NULL UNIQUE,
    payment_method_id INTEGER NOT NULL,
    transaction_reference TEXT NOT NULL,
    normalized_reference TEXT NOT NULL,
    payer_name TEXT,
    sender_last_digits TEXT,
    payment_occurred_at TEXT NOT NULL,
    learner_note TEXT,
    receipt_object_key TEXT NOT NULL UNIQUE,
    receipt_content_type TEXT NOT NULL
        CHECK (
            receipt_content_type IN (
                'image/jpeg',
                'image/png',
                'image/webp'
            )
        ),
    receipt_size_bytes INTEGER NOT NULL
        CHECK (receipt_size_bytes > 0 AND receipt_size_bytes <= 5242880),
    receipt_sha256 TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES commercial_payment_methods(id) ON DELETE RESTRICT
);

CREATE INDEX idx_payment_proofs_reference_lookup
    ON payment_proofs(payment_method_id, normalized_reference);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    payment_request_id INTEGER NOT NULL UNIQUE,
    amount_minor INTEGER NOT NULL
        CHECK (amount_minor >= 0),
    currency TEXT NOT NULL
        CHECK (currency = upper(currency) AND length(currency) = 3),
    status TEXT NOT NULL DEFAULT 'proof_submitted'
        CHECK (
            status IN (
                'proof_submitted',
                'under_review',
                'approved',
                'rejected',
                'refunded'
            )
        ),
    verified_by_user_id INTEGER,
    verified_at TEXT,
    rejected_at TEXT,
    refunded_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_status_created
    ON payments(status, created_at DESC);

CREATE TABLE verified_payment_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_method_id INTEGER NOT NULL,
    normalized_reference TEXT NOT NULL,
    payment_request_id INTEGER NOT NULL UNIQUE,
    payment_id INTEGER NOT NULL UNIQUE,
    verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_method_id) REFERENCES commercial_payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
    UNIQUE (payment_method_id, normalized_reference)
);

CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    payment_id INTEGER UNIQUE,
    access_type TEXT NOT NULL
        CHECK (access_type IN ('PREMIUM', 'TESTER')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'revoked', 'refunded')),
    grant_source TEXT NOT NULL
        CHECK (grant_source IN ('tester', 'admin', 'payment')),
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    granted_by_user_id INTEGER,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (datetime(expires_at) > datetime(starts_at)),
    CHECK (
        (grant_source = 'payment' AND payment_id IS NOT NULL)
        OR (grant_source <> 'payment' AND payment_id IS NULL)
    )
);

CREATE UNIQUE INDEX idx_subscriptions_one_active_per_user
    ON subscriptions(user_id)
    WHERE status = 'active';

CREATE INDEX idx_subscriptions_expiry
    ON subscriptions(status, expires_at);

CREATE TABLE commercial_entitlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL UNIQUE,
    access_type TEXT NOT NULL
        CHECK (access_type IN ('PREMIUM', 'TESTER')),
    entitlement_key TEXT NOT NULL DEFAULT 'premium_suite'
        CHECK (entitlement_key = 'premium_suite'),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'revoked', 'refunded')),
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT,
    CHECK (datetime(expires_at) > datetime(starts_at))
);

CREATE UNIQUE INDEX idx_entitlements_one_active_per_user
    ON commercial_entitlements(user_id, entitlement_key)
    WHERE status = 'active';

CREATE INDEX idx_entitlements_expiry
    ON commercial_entitlements(status, expires_at);

CREATE TRIGGER trg_payment_request_identity_immutable
BEFORE UPDATE OF user_id, plan_id, expected_amount_minor, currency ON payment_requests
BEGIN
    SELECT RAISE(ABORT, 'payment request identity is immutable');
END;

CREATE TRIGGER trg_payment_request_status_transition
BEFORE UPDATE OF status ON payment_requests
WHEN NEW.status <> OLD.status
    AND NOT (
        (OLD.status = 'awaiting_payment' AND NEW.status IN ('proof_submitted', 'cancelled'))
        OR (OLD.status = 'proof_submitted' AND NEW.status IN ('under_review', 'approved', 'rejected'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected'))
        OR (OLD.status = 'approved' AND NEW.status = 'refunded')
    )
BEGIN
    SELECT RAISE(ABORT, 'invalid payment request status transition');
END;

CREATE TRIGGER trg_payment_status_transition
BEFORE UPDATE OF status ON payments
WHEN NEW.status <> OLD.status
    AND NOT (
        (OLD.status = 'proof_submitted' AND NEW.status IN ('under_review', 'approved', 'rejected'))
        OR (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected'))
        OR (OLD.status = 'approved' AND NEW.status = 'refunded')
    )
BEGIN
    SELECT RAISE(ABORT, 'invalid payment status transition');
END;

CREATE TRIGGER trg_verified_payment_reference_immutable
BEFORE UPDATE ON verified_payment_references
BEGIN
    SELECT RAISE(ABORT, 'verified payment reference is immutable');
END;
