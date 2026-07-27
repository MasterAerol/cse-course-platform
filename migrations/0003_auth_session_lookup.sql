CREATE INDEX idx_user_sessions_user_active
    ON user_sessions(user_id, revoked_at, expires_at);
