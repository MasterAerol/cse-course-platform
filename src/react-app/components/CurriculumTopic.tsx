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
  const hasCurrentLesson = topic.lessons.some(
    (lesson) => lesson.publicId === currentLessonPublicId,
  )
  const [expanded, setExpanded] = useState(
    currentLessonPublicId === undefined || hasCurrentLesson,
  )
  const panelId = `topic-${topic.slug}`
  const lessonCount = topic.lessons.length
  const completedLessonCount = topic.lessons.filter(
    (lesson) => lesson.progressStatus === 'completed',
  ).length
  const lessonCountLabel = `${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`
  const progressLabel = completedLessonCount > 0
    ? `${lessonCountLabel} · ${completedLessonCount} complete`
    : lessonCountLabel

  return (
    <section className={`curriculum-topic ${hasCurrentLesson ? 'curriculum-topic--current' : ''}`}>
      <button
        className={`curriculum-toggle ${hasCurrentLesson ? 'curriculum-toggle--current' : ''}`}
        type="button"
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${topic.title} lessons`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="curriculum-toggle__title">
          <span>{topic.title}</span>
          <span className="curriculum-toggle__meta">{progressLabel}</span>
        </span>
        <span className="curriculum-toggle__action" aria-hidden="true">
          <span className="curriculum-toggle__chevron">{expanded ? '▾' : '▸'}</span>
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
