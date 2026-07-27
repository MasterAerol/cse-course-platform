PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'admin')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),
    email_verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT,
    revoked_at TEXT,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user_id
    ON user_sessions(user_id);

CREATE INDEX idx_user_sessions_expires_at
    ON user_sessions(expires_at);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    description TEXT,
    level TEXT,
    thumbnail_key TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    access_duration_days INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (course_id, slug),
    UNIQUE (course_id, position)
);

CREATE INDEX idx_subjects_course_id
    ON subjects(course_id);

CREATE TABLE topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (subject_id, slug),
    UNIQUE (subject_id, position)
);

CREATE INDEX idx_topics_subject_id
    ON topics(subject_id);

CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    public_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    lesson_type TEXT NOT NULL DEFAULT 'reading'
        CHECK (
            lesson_type IN (
                'reading',
                'video',
                'practice',
                'quiz'
            )
        ),
    summary TEXT,
    estimated_minutes INTEGER,
    position INTEGER NOT NULL DEFAULT 1,
    is_preview INTEGER NOT NULL DEFAULT 0
        CHECK (is_preview IN (0, 1)),
    requires_previous INTEGER NOT NULL DEFAULT 1
        CHECK (requires_previous IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    UNIQUE (topic_id, slug),
    UNIQUE (topic_id, position)
);

CREATE INDEX idx_lessons_topic_id
    ON lessons(topic_id);

CREATE TABLE lesson_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    block_type TEXT NOT NULL
        CHECK (
            block_type IN (
                'heading',
                'paragraph',
                'callout',
                'formula',
                'example',
                'image',
                'video',
                'divider',
                'summary'
            )
        ),
    content_json TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE (lesson_id, position)
);

CREATE INDEX idx_lesson_blocks_lesson_id
    ON lesson_blocks(lesson_id);

CREATE TABLE course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrollment_status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            enrollment_status IN (
                'active',
                'expired',
                'revoked',
                'completed'
            )
        ),
    enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    access_starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    access_expires_at TEXT,
    completed_at TEXT,
    enrollment_source TEXT NOT NULL DEFAULT 'admin'
        CHECK (
            enrollment_source IN (
                'admin',
                'purchase',
                'coupon',
                'free'
            )
        ),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (user_id, course_id)
);

CREATE INDEX idx_course_enrollments_user_id
    ON course_enrollments(user_id);

CREATE INDEX idx_course_enrollments_course_id
    ON course_enrollments(course_id);

CREATE TABLE lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (
            status IN (
                'not_started',
                'in_progress',
                'completed'
            )
        ),
    started_at TEXT,
    completed_at TEXT,
    last_viewed_at TEXT,
    progress_percent INTEGER NOT NULL DEFAULT 0
        CHECK (
            progress_percent >= 0
            AND progress_percent <= 100
        ),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user_id
    ON lesson_progress(user_id);

CREATE INDEX idx_lesson_progress_lesson_id
    ON lesson_progress(lesson_id);

CREATE TABLE quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER,
    topic_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    quiz_type TEXT NOT NULL DEFAULT 'lesson'
        CHECK (
            quiz_type IN (
                'lesson',
                'topic',
                'subject',
                'mock'
            )
        ),
    passing_score INTEGER NOT NULL DEFAULT 70
        CHECK (
            passing_score >= 0
            AND passing_score <= 100
        ),
    time_limit_minutes INTEGER,
    maximum_attempts INTEGER,
    shuffle_questions INTEGER NOT NULL DEFAULT 0
        CHECK (shuffle_questions IN (0, 1)),
    shuffle_choices INTEGER NOT NULL DEFAULT 0
        CHECK (shuffle_choices IN (0, 1)),
    show_explanations INTEGER NOT NULL DEFAULT 1
        CHECK (show_explanations IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    CHECK (
        lesson_id IS NOT NULL
        OR topic_id IS NOT NULL
    )
);

CREATE INDEX idx_quizzes_lesson_id
    ON quizzes(lesson_id);

CREATE INDEX idx_quizzes_topic_id
    ON quizzes(topic_id);

CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice'
        CHECK (
            question_type IN (
                'multiple_choice',
                'true_false'
            )
        ),
    prompt TEXT NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 1
        CHECK (points > 0),
    position INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    UNIQUE (quiz_id, position)
);

CREATE INDEX idx_questions_quiz_id
    ON questions(quiz_id);

CREATE TABLE question_choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    choice_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0
        CHECK (is_correct IN (0, 1)),
    position INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE (question_id, position)
);

CREATE INDEX idx_question_choices_question_id
    ON question_choices(question_id);

CREATE TABLE quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    quiz_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (
            status IN (
                'in_progress',
                'submitted',
                'expired',
                'abandoned'
            )
        ),
    total_points INTEGER NOT NULL DEFAULT 0,
    earned_points INTEGER NOT NULL DEFAULT 0,
    score_percent REAL,
    passed INTEGER
        CHECK (
            passed IS NULL
            OR passed IN (0, 1)
        ),
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TEXT,
    expires_at TEXT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE INDEX idx_quiz_attempts_user_id
    ON quiz_attempts(user_id);

CREATE INDEX idx_quiz_attempts_quiz_id
    ON quiz_attempts(quiz_id);

CREATE TABLE quiz_attempt_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    selected_choice_id INTEGER,
    is_correct INTEGER
        CHECK (
            is_correct IS NULL
            OR is_correct IN (0, 1)
        ),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    answered_at TEXT,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_choice_id)
        REFERENCES question_choices(id)
        ON DELETE SET NULL,
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_quiz_attempt_answers_attempt_id
    ON quiz_attempt_answers(attempt_id);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_actor_user_id
    ON audit_logs(actor_user_id);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);
