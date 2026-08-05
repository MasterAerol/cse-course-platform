import type { StudentCourseCurriculum } from '../lib/curriculum.types'
import { CurriculumSubject } from './CurriculumSubject'

interface CourseCurriculumSidebarProps {
  curriculum: StudentCourseCurriculum
  currentLessonPublicId?: string
  compact?: boolean
  onLessonNavigate?: () => void
}

export function CourseCurriculumSidebar({
  curriculum,
  currentLessonPublicId,
  compact = false,
  onLessonNavigate,
}: CourseCurriculumSidebarProps) {
  return (
    <nav
      className="curriculum-sidebar"
      aria-label="Course curriculum"
      data-testid="course-content-list"
    >
      <div className="curriculum-sidebar__header">
        <p className="eyebrow">Course content</p>
        <h2>{curriculum.course.title}</h2>
      </div>
      {curriculum.subjects.map((subject) => (
        <CurriculumSubject
          key={subject.slug}
          courseSlug={curriculum.course.slug}
          subject={subject}
          currentLessonPublicId={currentLessonPublicId}
          compact={compact}
          onLessonNavigate={onLessonNavigate}
        />
      ))}
    </nav>
  )
}
