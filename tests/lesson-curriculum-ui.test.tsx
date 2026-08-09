import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { CourseCurriculumSidebar } from '../src/react-app/components/CourseCurriculumSidebar'
import { MobileCurriculumDrawer } from '../src/react-app/components/MobileCurriculumDrawer'
import { LessonPage } from '../src/react-app/pages/LessonPage'
import {
  activateLessonDocumentViewport,
  LESSON_DOCUMENT_VIEWPORT_CLASS,
} from '../src/react-app/lib/lesson-document-viewport'
import { percentageExampleContent } from '../scripts/lib/visual-teaching-content.mjs'
import type { StudentCourseCurriculum } from '../src/react-app/lib/curriculum.types'
import type { LessonDetail } from '../src/react-app/lib/api'

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

const percentageLesson = {
  publicId: 'lesson-finding-the-percentage',
  title: 'Finding the Percentage',
  slug: 'finding-the-percentage',
  summary: 'Find a percentage of a whole.',
  lessonType: 'reading',
  estimatedMinutes: 12,
  isPreview: false,
  course: { title: 'CSE Professional', slug: 'cse-professional' },
  subject: { title: 'Numerical Ability', slug: 'numerical-ability', position: 1 },
  topic: { title: 'Percentages', slug: 'percentages', position: 3 },
  blocks: [
    {
      id: 59,
      position: 5,
      type: 'example',
      content: percentageExampleContent,
    },
  ],
  malformedBlockCount: 0,
  progress: {
    status: 'in_progress',
    startedAt: '2026-08-07T00:00:00.000Z',
    completedAt: null,
    lastViewedAt: '2026-08-07T00:00:00.000Z',
    progressPercent: 50,
  },
  manualCompletionAllowed: true,
  previousLesson: null,
  nextLesson: null,
  navigation: {
    currentLessonPublicId: 'lesson-finding-the-percentage',
    subjectPosition: 1,
    topicPosition: 3,
    lessonPosition: 4,
  },
} satisfies LessonDetail

const percentageCurriculum = {
  course: {
    title: 'CSE Professional',
    slug: 'cse-professional',
    shortDescription: null,
    level: null,
    thumbnailKey: null,
    enrollment: {
      status: 'active',
      accessStartsAt: '2026-08-01T00:00:00.000Z',
      accessExpiresAt: null,
      hasAccess: true,
    },
  },
  subjects: [
    {
      title: 'Numerical Ability',
      slug: 'numerical-ability',
      position: 1,
      topics: [
        {
          title: 'Percentages',
          slug: 'percentages',
          position: 3,
          publishedLessonCount: 1,
          lessons: [
            {
              publicId: 'lesson-finding-the-percentage',
              title: 'Finding the Percentage',
              slug: 'finding-the-percentage',
              lessonType: 'reading',
              position: 4,
              estimatedMinutes: 12,
              isPreview: false,
              isRequired: true,
              progressStatus: 'in_progress',
              completedAt: null,
              isAccessible: true,
              isLocked: false,
              lockReason: null,
              accessibility: { canAccess: true, reason: 'active_enrollment' },
            },
          ],
        },
      ],
    },
  ],
} satisfies StudentCourseCurriculum
describe('lesson course-content navigator', () => {
  it('locks and restores the document viewport without replacing other root classes', () => {
    const tokens = new Set(['existing-root-class'])
    const deactivate = activateLessonDocumentViewport({
      add: (token) => tokens.add(token),
      remove: (token) => tokens.delete(token),
    })

    expect(tokens).toEqual(
      new Set(['existing-root-class', LESSON_DOCUMENT_VIEWPORT_CLASS]),
    )

    deactivate()
    expect(tokens).toEqual(new Set(['existing-root-class']))
  })
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
    expect(markup).toContain('Complete the previous lesson first.')
    expect(markup).toContain('Locked')
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
  it('renders the exact Percentage visual through the loaded LessonPage path', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/courses/cse-professional/lessons/lesson-finding-the-percentage']}>
        <LessonPage
          initialData={{
            lesson: percentageLesson,
            curriculum: percentageCurriculum,
          }}
        />
      </MemoryRouter>,
    )

    const appShellIndex = markup.indexOf('data-testid="lesson-app-shell"')
    const headerIndex = markup.indexOf('class="topbar lesson-page__header"')
    const workspaceIndex = markup.indexOf('class="lesson-workspace"')
    const curriculumPaneIndex = markup.indexOf('data-scroll-pane="curriculum"')
    const lessonPaneIndex = markup.indexOf('data-testid="lesson-scroll-pane"')

    expect(appShellIndex).toBeGreaterThan(-1)
    expect(headerIndex).toBeGreaterThan(appShellIndex)
    expect(workspaceIndex).toBeGreaterThan(headerIndex)
    expect(curriculumPaneIndex).toBeGreaterThan(workspaceIndex)
    expect(lessonPaneIndex).toBeGreaterThan(curriculumPaneIndex)
    expect(markup).toContain('data-scroll-pane="lesson"')
    expect(markup).toContain('Finding the Percentage')
    expect(markup).toContain('data-testid="visual-teaching-board"')
    expect(markup).toContain('data-testid="visual-scroll-shell"')
    expect(markup).toContain('data-testid="visual-scroll-left"')
    expect(markup).toContain('data-testid="visual-scroll-right"')
    expect(markup).toContain('data-testid="visual-teaching-memory"')
    expect(markup).toContain('Decimal starts here')
    expect(markup).toContain('Final decimal')
  })


})
