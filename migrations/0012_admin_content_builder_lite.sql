ALTER TABLE subjects
    ADD COLUMN archived_at TEXT;

ALTER TABLE topics
    ADD COLUMN archived_at TEXT;

ALTER TABLE lessons
    ADD COLUMN archived_at TEXT;

ALTER TABLE quizzes
    ADD COLUMN archived_at TEXT;

ALTER TABLE practice_sets
    ADD COLUMN archived_at TEXT;

ALTER TABLE question_choices
    ADD COLUMN updated_at TEXT;

UPDATE question_choices
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

ALTER TABLE practice_question_choices
    ADD COLUMN updated_at TEXT;

UPDATE practice_question_choices
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

CREATE INDEX idx_audit_logs_action_created_at
    ON audit_logs(action, created_at);

CREATE INDEX idx_audit_logs_entity_created_at
    ON audit_logs(entity_type, created_at);
