PRAGMA foreign_keys = ON;

ALTER TABLE subscription_plans
    ADD COLUMN purchase_limit INTEGER
        CHECK (purchase_limit IS NULL OR purchase_limit > 0);

UPDATE subscription_plans
SET name = 'Founding Learner',
    description = 'PasaWise Pro founding offer: complete Premium access for 30 days.',
    price_minor = 14900,
    duration_type = 'fixed_days',
    duration_days = 30,
    access_type = 'PREMIUM',
    active = 1,
    public_visible = 1,
    checkout_enabled = 1,
    counts_as_revenue = 1,
    purchase_limit = 100,
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'founding-learner';

UPDATE subscription_plans
SET name = 'Regular Monthly',
    description = 'PasaWise Pro regular monthly reference price.',
    price_minor = 29900,
    duration_type = 'fixed_days',
    duration_days = 30,
    access_type = 'PREMIUM',
    active = 1,
    public_visible = 0,
    checkout_enabled = 0,
    counts_as_revenue = 1,
    purchase_limit = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'regular-monthly';

UPDATE subscription_plans
SET name = 'Tester Premium',
    description = 'Fourteen days of full Premium access for an operator-approved beta tester.',
    price_minor = 0,
    duration_type = 'fixed_days',
    duration_days = 14,
    access_type = 'TESTER',
    active = 1,
    public_visible = 0,
    checkout_enabled = 0,
    counts_as_revenue = 0,
    purchase_limit = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'tester-premium';

CREATE TABLE beta_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN ('bug', 'content', 'confusing', 'suggestion', 'other')),
    message TEXT NOT NULL
        CHECK (length(message) BETWEEN 10 AND 2000),
    page_path TEXT NOT NULL
        CHECK (
            length(page_path) BETWEEN 1 AND 500
            AND substr(page_path, 1, 1) = '/'
            AND instr(page_path, '://') = 0
        ),
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'reviewed', 'resolved')),
    reviewed_by_user_id INTEGER,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_beta_feedback_status_created
    ON beta_feedback(status, created_at DESC);

CREATE INDEX idx_beta_feedback_user_created
    ON beta_feedback(user_id, created_at DESC);

CREATE TRIGGER trg_beta_feedback_identity_immutable
BEFORE UPDATE OF public_id, user_id, category, message, page_path, created_at
ON beta_feedback
BEGIN
    SELECT RAISE(ABORT, 'feedback submission is immutable');
END;

CREATE TRIGGER trg_plan_purchase_limit
BEFORE UPDATE OF status ON payment_requests
WHEN NEW.status = 'approved'
    AND OLD.status <> 'approved'
    AND (
        SELECT purchase_limit
        FROM subscription_plans
        WHERE id = NEW.plan_id
    ) IS NOT NULL
    AND (
        SELECT COUNT(*)
        FROM payment_requests
        WHERE plan_id = NEW.plan_id
          AND status = 'approved'
    ) >= (
        SELECT purchase_limit
        FROM subscription_plans
        WHERE id = NEW.plan_id
    )
BEGIN
    SELECT RAISE(ABORT, 'plan purchase limit reached');
END;

CREATE TRIGGER trg_tester_program_capacity
BEFORE INSERT ON commercial_entitlements
WHEN NEW.access_type = 'TESTER'
    AND NEW.status = 'active'
    AND datetime(NEW.starts_at) <= CURRENT_TIMESTAMP
    AND datetime(NEW.expires_at) > CURRENT_TIMESTAMP
    AND (
        SELECT COUNT(*)
        FROM commercial_entitlements
        WHERE access_type = 'TESTER'
          AND status = 'active'
          AND datetime(starts_at) <= CURRENT_TIMESTAMP
          AND datetime(expires_at) > CURRENT_TIMESTAMP
          AND user_id <> NEW.user_id
    ) >= 20
BEGIN
    SELECT RAISE(ABORT, 'tester program capacity reached');
END;
