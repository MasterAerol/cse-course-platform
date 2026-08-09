import type { StudentCourseCurriculum } from '../lib/curriculum.types'
import { CurriculumTopic } from './CurriculumTopic'

interface SubjectRoadmap {
  totalTopics: number
  completedTopics: number
  completedRequiredLessons: number
  totalRequiredLessons: number
  progressPercent: number
  nextLessonTitle: string | null
  nextLessonPublicId: string | null
}

interface CurriculumSubjectProps {
  courseSlug: string
  subject: StudentCourseCurriculum['subjects'][number]
  subjectRoadmap?: SubjectRoadmap
  currentLessonPublicId?: string
  compact?: boolean
  onLessonNavigate?: () => void
}

export function CurriculumSubject({
  courseSlug,
  subject,
  subjectRoadmap,
  currentLessonPublicId,
  compact = false,
  onLessonNavigate,
}: CurriculumSubjectProps) {
  return (
    <section className="curriculum-subject">
      <header className="curriculum-subject__header">
        <div>
          <h3>{subject.title}</h3>
          {subjectRoadmap === undefined ? null : (
            <p className="curriculum-subject__summary">
              {subjectRoadmap.completedTopics} of {subjectRoadmap.totalTopics} topics complete
            </p>
          )}
        </div>
        {subjectRoadmap === undefined ? null : (
          <p className="curriculum-subject__completion" aria-label="subject progress percentage">
            {subjectRoadmap.progressPercent}%
          </p>
        )}
      </header>

      {subjectRoadmap === undefined ? null : (
        <div className="curriculum-subject__progress">
          <progress
            className="progress course-detail-progress"
            value={subjectRoadmap.progressPercent}
            max={100}
            aria-label={`Topic completion ${subjectRoadmap.progressPercent}%`}
          >
            {subjectRoadmap.progressPercent}%
          </progress>
          <p className="curriculum-subject__progress-meta">
            {subjectRoadmap.completedRequiredLessons} of {subjectRoadmap.totalRequiredLessons} required lessons complete
            {subjectRoadmap.nextLessonTitle === null
              ? '. Start with practice mode to unlock this subject.'
              : `. Next lesson: ${subjectRoadmap.nextLessonTitle}`}
          </p>
        </div>
      )}

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
