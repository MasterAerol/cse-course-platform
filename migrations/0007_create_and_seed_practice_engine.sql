PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS practice_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    instructions TEXT,
    passing_score INTEGER NOT NULL DEFAULT 60
        CHECK (
            passing_score >= 0
            AND passing_score <= 100
        ),
    question_count INTEGER NOT NULL DEFAULT 5
        CHECK (question_count > 0),
    maximum_attempts INTEGER,
    show_explanations INTEGER NOT NULL DEFAULT 1
        CHECK (show_explanations IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_sets_lesson_id
    ON practice_sets(lesson_id);

CREATE TABLE IF NOT EXISTS practice_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_set_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 1
        CHECK (points > 0),
    position INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (practice_set_id) REFERENCES practice_sets(id) ON DELETE CASCADE,
    UNIQUE (practice_set_id, position)
);

CREATE INDEX IF NOT EXISTS idx_practice_questions_practice_set_id
    ON practice_questions(practice_set_id);

CREATE TABLE IF NOT EXISTS practice_question_choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    choice_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0
        CHECK (is_correct IN (0, 1)),
    position INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE,
    UNIQUE (question_id, position)
);

CREATE INDEX IF NOT EXISTS idx_practice_question_choices_question_id
    ON practice_question_choices(question_id);

