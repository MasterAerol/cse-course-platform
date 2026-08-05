import { useState } from 'react'

import type { StudentCourseCurriculum } from '../lib/api'
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

  return (
    <section className="curriculum-topic">
      <button
        className="curriculum-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>{topic.title}</span>
        <span>{expanded ? 'Hide' : 'Show'}</span>
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
