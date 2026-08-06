PRAGMA foreign_keys = ON;

-- Additive v1 schema: no historical attempt or snapshot is rewritten.
-- Fixed mapping tables start empty because 782 positions still need editorial
-- review and fingerprints. Mastery remains derived; no mutable aggregate exists.

CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE, taxonomy_version INTEGER NOT NULL CHECK(taxonomy_version>0),
  subject_id INTEGER NOT NULL, topic_id INTEGER, related_lesson_id INTEGER,
  title TEXT NOT NULL CHECK(length(trim(title))>0), description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','deprecated')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  FOREIGN KEY(related_lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);
CREATE INDEX idx_skills_subject ON skills(subject_id);
CREATE INDEX idx_skills_topic ON skills(topic_id);
CREATE INDEX idx_skills_related_lesson ON skills(related_lesson_id);
CREATE INDEX idx_skills_active_subject ON skills(subject_id,slug) WHERE status='active';
-- Slugs are evidence identifiers and cannot be silently renamed.
CREATE TRIGGER trg_skills_slug_immutable BEFORE UPDATE OF slug ON skills
WHEN NEW.slug<>OLD.slug BEGIN SELECT RAISE(ABORT,'skill slugs are immutable'); END;

CREATE TABLE practice_question_skills (
  question_id INTEGER NOT NULL, skill_id INTEGER NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN(0,1)),
  mapping_version INTEGER NOT NULL CHECK(mapping_version>0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(question_id,skill_id),
  FOREIGN KEY(question_id) REFERENCES practice_questions(id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE RESTRICT
);
CREATE INDEX idx_practice_question_skills_question ON practice_question_skills(question_id);
CREATE INDEX idx_practice_question_skills_skill ON practice_question_skills(skill_id,question_id);
CREATE UNIQUE INDEX idx_practice_question_skills_one_primary
  ON practice_question_skills(question_id) WHERE is_primary=1;

CREATE TABLE quiz_question_skills (
  question_id INTEGER NOT NULL, skill_id INTEGER NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN(0,1)),
  mapping_version INTEGER NOT NULL CHECK(mapping_version>0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(question_id,skill_id),
  FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE RESTRICT
);
CREATE INDEX idx_quiz_question_skills_question ON quiz_question_skills(question_id);
CREATE INDEX idx_quiz_question_skills_skill ON quiz_question_skills(skill_id,question_id);
CREATE UNIQUE INDEX idx_quiz_question_skills_one_primary
  ON quiz_question_skills(question_id) WHERE is_primary=1;

CREATE TABLE recovery_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL, course_id INTEGER NOT NULL,
  attempt_seed TEXT NOT NULL CHECK(length(trim(attempt_seed))>0),
  idempotency_key TEXT NOT NULL CHECK(length(trim(idempotency_key))>0),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN('in_progress','submitted')),
  taxonomy_version INTEGER NOT NULL CHECK(taxonomy_version>0),
  weakness_formula_version INTEGER NOT NULL CHECK(weakness_formula_version>0),
  question_count INTEGER NOT NULL CHECK(question_count>0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK(correct_count>=0 AND correct_count<=question_count),
  score_percent REAL CHECK(score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(user_id,idempotency_key), UNIQUE(user_id,attempt_seed),
  CHECK((status='in_progress' AND submitted_at IS NULL AND score_percent IS NULL)
     OR (status='submitted' AND submitted_at IS NOT NULL AND score_percent IS NOT NULL))
);
CREATE UNIQUE INDEX idx_recovery_attempts_one_active
  ON recovery_attempts(user_id,course_id) WHERE status='in_progress';
CREATE INDEX idx_recovery_attempts_user_history ON recovery_attempts(user_id,created_at DESC);
CREATE INDEX idx_recovery_attempts_course_user_status ON recovery_attempts(course_id,user_id,status);
CREATE TRIGGER trg_recovery_attempts_closed_immutable BEFORE UPDATE ON recovery_attempts
WHEN OLD.status='submitted' BEGIN SELECT RAISE(ABORT,'submitted recovery attempts are immutable'); END;

CREATE TABLE recovery_question_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT NOT NULL UNIQUE,
  attempt_id INTEGER NOT NULL, source_position INTEGER NOT NULL CHECK(source_position>0),
  skill_id INTEGER NOT NULL, skill_slug TEXT NOT NULL, skill_title TEXT NOT NULL,
  subject_slug TEXT NOT NULL, subject_title TEXT NOT NULL,
  topic_slug TEXT, topic_title TEXT, related_lesson_slug TEXT, related_lesson_title TEXT,
  source_kind TEXT NOT NULL CHECK(source_kind IN('generated','fixed_practice','fixed_quiz')),
  practice_question_id INTEGER, quiz_question_id INTEGER,
  generator_slug TEXT, generator_version INTEGER, generator_seed TEXT,
  difficulty TEXT CHECK(difficulty IS NULL OR difficulty IN('easy','medium','hard')),
  prompt TEXT NOT NULL, explanation_json TEXT NOT NULL,
  parameters_json TEXT NOT NULL, metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(attempt_id) REFERENCES recovery_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE RESTRICT,
  FOREIGN KEY(practice_question_id) REFERENCES practice_questions(id) ON DELETE RESTRICT,
  FOREIGN KEY(quiz_question_id) REFERENCES questions(id) ON DELETE RESTRICT,
  UNIQUE(attempt_id,source_position), UNIQUE(attempt_id,id),
  CHECK((topic_slug IS NULL AND topic_title IS NULL) OR (topic_slug IS NOT NULL AND topic_title IS NOT NULL)),
  CHECK((related_lesson_slug IS NULL AND related_lesson_title IS NULL)
     OR (related_lesson_slug IS NOT NULL AND related_lesson_title IS NOT NULL)),
  CHECK((source_kind='generated' AND practice_question_id IS NULL AND quiz_question_id IS NULL
         AND generator_slug IS NOT NULL AND generator_version>0 AND generator_seed IS NOT NULL)
     OR (source_kind='fixed_practice' AND practice_question_id IS NOT NULL AND quiz_question_id IS NULL
         AND generator_slug IS NULL AND generator_version IS NULL AND generator_seed IS NULL)
     OR (source_kind='fixed_quiz' AND practice_question_id IS NULL AND quiz_question_id IS NOT NULL
         AND generator_slug IS NULL AND generator_version IS NULL AND generator_seed IS NULL))
);
-- Labels are snapshotted so historical display never depends on live titles.
CREATE INDEX idx_recovery_snapshots_attempt_position ON recovery_question_snapshots(attempt_id,source_position);
CREATE INDEX idx_recovery_snapshots_attempt_skill ON recovery_question_snapshots(attempt_id,skill_id,source_position);
CREATE INDEX idx_recovery_snapshots_skill ON recovery_question_snapshots(skill_id,created_at DESC);
CREATE UNIQUE INDEX idx_recovery_snapshots_generated_seed
  ON recovery_question_snapshots(attempt_id,generator_slug,generator_version,generator_seed)
  WHERE source_kind='generated';
