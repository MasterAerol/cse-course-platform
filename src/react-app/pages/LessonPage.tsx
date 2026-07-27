import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { CourseCurriculumSidebar } from '../components/CourseCurriculumSidebar'
import { LessonBlockRenderer } from '../components/LessonBlockRenderer'
import { LessonNavigation } from '../components/LessonNavigation'
import { MobileCurriculumDrawer } from '../components/MobileCurriculumDrawer'
import {
  ApiClientError,
  fetchLessonDetail,
  fetchStudentCourseCurriculum,
  type LessonDetail,
  type StudentCourseCurriculum,
} from '../lib/api'

type LessonPageState =
  | { status: 'loading' }
  | {
      status: 'loaded'
      lesson: LessonDetail
      curriculum: StudentCourseCurriculum
    }
  | { status: 'error'; message: string }

function getLessonErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'LESSON_NOT_FOUND') {
      return 'This lesson could not be found.'
    }

    if (error.code === 'COURSE_NOT_FOUND') {
      return 'This course could not be found.'
    }

    if (error.code === 'COURSE_ACCESS_DENIED') {
      return 'You need an active enrollment to open this lesson.'
    }

    if (error.code === 'UNAUTHENTICATED') {
      return 'Please sign in to open this lesson.'
    }
  }

  return error instanceof Error
    ? error.message
    : 'The lesson could not be loaded.'
}

export function LessonPage() {
  const { courseSlug, lessonPublicId } = useParams()
  const [state, setState] = useState<LessonPageState>({
    status: 'loading',
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadLesson(): Promise<void> {
      if (courseSlug === undefined || lessonPublicId === undefined) {
        setState({
          status: 'error',
          message: 'The lesson URL is incomplete.',
        })
        return
      }

      try {
        const [lesson, curriculum] = await Promise.all([
          fetchLessonDetail(lessonPublicId, controller.signal),
          fetchStudentCourseCurriculum(courseSlug, controller.signal),
        ])

        if (lesson.course.slug !== courseSlug) {
          setState({
            status: 'error',
            message: 'This lesson does not belong to the requested course.',
          })
          return
        }

        setState({ status: 'loaded', lesson, curriculum })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getLessonErrorMessage(error),
          })
        }
      }
    }

    void loadLesson()

    return () => {
      controller.abort()
    }
  }, [courseSlug, lessonPublicId])

  return (
    <main className="lesson-page">
      <header className="lesson-topbar">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        <div className="topbar-actions">
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
          <Link className="button-link button-link--secondary" to="/courses">
            Catalog
          </Link>
        </div>
      </header>

      {state.status === 'loading' && (
        <section className="lesson-loading" aria-live="polite">
          <p>Loading lesson...</p>
        </section>
      )}

      {state.status === 'error' && (
        <section className="message-card lesson-error" role="alert">
          <h1>Lesson unavailable</h1>
          <p>{state.message}</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}

      {state.status === 'loaded' && (
        <>
          <button
            className="mobile-curriculum-button"
            type="button"
            aria-label="Open curriculum"
            onClick={() => setDrawerOpen(true)}
          >
            Curriculum
          </button>

          <section className="lesson-layout">
            <aside className="lesson-sidebar">
              <CourseCurriculumSidebar
                curriculum={state.curriculum}
                currentLessonPublicId={state.lesson.publicId}
              />
            </aside>

            <article className="lesson-reader">
              <nav className="lesson-breadcrumb" aria-label="Breadcrumb">
                <Link to={`/courses/${state.lesson.course.slug}`}>
                  {state.lesson.course.title}
                </Link>
                <span>{state.lesson.subject.title}</span>
                <span>{state.lesson.topic.title}</span>
              </nav>

              <header className="lesson-reader__header">
                <p className="eyebrow">{state.lesson.lessonType}</p>
                <h1>{state.lesson.title}</h1>
                <p>
                  {state.lesson.estimatedMinutes !== null
                    ? `${state.lesson.estimatedMinutes} min read`
                    : 'Estimated time coming soon'}
                </p>
              </header>

              {state.lesson.malformedBlockCount > 0 && (
                <p className="form-error" role="status">
                  Some lesson material is temporarily unavailable.
                </p>
              )}

              <div className="lesson-blocks">
                {state.lesson.blocks.map((block) => (
                  <LessonBlockRenderer key={block.id} block={block} />
                ))}
              </div>

              <LessonNavigation
                courseSlug={state.lesson.course.slug}
                previousLesson={state.lesson.previousLesson}
                nextLesson={state.lesson.nextLesson}
              />
            </article>
          </section>

          <MobileCurriculumDrawer
            curriculum={state.curriculum}
            currentLessonPublicId={state.lesson.publicId}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      )}
    </main>
  )
}
