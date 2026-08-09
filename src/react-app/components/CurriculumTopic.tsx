import { useState } from 'react'

import type { StudentCourseCurriculum } from '../lib/curriculum.types'
import { CurriculumLessonItem } from './CurriculumLessonItem'

interface CurriculumTopicProps {
  courseSlug: string
  topic: StudentCourseCurriculum['subjects'][number]['topics'][number]
  currentLessonPublicId?: string
  compact?: boolean
  onLessonNavigate?: () => void
}

export function CurriculumTopic({
  courseSlug,
  topic,
  currentLessonPublicId,
  compact = false,
  onLessonNavigate,
}: CurriculumTopicProps) {
  const [expanded, setExpanded] = useState(true)
  const panelId = `topic-${topic.slug}`
  const lessonCount = topic.lessons.length
  const lessonCountLabel = `${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`

  return (
    <section className="curriculum-topic">
      <button
        className="curriculum-toggle"
        type="button"
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${topic.title} lessons`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="curriculum-toggle__title">
          <span>{topic.title}</span>
          <span className="curriculum-toggle__meta">{lessonCountLabel}</span>
        </span>
        <span className="curriculum-toggle__action" aria-hidden="true">
          <span>{expanded ? '▾' : '▸'}</span>
          <span>{expanded ? 'Hide lessons' : 'Show lessons'}</span>
        </span>
      </button>
      {expanded && (
        <ol id={panelId} className="lesson-list">
          {topic.lessons.map((lesson) => (
            <CurriculumLessonItem
              key={lesson.publicId}
              courseSlug={courseSlug}
              lesson={lesson}
              currentLessonPublicId={currentLessonPublicId}
              compact={compact}
              onNavigate={onLessonNavigate}
            />
          ))}
        </ol>
      )}
    </section>
  )
}