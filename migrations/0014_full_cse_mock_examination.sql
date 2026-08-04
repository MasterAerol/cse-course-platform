PRAGMA foreign_keys = ON;

CREATE TABLE mock_examinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  course_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  simulation_label TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  passing_score INTEGER NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  timed_duration_minutes INTEGER NOT NULL CHECK (timed_duration_minutes > 0),
  maximum_attempts INTEGER CHECK (maximum_attempts IS NULL OR maximum_attempts > 0),
  show_explanations INTEGER NOT NULL DEFAULT 1 CHECK (show_explanations IN (0,1)),
  current_blueprint_version INTEGER NOT NULL CHECK (current_blueprint_version > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  source_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_mock_examinations_course_status ON mock_examinations(course_id,status);

CREATE TABLE mock_exam_blueprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mock_exam_id INTEGER NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  label TEXT NOT NULL,
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  passing_score_percent INTEGER NOT NULL CHECK (passing_score_percent BETWEEN 0 AND 100),
  timed_duration_minutes INTEGER NOT NULL CHECK (timed_duration_minutes > 0),
  easy_count INTEGER NOT NULL CHECK (easy_count >= 0),
  medium_count INTEGER NOT NULL CHECK (medium_count >= 0),
  hard_count INTEGER NOT NULL CHECK (hard_count >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mock_exam_id) REFERENCES mock_examinations(id) ON DELETE CASCADE,
  UNIQUE(mock_exam_id,version),
  CHECK(easy_count + medium_count + hard_count = total_questions)
);

CREATE TABLE mock_exam_blueprint_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blueprint_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  subject_assessment_id INTEGER NOT NULL,
  subject_slug TEXT NOT NULL,
  subject_title TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  easy_count INTEGER NOT NULL CHECK (easy_count >= 0),
  medium_count INTEGER NOT NULL CHECK (medium_count >= 0),
  hard_count INTEGER NOT NULL CHECK (hard_count >= 0),
  FOREIGN KEY (blueprint_id) REFERENCES mock_exam_blueprints(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (subject_assessment_id) REFERENCES subject_assessments(id) ON DELETE RESTRICT,
  UNIQUE(blueprint_id,subject_id), UNIQUE(blueprint_id,position),
  CHECK(easy_count + medium_count + hard_count = question_count)
);

CREATE TABLE mock_exam_blueprint_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blueprint_subject_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  topic_slug TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  easy_count INTEGER NOT NULL CHECK (easy_count >= 0),
  medium_count INTEGER NOT NULL CHECK (medium_count >= 0),
  hard_count INTEGER NOT NULL CHECK (hard_count >= 0),
  FOREIGN KEY (blueprint_subject_id) REFERENCES mock_exam_blueprint_subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT,
  UNIQUE(blueprint_subject_id,topic_id), UNIQUE(blueprint_subject_id,position),
  CHECK(easy_count + medium_count + hard_count = question_count)
);

CREATE TABLE mock_exam_blueprint_generators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blueprint_topic_id INTEGER NOT NULL,
  generator_slug TEXT NOT NULL,
  generator_version INTEGER NOT NULL CHECK(generator_version > 0),
  rotation_position INTEGER NOT NULL CHECK(rotation_position > 0),
  selection_weight INTEGER NOT NULL DEFAULT 1 CHECK(selection_weight > 0),
  FOREIGN KEY (blueprint_topic_id) REFERENCES mock_exam_blueprint_topics(id) ON DELETE CASCADE,
  UNIQUE(blueprint_topic_id,generator_slug,generator_version), UNIQUE(blueprint_topic_id,rotation_position)
);

CREATE TABLE mock_exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  mock_exam_id INTEGER NOT NULL,
  blueprint_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  attempt_seed TEXT NOT NULL,
  attempt_number INTEGER NOT NULL CHECK(attempt_number > 0),
  mode TEXT NOT NULL CHECK(mode IN ('timed','untimed')),
  status TEXT NOT NULL DEFAULT 'instructions' CHECK(status IN ('instructions','in_progress','submitted','expired','abandoned')),
  total_points INTEGER NOT NULL DEFAULT 150 CHECK(total_points > 0),
  earned_points INTEGER NOT NULL DEFAULT 0 CHECK(earned_points >= 0),
  score_percent REAL,
  passed INTEGER CHECK(passed IS NULL OR passed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  deadline_at TEXT,
  submitted_at TEXT,
  duration_seconds INTEGER,
  auto_submitted INTEGER NOT NULL DEFAULT 0 CHECK(auto_submitted IN (0,1)),
  FOREIGN KEY(mock_exam_id) REFERENCES mock_examinations(id) ON DELETE RESTRICT,
  FOREIGN KEY(blueprint_id) REFERENCES mock_exam_blueprints(id) ON DELETE RESTRICT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(mock_exam_id,user_id,attempt_number), UNIQUE(mock_exam_id,user_id,attempt_seed),
  CHECK((mode='untimed' AND deadline_at IS NULL) OR mode='timed')
);
CREATE UNIQUE INDEX idx_mock_attempt_one_active ON mock_exam_attempts(mock_exam_id,user_id) WHERE status IN ('instructions','in_progress');
CREATE INDEX idx_mock_attempt_history ON mock_exam_attempts(user_id,mock_exam_id,attempt_number DESC);