CREATE UNIQUE INDEX idx_recovery_snapshots_fixed_practice
  ON recovery_question_snapshots(attempt_id,practice_question_id) WHERE source_kind='fixed_practice';
CREATE UNIQUE INDEX idx_recovery_snapshots_fixed_quiz
  ON recovery_question_snapshots(attempt_id,quiz_question_id) WHERE source_kind='fixed_quiz';
CREATE TRIGGER trg_recovery_snapshots_no_update BEFORE UPDATE ON recovery_question_snapshots
BEGIN SELECT RAISE(ABORT,'recovery question snapshots are immutable'); END;
CREATE TRIGGER trg_recovery_snapshots_insert_open_attempt BEFORE INSERT ON recovery_question_snapshots
WHEN NOT EXISTS(SELECT 1 FROM recovery_attempts WHERE id=NEW.attempt_id AND status='in_progress')
BEGIN SELECT RAISE(ABORT,'recovery attempt is not open'); END;
CREATE TRIGGER trg_recovery_snapshots_delete_closed_attempt BEFORE DELETE ON recovery_question_snapshots
WHEN EXISTS(SELECT 1 FROM recovery_attempts WHERE id=OLD.attempt_id AND status='submitted')
BEGIN SELECT RAISE(ABORT,'submitted recovery snapshots are immutable'); END;

CREATE TABLE recovery_question_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT NOT NULL UNIQUE,
  snapshot_id INTEGER NOT NULL, choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK(is_correct IN(0,1)),
  position INTEGER NOT NULL CHECK(position>0), distractor_type TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(snapshot_id) REFERENCES recovery_question_snapshots(id) ON DELETE CASCADE,
  UNIQUE(snapshot_id,position), UNIQUE(snapshot_id,choice_text)
);
CREATE INDEX idx_recovery_choices_snapshot ON recovery_question_choices(snapshot_id,position);
CREATE UNIQUE INDEX idx_recovery_choices_one_correct
  ON recovery_question_choices(snapshot_id) WHERE is_correct=1;
