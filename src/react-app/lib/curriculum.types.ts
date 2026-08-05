export interface CurriculumEnrollment {
  status: 'active' | 'expired' | 'revoked' | 'completed'
  accessStartsAt: string
  accessExpiresAt: string | null
  hasAccess: boolean
}

export interface CurriculumLesson {
  publicId: string
  title: string
  slug: string
  lessonType: string
  position: number
  estimatedMinutes: number | null
  isPreview: boolean
  isRequired: boolean
  progressStatus: 'not_started' | 'in_progress' | 'completed'
  completedAt: string | null
  isAccessible: boolean
  isLocked: boolean
  lockReason: string | null
  accessibility: {
    canAccess: boolean
    reason:
      | 'active_enrollment'
      | 'preview'
      | 'not_required'
      | 'enrollment_required'
      | 'previous_required_lesson_incomplete'
  }
}

export interface StudentCourseCurriculum {
  course: {
    title: string
    slug: string
    shortDescription: string | null
    level: string | null
    thumbnailKey: string | null
    enrollment: CurriculumEnrollment | null
  }
  subjects: Array<{
    title: string
    slug: string
    position: number
    topics: Array<{
      title: string
      slug: string
      position: number
      publishedLessonCount: number
      lessons: CurriculumLesson[]
    }>
  }>
}