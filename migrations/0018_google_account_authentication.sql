ALTER TABLE users
    ADD COLUMN password_hash_nullable TEXT;

UPDATE users
SET password_hash_nullable = password_hash;

ALTER TABLE users
    DROP COLUMN password_hash;

ALTER TABLE users
    RENAME COLUMN password_hash_nullable TO password_hash;

CREATE TABLE user_identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL
        CHECK (provider IN ('google')),
    provider_subject TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (provider, provider_subject),
    UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_identities_user_id
    ON user_identities(user_id);
