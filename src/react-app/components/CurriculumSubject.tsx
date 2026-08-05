import type { StudentCourseCurriculum } from '../lib/curriculum.types'
import { CurriculumTopic } from './CurriculumTopic'

interface CurriculumSubjectProps {
  courseSlug: string
  subject: StudentCourseCurriculum['subjects'][number]
  currentLessonPublicId?: string
  compact?: boolean
  onLessonNavigate?: () => void
}

export function CurriculumSubject({
  courseSlug,
  subject,
  currentLessonPublicId,
  compact = false,
  onLessonNavigate,
}: CurriculumSubjectProps) {
  return (
    <section className="curriculum-subject">
      <h3>{subject.title}</h3>
      <div className="topic-list">
        {subject.topics.map((topic) => (
          <CurriculumTopic
            key={topic.slug}
            courseSlug={courseSlug}
            topic={topic}
            currentLessonPublicId={currentLessonPublicId}
            compact={compact}
            onLessonNavigate={onLessonNavigate}
          />
        ))}
      </div>
    </section>
  )
}
