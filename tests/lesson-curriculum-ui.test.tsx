import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { CourseCurriculumSidebar } from '../src/react-app/components/CourseCurriculumSidebar'
import { MobileCurriculumDrawer } from '../src/react-app/components/MobileCurriculumDrawer'
import type { StudentCourseCurriculum } from '../src/react-app/lib/curriculum.types'

const curriculum = {
  course: { title: 'CSE Professional', slug: 'cse-professional', shortDescription: null, level: null, thumbnailKey: null, enrollment: null },
  subjects: [{
    title: 'Verbal Ability', slug: 'verbal-ability', position: 1,
    topics: [{
      title: 'Context Clues', slug: 'context-clues', position: 1, publishedLessonCount: 2,
      lessons: [
        {
          publicId: 'lesson-reading', title: 'Definition clues', slug: 'definition-clues', lessonType: 'reading', position: 1,
          estimatedMinutes: 8, isPreview: false, isRequired: true, progressStatus: 'in_progress', completedAt: null,
          isAccessible: true, isLocked: false, lockReason: null,
          accessibility: { canAccess: true, reason: 'active_enrollment' },
        },
        {
          publicId: 'lesson-practice', title: 'Context clues practice', slug: 'context-clues-practice', lessonType: 'practice', position: 2,
          estimatedMinutes: 10, isPreview: false, isRequired: true, progressStatus: 'not_started', completedAt: null,
          isAccessible: false, isLocked: true, lockReason: 'Complete the previous lesson.',
          accessibility: { canAccess: false, reason: 'previous_required_lesson_incomplete' },
        },
      ],
    }],
  }],
} satisfies StudentCourseCurriculum

describe('lesson course-content navigator', () => {
  it('renders the curriculum list and preserves routes and lock state', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <CourseCurriculumSidebar curriculum={curriculum} currentLessonPublicId="lesson-reading" />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-testid="course-content-list"')
    expect(markup).toContain('href="/courses/cse-professional/lessons/lesson-reading"')
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain('Context clues practice')
    expect(markup).toContain('Locked - Complete the previous lesson.')
    expect(markup).not.toContain('href="/courses/cse-professional/lessons/lesson-practice"')
  })

  it('mounts a visible, independently styled drawer only while open', () => {
    const closedMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <MobileCurriculumDrawer curriculum={curriculum} currentLessonPublicId="lesson-reading" open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    )
    const openMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <MobileCurriculumDrawer curriculum={curriculum} currentLessonPublicId="lesson-reading" open onClose={vi.fn()} />
      </MemoryRouter>,
    )

    expect(closedMarkup).toBe('')
    expect(openMarkup).toContain('data-testid="curriculum-drawer"')
    expect(openMarkup).toContain('data-testid="course-content-list"')
    expect(openMarkup).toContain('class="curriculum-drawer-backdrop"')
    expect(openMarkup).not.toContain('class="drawer-backdrop"')
  })


})