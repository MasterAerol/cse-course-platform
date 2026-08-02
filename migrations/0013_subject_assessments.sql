PRAGMA foreign_keys = ON;

CREATE TABLE subject_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    subject_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    position INTEGER NOT NULL,
    passing_score INTEGER NOT NULL DEFAULT 70
        CHECK (passing_score >= 0 AND passing_score <= 100),
    question_count INTEGER NOT NULL DEFAULT 50
        CHECK (question_count > 0),
    maximum_attempts INTEGER
        CHECK (maximum_attempts IS NULL OR maximum_attempts > 0),
    time_limit_minutes INTEGER
        CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    show_explanations INTEGER NOT NULL DEFAULT 1
        CHECK (show_explanations IN (0, 1)),
    current_blueprint_version INTEGER NOT NULL DEFAULT 1
        CHECK (current_blueprint_version > 0),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (subject_id, position)
);

CREATE INDEX idx_subject_assessments_status_subject
    ON subject_assessments(status, subject_id);

CREATE TABLE subject_assessment_blueprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    passing_score_percent INTEGER NOT NULL
        CHECK (passing_score_percent >= 0 AND passing_score_percent <= 100),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES subject_assessments(id) ON DELETE CASCADE,
    UNIQUE (assessment_id, version)
);

CREATE TABLE subject_assessment_blueprint_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blueprint_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    topic_slug TEXT NOT NULL,
    topic_title TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    question_count INTEGER NOT NULL CHECK (question_count > 0),
    easy_count INTEGER NOT NULL CHECK (easy_count >= 0),
    medium_count INTEGER NOT NULL CHECK (medium_count >= 0),
    hard_count INTEGER NOT NULL CHECK (hard_count >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blueprint_id) REFERENCES subject_assessment_blueprints(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT,
    UNIQUE (blueprint_id, topic_id),
    UNIQUE (blueprint_id, topic_slug),
    UNIQUE (blueprint_id, position),
    CHECK (easy_count + medium_count + hard_count = question_count)
);

CREATE INDEX idx_subject_assessment_blueprint_topics_blueprint
    ON subject_assessment_blueprint_topics(blueprint_id, position);

CREATE TABLE subject_assessment_blueprint_generators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blueprint_topic_id INTEGER NOT NULL,
    generator_slug TEXT NOT NULL,
    generator_version INTEGER NOT NULL CHECK (generator_version > 0),
    rotation_position INTEGER NOT NULL CHECK (rotation_position > 0),
    selection_weight INTEGER NOT NULL DEFAULT 1 CHECK (selection_weight > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blueprint_topic_id)
        REFERENCES subject_assessment_blueprint_topics(id) ON DELETE CASCADE,
    UNIQUE (blueprint_topic_id, generator_slug, generator_version),
    UNIQUE (blueprint_topic_id, rotation_position)
);

CREATE INDEX idx_subject_assessment_blueprint_generators_topic
    ON subject_assessment_blueprint_generators(blueprint_topic_id, rotation_position);

CREATE TABLE subject_assessment_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    assessment_id INTEGER NOT NULL,
    blueprint_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    attempt_seed TEXT NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
    total_points INTEGER NOT NULL DEFAULT 50 CHECK (total_points > 0),
    earned_points INTEGER NOT NULL DEFAULT 0 CHECK (earned_points >= 0),
    score_percent REAL,
    passed INTEGER CHECK (passed IS NULL OR passed IN (0, 1)),
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TEXT,
    FOREIGN KEY (assessment_id) REFERENCES subject_assessments(id) ON DELETE RESTRICT,
    FOREIGN KEY (blueprint_id) REFERENCES subject_assessment_blueprints(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (assessment_id, user_id, attempt_number),
    UNIQUE (assessment_id, user_id, attempt_seed)
);

CREATE INDEX idx_subject_assessment_attempts_user_history
    ON subject_assessment_attempts(user_id, assessment_id, attempt_number DESC);

CREATE UNIQUE INDEX idx_subject_assessment_attempts_one_active
    ON subject_assessment_attempts(assessment_id, user_id)
    WHERE status = 'in_progress';

CREATE TABLE subject_assessment_question_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    attempt_id INTEGER NOT NULL,
    source_position INTEGER NOT NULL CHECK (source_position > 0),
    topic_slug TEXT NOT NULL,
    topic_title TEXT NOT NULL,
    topic_position INTEGER NOT NULL CHECK (topic_position > 0),
    generator_slug TEXT NOT NULL,
    generator_version INTEGER NOT NULL CHECK (generator_version > 0),
    seed TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    prompt TEXT NOT NULL,
    explanation_json TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES subject_assessment_attempts(id) ON DELETE CASCADE,
    UNIQUE (attempt_id, source_position),
    UNIQUE (attempt_id, prompt),
    UNIQUE (attempt_id, generator_slug, generator_version, seed)
);

CREATE INDEX idx_subject_assessment_snapshots_attempt_topic
    ON subject_assessment_question_snapshots(attempt_id, topic_position, source_position);

CREATE TABLE subject_assessment_question_choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    snapshot_id INTEGER NOT NULL,
    choice_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
    position INTEGER NOT NULL CHECK (position > 0),
    distractor_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snapshot_id)
        REFERENCES subject_assessment_question_snapshots(id) ON DELETE CASCADE,
    UNIQUE (snapshot_id, position),
    UNIQUE (snapshot_id, choice_text)
);

CREATE INDEX idx_subject_assessment_choices_snapshot
    ON subject_assessment_question_choices(snapshot_id, position);

CREATE UNIQUE INDEX idx_subject_assessment_choices_one_correct
    ON subject_assessment_question_choices(snapshot_id)
    WHERE is_correct = 1;

CREATE TABLE subject_assessment_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    snapshot_id INTEGER NOT NULL,
    selected_choice_id INTEGER,
    selected_choice_text_snapshot TEXT,
    correct_choice_text_snapshot TEXT,
    is_correct INTEGER CHECK (is_correct IS NULL OR is_correct IN (0, 1)),
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded IN (0, 1)),
    answered_at TEXT,
    FOREIGN KEY (attempt_id) REFERENCES subject_assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (snapshot_id)
        REFERENCES subject_assessment_question_snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_choice_id)
        REFERENCES subject_assessment_question_choices(id) ON DELETE SET NULL,
    UNIQUE (attempt_id, snapshot_id)
);

CREATE INDEX idx_subject_assessment_answers_attempt
    ON subject_assessment_answers(attempt_id, snapshot_id);

CREATE TRIGGER trg_subject_assessment_snapshots_no_update
BEFORE UPDATE ON subject_assessment_question_snapshots
BEGIN
    SELECT RAISE(ABORT, 'subject assessment question snapshots are immutable');
END;

CREATE TRIGGER trg_subject_assessment_choices_no_update
BEFORE UPDATE ON subject_assessment_question_choices
BEGIN
    SELECT RAISE(ABORT, 'subject assessment question choices are immutable');
END;
