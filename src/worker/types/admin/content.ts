import type { LessonBlock } from '../../schemas/lesson-block.schemas'

export type AdminEntityStatus = 'draft' | 'published' | 'archived'
export type AssessmentQuestionStatus = 'active' | 'archived'
export type PracticeQuestionSource = 'fixed' | 'generated'

export interface AdminCourseRow {
  id: number
  public_id: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  level: string | null
  thumbnail_key: string | null
  status: AdminEntityStatus
  access_duration_days: number | null
  created_at: string
  updated_at: string
}

export interface AdminSubjectRow {
  id: number
  course_id: number
  title: string
  slug: string
  description: string | null
  position: number
  status: AdminEntityStatus
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminTopicRow {
  id: number
  subject_id: number
  title: string
  slug: string
  description: string | null
  position: number
  status: AdminEntityStatus
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminLessonRow {
  id: number
  topic_id: number
  public_id: string
  title: string
  slug: string
  lesson_type: 'reading' | 'video' | 'practice' | 'quiz'
  summary: string | null
  estimated_minutes: number | null
  position: number
  is_preview: 0 | 1
  requires_previous: 0 | 1
  status: AdminEntityStatus
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminLessonBlockRow {
  id: number
  lesson_id: number
  block_type: LessonBlock['type']
  content_json: string
  position: number
  created_at: string
  updated_at: string
}

export interface AdminPracticeSetRow {
  id: number
  lesson_id: number
  title: string
  instructions: string | null
  passing_score: number
  question_count: number
  maximum_attempts: number | null
  show_explanations: 0 | 1
  status: AdminEntityStatus
  archived_at: string | null
  question_source: PracticeQuestionSource
  created_at: string
  updated_at: string
  generator_slug: string | null
  generator_version: number | null
  easy_count: number | null
  medium_count: number | null
  hard_count: number | null
}

export interface AdminPracticeQuestionRow {
  id: number
  practice_set_id: number
  prompt: string
  explanation: string | null
  points: number
  position: number
  status: AssessmentQuestionStatus
  created_at: string
  updated_at: string
}

export interface AdminPracticeChoiceRow {
  id: number
  question_id: number
  choice_text: string
  is_correct: 0 | 1
  position: number
  updated_at: string | null
}

export interface AdminQuizRow {
  id: number
  lesson_id: number | null
  topic_id: number | null
  title: string
  description: string | null
  quiz_type: 'lesson' | 'topic' | 'subject' | 'mock'
  passing_score: number
  time_limit_minutes: number | null
  maximum_attempts: number | null
  shuffle_questions: 0 | 1
  shuffle_choices: 0 | 1
  show_explanations: 0 | 1
  status: AdminEntityStatus
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminQuizQuestionRow {
  id: number
  quiz_id: number
  question_type: 'multiple_choice' | 'true_false'
  prompt: string
  explanation: string | null
  points: number
  position: number
  status: AssessmentQuestionStatus
  created_at: string
  updated_at: string
}

export interface AdminQuizChoiceRow {
  id: number
  question_id: number
  choice_text: string
  is_correct: 0 | 1
  position: number
  updated_at: string | null
}

export interface AuditLogRow {
  id: number
  actor_user_id: number | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata_json: string | null
  created_at: string
}

export interface AdminDashboardCountsRow {
  courses: number
  published_courses: number
  draft_courses: number
  subjects: number
  topics: number
  lessons: number
  published_lessons: number
  practice_sets: number
  quizzes: number
}
