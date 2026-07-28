PRAGMA foreign_keys = ON;

ALTER TABLE practice_sets
    ADD COLUMN question_source TEXT NOT NULL DEFAULT 'fixed'
        CHECK (question_source IN ('fixed', 'generated'));

CREATE TABLE IF NOT EXISTS practice_set_generator_configs (
    practice_set_id INTEGER PRIMARY KEY,
    generator_slug TEXT NOT NULL,
    generator_version INTEGER NOT NULL,
    easy_count INTEGER NOT NULL DEFAULT 0
        CHECK (easy_count >= 0),
    medium_count INTEGER NOT NULL DEFAULT 0
        CHECK (medium_count >= 0),
    hard_count INTEGER NOT NULL DEFAULT 0
        CHECK (hard_count >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (practice_set_id) REFERENCES practice_sets(id) ON DELETE CASCADE,
    UNIQUE (generator_slug, generator_version, practice_set_id),
    CHECK ((easy_count + medium_count + hard_count) > 0)
);

CREATE INDEX IF NOT EXISTS idx_practice_set_generator_configs_slug_version
    ON practice_set_generator_configs(generator_slug, generator_version);

CREATE TABLE IF NOT EXISTS generated_question_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    owner_user_id INTEGER NOT NULL,
    practice_attempt_id INTEGER NOT NULL,
    source_position INTEGER NOT NULL,
    generator_slug TEXT NOT NULL,
    generator_version INTEGER NOT NULL,
    seed TEXT NOT NULL,
    difficulty TEXT NOT NULL
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    prompt TEXT NOT NULL,
    explanation_json TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (practice_attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE,
    UNIQUE (practice_attempt_id, source_position),
    UNIQUE (practice_attempt_id, generator_slug, generator_version, seed)
);

CREATE INDEX IF NOT EXISTS idx_generated_question_snapshots_owner_user_id
    ON generated_question_snapshots(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_generated_question_snapshots_attempt_id
    ON generated_question_snapshots(practice_attempt_id);

CREATE TABLE IF NOT EXISTS generated_question_choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    public_id TEXT NOT NULL UNIQUE,
    choice_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0
        CHECK (is_correct IN (0, 1)),
    position INTEGER NOT NULL,
    distractor_type TEXT,
    FOREIGN KEY (snapshot_id) REFERENCES generated_question_snapshots(id) ON DELETE CASCADE,
    UNIQUE (snapshot_id, position),
    UNIQUE (snapshot_id, choice_text)
);

CREATE INDEX IF NOT EXISTS idx_generated_question_choices_snapshot_id
    ON generated_question_choices(snapshot_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_question_choices_one_correct
    ON generated_question_choices(snapshot_id)
    WHERE is_correct = 1;

CREATE TABLE IF NOT EXISTS generated_practice_attempt_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    snapshot_id INTEGER NOT NULL,
    selected_choice_id INTEGER,
    is_correct INTEGER
        CHECK (
            is_correct IS NULL
            OR is_correct IN (0, 1)
        ),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    answered_at TEXT,
    FOREIGN KEY (attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (snapshot_id) REFERENCES generated_question_snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_choice_id)
        REFERENCES generated_question_choices(id)
        ON DELETE SET NULL,
    UNIQUE (attempt_id, snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_practice_attempt_answers_attempt_id
    ON generated_practice_attempt_answers(attempt_id);

CREATE TRIGGER IF NOT EXISTS trg_generated_question_snapshots_no_update
BEFORE UPDATE ON generated_question_snapshots
BEGIN
    SELECT RAISE(ABORT, 'generated question snapshots are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_generated_question_choices_no_update
BEFORE UPDATE ON generated_question_choices
BEGIN
    SELECT RAISE(ABORT, 'generated question choices are immutable');
END;

UPDATE practice_sets
SET question_source = 'generated',
    updated_at = CURRENT_TIMESTAMP
WHERE lesson_id IN (
    SELECT lessons.id
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND subjects.slug = 'numerical-ability'
      AND topics.slug = 'percentages'
      AND lessons.slug IN (
        'finding-the-percentage',
        'finding-the-base',
        'finding-the-rate'
      )
);

INSERT INTO practice_set_generator_configs (
    practice_set_id,
    generator_slug,
    generator_version,
    easy_count,
    medium_count,
    hard_count
)
SELECT
    practice_sets.id,
    CASE lessons.slug
        WHEN 'finding-the-percentage' THEN 'finding-percentage'
        WHEN 'finding-the-base' THEN 'finding-base'
        WHEN 'finding-the-rate' THEN 'finding-rate'
    END,
    1,
    2,
    2,
    1
FROM practice_sets
INNER JOIN lessons ON lessons.id = practice_sets.lesson_id
INNER JOIN topics ON topics.id = lessons.topic_id
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
  AND subjects.slug = 'numerical-ability'
  AND topics.slug = 'percentages'
  AND lessons.slug IN (
    'finding-the-percentage',
    'finding-the-base',
    'finding-the-rate'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM practice_set_generator_configs existing_configs
    WHERE existing_configs.practice_set_id = practice_sets.id
  );