CREATE TABLE IF NOT EXISTS practice_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    practice_set_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (
            status IN (
                'in_progress',
                'submitted',
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
    FOREIGN KEY (practice_set_id) REFERENCES practice_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (practice_set_id, user_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_id
    ON practice_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_practice_set_id
    ON practice_attempts(practice_set_id);

CREATE TABLE IF NOT EXISTS practice_attempt_answers (
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
    FOREIGN KEY (attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_choice_id)
        REFERENCES practice_question_choices(id)
        ON DELETE SET NULL,
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_attempt_answers_attempt_id
    ON practice_attempt_answers(attempt_id);

INSERT INTO practice_sets (
    lesson_id,
    title,
    instructions,
    passing_score,
    question_count,
    maximum_attempts,
    show_explanations,
    status
)
SELECT
    lessons.id,
    lessons.title,
    'Answer each item, then submit to see explanations. These are original practice questions, not actual CSC questions.',
    60,
    5,
    NULL,
    1,
    'published'
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
    'finding-the-rate',
    'worked-examples',
    'guided-practice'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM practice_sets existing_practice_sets
    WHERE existing_practice_sets.lesson_id = lessons.id
  );

WITH seeded_questions(lesson_slug, position, prompt, explanation) AS (
    VALUES
    ('finding-the-percentage', 1, 'What is 25% of 200?', '25% is one fourth. One fourth of 200 is 50.'),
    ('finding-the-percentage', 2, 'What is 15% of 80?', 'Convert 15% to 0.15, then multiply by 80 to get 12.'),
    ('finding-the-percentage', 3, 'What is 40% of 350?', 'Convert 40% to 0.40, then multiply by 350 to get 140.'),
    ('finding-the-percentage', 4, 'What is 12% of 600?', 'Convert 12% to 0.12, then multiply by 600 to get 72.'),
    ('finding-the-percentage', 5, 'In a class of 45 students, 20% are absent. How many students are absent?', '20% is 0.20. Multiplying 45 by 0.20 gives 9 absent students.'),
    ('finding-the-base', 1, '20 is 25% of what number?', 'The base is part divided by rate: 20 divided by 0.25 is 80.'),
    ('finding-the-base', 2, '45 is 15% of what number?', 'The base is 45 divided by 0.15, which equals 300.'),
    ('finding-the-base', 3, '84 is 35% of what number?', 'The base is 84 divided by 0.35, which equals 240.'),
    ('finding-the-base', 4, '72 is 60% of what number?', 'The base is 72 divided by 0.60, which equals 120.'),
    ('finding-the-base', 5, 'A discount of 18 is 30% of the original price. What was the original price?', 'The original price is 18 divided by 0.30, which equals 60.'),
    ('finding-the-rate', 1, '30 is what percent of 120?', 'Divide 30 by 120 to get 0.25, then convert to 25%.'),
    ('finding-the-rate', 2, '18 is what percent of 72?', 'Divide 18 by 72 to get 0.25, or 25%.'),
    ('finding-the-rate', 3, '45 is what percent of 180?', 'Divide 45 by 180 to get 0.25, or 25%.'),
    ('finding-the-rate', 4, '32 is what percent of 80?', 'Divide 32 by 80 to get 0.40, or 40%.'),
    ('finding-the-rate', 5, 'A seller sold 48 of 160 tickets. What percent of the tickets were sold?', 'Divide 48 by 160 to get 0.30, or 30%.'),
    ('worked-examples', 1, 'What is 35% of 240?', 'Convert 35% to 0.35 and multiply by 240 to get 84.'),
    ('worked-examples', 2, '36 is 20% of what number?', 'Divide the part 36 by 0.20 to get the base, 180.'),
    ('worked-examples', 3, '24 is what percent of 96?', 'Divide 24 by 96 to get 0.25, or 25%.'),
    ('worked-examples', 4, 'A value increases from 150 to 180. What is the percentage increase?', 'The increase is 30. Divide 30 by 150 to get 0.20, or 20%.'),
    ('worked-examples', 5, 'An item priced at 800 is discounted by 25%. What is the sale price?', 'A 25% discount on 800 is 200, so the sale price is 600.'),
    ('guided-practice', 1, 'What is 18% of 450?', 'Convert 18% to 0.18 and multiply by 450 to get 81.'),
    ('guided-practice', 2, '64 is 40% of what number?', 'Divide 64 by 0.40 to get 160.'),
    ('guided-practice', 3, '27 is what percent of 90?', 'Divide 27 by 90 to get 0.30, or 30%.'),
    ('guided-practice', 4, 'A value decreases from 250 to 200. What is the percentage decrease?', 'The decrease is 50. Divide 50 by 250 to get 0.20, or 20%.'),
    ('guided-practice', 5, 'A product costs 500 and is marked up by 15%. What is the new price?', 'A 15% markup on 500 is 75, so the new price is 575.')
)
INSERT INTO practice_questions (
    practice_set_id,
    prompt,
    explanation,
    points,
    position,
    status
)
SELECT
    practice_sets.id,
    seeded_questions.prompt,
    seeded_questions.explanation,
    1,
    seeded_questions.position,
    'active'
FROM seeded_questions
INNER JOIN lessons ON lessons.slug = seeded_questions.lesson_slug
INNER JOIN practice_sets ON practice_sets.lesson_id = lessons.id
WHERE NOT EXISTS (
    SELECT 1
    FROM practice_questions existing_questions
    WHERE existing_questions.practice_set_id = practice_sets.id
      AND existing_questions.position = seeded_questions.position
);

WITH seeded_choices(lesson_slug, question_position, choice_text, is_correct, choice_position) AS (
    VALUES
    ('finding-the-percentage', 1, '50', 1, 1),
    ('finding-the-percentage', 1, '25', 0, 2),
    ('finding-the-percentage', 1, '75', 0, 3),
    ('finding-the-percentage', 1, '100', 0, 4),
    ('finding-the-percentage', 2, '12', 1, 1),
    ('finding-the-percentage', 2, '8', 0, 2),
    ('finding-the-percentage', 2, '15', 0, 3),
    ('finding-the-percentage', 2, '18', 0, 4),
    ('finding-the-percentage', 3, '140', 1, 1),
    ('finding-the-percentage', 3, '120', 0, 2),
    ('finding-the-percentage', 3, '160', 0, 3),
    ('finding-the-percentage', 3, '175', 0, 4),
    ('finding-the-percentage', 4, '72', 1, 1),
    ('finding-the-percentage', 4, '60', 0, 2),
    ('finding-the-percentage', 4, '84', 0, 3),
    ('finding-the-percentage', 4, '120', 0, 4),
    ('finding-the-percentage', 5, '9', 1, 1),
    ('finding-the-percentage', 5, '12', 0, 2),
    ('finding-the-percentage', 5, '18', 0, 3),
    ('finding-the-percentage', 5, '20', 0, 4),
    ('finding-the-base', 1, '80', 1, 1),
    ('finding-the-base', 1, '60', 0, 2),
    ('finding-the-base', 1, '75', 0, 3),
    ('finding-the-base', 1, '100', 0, 4),
    ('finding-the-base', 2, '300', 1, 1),
    ('finding-the-base', 2, '225', 0, 2),
    ('finding-the-base', 2, '250', 0, 3),
    ('finding-the-base', 2, '350', 0, 4),
    ('finding-the-base', 3, '240', 1, 1),
    ('finding-the-base', 3, '210', 0, 2),
    ('finding-the-base', 3, '280', 0, 3),
    ('finding-the-base', 3, '294', 0, 4),
    ('finding-the-base', 4, '120', 1, 1),
    ('finding-the-base', 4, '108', 0, 2),
    ('finding-the-base', 4, '132', 0, 3),
    ('finding-the-base', 4, '180', 0, 4),
    ('finding-the-base', 5, '60', 1, 1),
    ('finding-the-base', 5, '54', 0, 2),
    ('finding-the-base', 5, '72', 0, 3),
    ('finding-the-base', 5, '90', 0, 4),
    ('finding-the-rate', 1, '25%', 1, 1),
    ('finding-the-rate', 1, '20%', 0, 2),
    ('finding-the-rate', 1, '30%', 0, 3),
    ('finding-the-rate', 1, '40%', 0, 4),
    ('finding-the-rate', 2, '25%', 1, 1),
    ('finding-the-rate', 2, '18%', 0, 2),
    ('finding-the-rate', 2, '30%', 0, 3),
    ('finding-the-rate', 2, '40%', 0, 4),
    ('finding-the-rate', 3, '25%', 1, 1),
    ('finding-the-rate', 3, '20%', 0, 2),
    ('finding-the-rate', 3, '35%', 0, 3),
    ('finding-the-rate', 3, '45%', 0, 4),
    ('finding-the-rate', 4, '40%', 1, 1),
    ('finding-the-rate', 4, '32%', 0, 2),
    ('finding-the-rate', 4, '48%', 0, 3),
    ('finding-the-rate', 4, '60%', 0, 4),
    ('finding-the-rate', 5, '30%', 1, 1),
    ('finding-the-rate', 5, '25%', 0, 2),
    ('finding-the-rate', 5, '35%', 0, 3),
    ('finding-the-rate', 5, '48%', 0, 4),
    ('worked-examples', 1, '84', 1, 1),
    ('worked-examples', 1, '72', 0, 2),
    ('worked-examples', 1, '96', 0, 3),
    ('worked-examples', 1, '120', 0, 4),
    ('worked-examples', 2, '180', 1, 1),
    ('worked-examples', 2, '160', 0, 2),
    ('worked-examples', 2, '200', 0, 3),
    ('worked-examples', 2, '220', 0, 4),
    ('worked-examples', 3, '25%', 1, 1),
    ('worked-examples', 3, '20%', 0, 2),
    ('worked-examples', 3, '30%', 0, 3),
    ('worked-examples', 3, '40%', 0, 4),
    ('worked-examples', 4, '20%', 1, 1),
    ('worked-examples', 4, '15%', 0, 2),
    ('worked-examples', 4, '25%', 0, 3),
    ('worked-examples', 4, '30%', 0, 4),
    ('worked-examples', 5, '600', 1, 1),
    ('worked-examples', 5, '575', 0, 2),
    ('worked-examples', 5, '625', 0, 3),
    ('worked-examples', 5, '700', 0, 4),
    ('guided-practice', 1, '81', 1, 1),
    ('guided-practice', 1, '72', 0, 2),
    ('guided-practice', 1, '90', 0, 3),
    ('guided-practice', 1, '99', 0, 4),
    ('guided-practice', 2, '160', 1, 1),
    ('guided-practice', 2, '120', 0, 2),
    ('guided-practice', 2, '180', 0, 3),
    ('guided-practice', 2, '200', 0, 4),
    ('guided-practice', 3, '30%', 1, 1),
    ('guided-practice', 3, '27%', 0, 2),
    ('guided-practice', 3, '33%', 0, 3),
    ('guided-practice', 3, '40%', 0, 4),
    ('guided-practice', 4, '20%', 1, 1),
    ('guided-practice', 4, '25%', 0, 2),
    ('guided-practice', 4, '30%', 0, 3),
    ('guided-practice', 4, '40%', 0, 4),
    ('guided-practice', 5, '575', 1, 1),
    ('guided-practice', 5, '525', 0, 2),
    ('guided-practice', 5, '550', 0, 3),
    ('guided-practice', 5, '600', 0, 4)
)
INSERT INTO practice_question_choices (
    question_id,
    choice_text,
    is_correct,
    position
)
SELECT
    practice_questions.id,
    seeded_choices.choice_text,
    seeded_choices.is_correct,
    seeded_choices.choice_position
FROM seeded_choices
INNER JOIN lessons ON lessons.slug = seeded_choices.lesson_slug
INNER JOIN practice_sets ON practice_sets.lesson_id = lessons.id
INNER JOIN practice_questions
    ON practice_questions.practice_set_id = practice_sets.id
    AND practice_questions.position = seeded_choices.question_position
WHERE NOT EXISTS (
    SELECT 1
    FROM practice_question_choices existing_choices
    WHERE existing_choices.question_id = practice_questions.id
      AND existing_choices.position = seeded_choices.choice_position
);