CREATE TRIGGER trg_recovery_choices_no_update BEFORE UPDATE ON recovery_question_choices
BEGIN SELECT RAISE(ABORT,'recovery question choices are immutable'); END;
CREATE TRIGGER trg_recovery_choices_insert_closed_attempt BEFORE INSERT ON recovery_question_choices
WHEN EXISTS(SELECT 1 FROM recovery_question_snapshots s JOIN recovery_attempts a ON a.id=s.attempt_id
            WHERE s.id=NEW.snapshot_id AND a.status='submitted')
BEGIN SELECT RAISE(ABORT,'submitted recovery choices are immutable'); END;

CREATE TABLE recovery_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL,
  snapshot_id INTEGER NOT NULL, selected_choice_id INTEGER,
  selected_choice_text_snapshot TEXT, correct_choice_text_snapshot TEXT,
  is_correct INTEGER CHECK(is_correct IS NULL OR is_correct IN(0,1)),
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK(points_awarded>=0), answered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(attempt_id,snapshot_id) REFERENCES recovery_question_snapshots(attempt_id,id) ON DELETE CASCADE,
  FOREIGN KEY(selected_choice_id) REFERENCES recovery_question_choices(id) ON DELETE SET NULL,
  UNIQUE(attempt_id,snapshot_id)
);
CREATE INDEX idx_recovery_answers_attempt ON recovery_answers(attempt_id,snapshot_id);
CREATE INDEX idx_recovery_answers_snapshot ON recovery_answers(snapshot_id);
CREATE TRIGGER trg_recovery_answers_insert_open_attempt BEFORE INSERT ON recovery_answers
WHEN NOT EXISTS(SELECT 1 FROM recovery_attempts WHERE id=NEW.attempt_id AND status='in_progress')
BEGIN SELECT RAISE(ABORT,'recovery attempt is not open'); END;
CREATE TRIGGER trg_recovery_answers_update_open_attempt BEFORE UPDATE ON recovery_answers
WHEN NOT EXISTS(SELECT 1 FROM recovery_attempts WHERE id=OLD.attempt_id AND status='in_progress')
BEGIN SELECT RAISE(ABORT,'submitted recovery answers are immutable'); END;
CREATE TRIGGER trg_recovery_answers_insert_choice_ownership BEFORE INSERT ON recovery_answers
WHEN NEW.selected_choice_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM recovery_question_choices WHERE id=NEW.selected_choice_id AND snapshot_id=NEW.snapshot_id)
BEGIN SELECT RAISE(ABORT,'selected choice does not belong to snapshot'); END;
CREATE TRIGGER trg_recovery_answers_update_choice_ownership
BEFORE UPDATE OF selected_choice_id,snapshot_id ON recovery_answers
WHEN NEW.selected_choice_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM recovery_question_choices WHERE id=NEW.selected_choice_id AND snapshot_id=NEW.snapshot_id)
BEGIN SELECT RAISE(ABORT,'selected choice does not belong to snapshot'); END;

-- Keep one statement per trigger body for Wrangler remote migration parsing.
CREATE TRIGGER trg_recovery_attempt_submit_snapshot_count
BEFORE UPDATE OF status ON recovery_attempts
WHEN NEW.status='submitted'
  AND (SELECT COUNT(*) FROM recovery_question_snapshots WHERE attempt_id=NEW.id)<>NEW.question_count
BEGIN
  SELECT RAISE(ABORT,'recovery snapshot count does not match question count');
END;

-- Unanswered questions are allowed and score zero, matching existing assessments.
-- Exactly one server-authored correct choice is required for every snapshot.
CREATE TRIGGER trg_recovery_attempt_submit_correct_choice
BEFORE UPDATE OF status ON recovery_attempts
WHEN NEW.status='submitted' AND EXISTS(
  SELECT 1 FROM recovery_question_snapshots s WHERE s.attempt_id=NEW.id
    AND (SELECT COUNT(*) FROM recovery_question_choices c WHERE c.snapshot_id=s.id AND c.is_correct=1)<>1)
BEGIN
  SELECT RAISE(ABORT,'every recovery question must have exactly one correct choice');
END;
