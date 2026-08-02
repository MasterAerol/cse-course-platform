import type { LessonBlock } from '../schemas/lesson-block.schemas'

export interface EnrollmentState {
  status: string
  accessStartsAt: string
  accessExpiresAt: string | null
  hasAccess: boolean
}

export interface CourseSummary {
  title: string
  slug: string
  shortDescription: string | null
  level: string | null
  thumbnailKey: string | null
  enrollment: EnrollmentState | null
}

export interface CurriculumTopicSummary {
  title: string
  slug: string
  position: number
  publishedLessonCount: number
  lessons: CurriculumLessonSummary[]
}

export interface CurriculumSubjectSummary {
  title: string
  slug: string
  position: number
  topics: CurriculumTopicSummary[]
}

export interface CourseDetail extends CourseSummary {
  description: string | null
  curriculum: CurriculumSubjectSummary[]
  subjectAssessment: import('./subject-assessment.service').SubjectAssessmentSummary | null
}

export interface ContinueLesson {
  publicId: string
  title: string
  slug: string
  lessonType: string
  summary: string | null
  isLocked: boolean
}

export interface ContinueLearningState {
  courseCompleted: boolean
  lesson: ContinueLesson | null
}

export interface CourseProgressState {
  course: CourseSummary
  enrollment: EnrollmentState
  progressPercentage: number
  completedRequiredLessons: number
  totalRequiredLessons: number
  continueLearning: ContinueLearningState
}

export interface StudentDashboardCourse extends CourseProgressState {
  enrolledAt: string
  subjectAssessment: import('./subject-assessment.service').SubjectAssessmentSummary | null
}

export interface StudentDashboard {
  courses: StudentDashboardCourse[]
}

export interface LessonAccessibility {
  canAccess: boolean
  reason:
    | 'active_enrollment'
    | 'preview'
    | 'not_required'
    | 'enrollment_required'
    | 'previous_required_lesson_incomplete'
}

export type PublicLessonProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'

export interface LessonProgressState {
  status: PublicLessonProgressStatus
  startedAt: string | null
  completedAt: string | null
  lastViewedAt: string | null
  progressPercent: number
}

export interface CurriculumLessonSummary {
  publicId: string
  title: string
  slug: string
  lessonType: string
  position: number
  estimatedMinutes: number | null
  isPreview: boolean
  isRequired: boolean
  progressStatus: PublicLessonProgressStatus
  completedAt: string | null
  isAccessible: boolean
  isLocked: boolean
  lockReason: string | null
  accessibility: LessonAccessibility
}

export interface StudentCourseCurriculum {
  course: CourseSummary
  subjects: CurriculumSubjectSummary[]
}

export interface LessonNavigationItem {
  publicId: string
  title: string
  slug: string
  lessonType: string
  estimatedMinutes: number | null
  isAccessible: boolean
  isLocked: boolean
  lockReason: string | null
}

export interface LessonDetail {
  publicId: string
  title: string
  slug: string
  summary: string | null
  lessonType: string
  estimatedMinutes: number | null
  isPreview: boolean
  course: {
    title: string
    slug: string
  }
  subject: {
    title: string
    slug: string
    position: number
  }
  topic: {
    title: string
    slug: string
    position: number
  }
  blocks: LessonBlock[]
  malformedBlockCount: number
  progress: LessonProgressState
  manualCompletionAllowed: boolean
  previousLesson: LessonNavigationItem | null
  nextLesson: LessonNavigationItem | null
  navigation: {
    currentLessonPublicId: string
    subjectPosition: number
    topicPosition: number
    lessonPosition: number
  }
}

export interface TopicProgress {
  topicSlug: string
  completedRequiredLessons: number
  totalRequiredLessons: number
  progressPercentage: number
}

export interface LessonCompletionResult {
  completedLesson: {
    publicId: string
    title: string
    progress: LessonProgressState
  }
  newlyUnlockedNextLesson: LessonNavigationItem | null
  topicProgress: TopicProgress
  courseProgress: CourseProgressState
}