CREATE TABLE mock_exam_question_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  attempt_id INTEGER NOT NULL,
  source_position INTEGER NOT NULL CHECK(source_position > 0),
  subject_slug TEXT NOT NULL, subject_title TEXT NOT NULL, subject_position INTEGER NOT NULL,
  topic_slug TEXT NOT NULL, topic_title TEXT NOT NULL, topic_position INTEGER NOT NULL,
  generator_slug TEXT NOT NULL, generator_version INTEGER NOT NULL, seed TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
  prompt TEXT NOT NULL, explanation_json TEXT NOT NULL, parameters_json TEXT NOT NULL, metadata_json TEXT NOT NULL,
  marked_for_review INTEGER NOT NULL DEFAULT 0 CHECK(marked_for_review IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(attempt_id) REFERENCES mock_exam_attempts(id) ON DELETE CASCADE,
  UNIQUE(attempt_id,source_position), UNIQUE(attempt_id,prompt), UNIQUE(attempt_id,generator_slug,generator_version,seed)
);
CREATE INDEX idx_mock_snapshots_attempt ON mock_exam_question_snapshots(attempt_id,source_position);

CREATE TABLE mock_exam_question_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT NOT NULL UNIQUE, snapshot_id INTEGER NOT NULL,
  choice_text TEXT NOT NULL, is_correct INTEGER NOT NULL DEFAULT 0 CHECK(is_correct IN (0,1)),
  position INTEGER NOT NULL CHECK(position > 0), distractor_type TEXT,
  FOREIGN KEY(snapshot_id) REFERENCES mock_exam_question_snapshots(id) ON DELETE CASCADE,
  UNIQUE(snapshot_id,position), UNIQUE(snapshot_id,choice_text)
);
CREATE UNIQUE INDEX idx_mock_choices_one_correct ON mock_exam_question_choices(snapshot_id) WHERE is_correct=1;

CREATE TABLE mock_exam_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL, snapshot_id INTEGER NOT NULL,
  selected_choice_id INTEGER, selected_choice_text_snapshot TEXT, correct_choice_text_snapshot TEXT,
  is_correct INTEGER CHECK(is_correct IS NULL OR is_correct IN (0,1)), points_awarded INTEGER NOT NULL DEFAULT 0 CHECK(points_awarded IN (0,1)), answered_at TEXT,
  FOREIGN KEY(attempt_id) REFERENCES mock_exam_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY(snapshot_id) REFERENCES mock_exam_question_snapshots(id) ON DELETE CASCADE,
  FOREIGN KEY(selected_choice_id) REFERENCES mock_exam_question_choices(id) ON DELETE SET NULL,
  UNIQUE(attempt_id,snapshot_id)
);

CREATE TABLE mock_exam_subject_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL, subject_slug TEXT NOT NULL, subject_title TEXT NOT NULL, position INTEGER NOT NULL,
  total_count INTEGER NOT NULL, correct_count INTEGER NOT NULL, incorrect_count INTEGER NOT NULL, unanswered_count INTEGER NOT NULL, percentage REAL NOT NULL, status TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES mock_exam_attempts(id) ON DELETE CASCADE, UNIQUE(attempt_id,subject_slug)
);
CREATE TABLE mock_exam_topic_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL, subject_slug TEXT NOT NULL, topic_slug TEXT NOT NULL, topic_title TEXT NOT NULL, position INTEGER NOT NULL,
  total_count INTEGER NOT NULL, correct_count INTEGER NOT NULL, incorrect_count INTEGER NOT NULL, unanswered_count INTEGER NOT NULL, percentage REAL NOT NULL, status TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES mock_exam_attempts(id) ON DELETE CASCADE, UNIQUE(attempt_id,topic_slug)
);

CREATE TRIGGER trg_mock_snapshots_no_content_update BEFORE UPDATE OF public_id,attempt_id,source_position,subject_slug,subject_title,subject_position,topic_slug,topic_title,topic_position,generator_slug,generator_version,seed,difficulty,prompt,explanation_json,parameters_json,metadata_json ON mock_exam_question_snapshots BEGIN SELECT RAISE(ABORT,'mock exam question snapshots are immutable'); END;
CREATE TRIGGER trg_mock_choices_no_update BEFORE UPDATE ON mock_exam_question_choices BEGIN SELECT RAISE(ABORT,'mock exam question choices are immutable'); END;
