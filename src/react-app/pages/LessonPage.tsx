import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { CourseCurriculumSidebar } from '../components/CourseCurriculumSidebar'
import { LessonBlockRenderer } from '../components/LessonBlockRenderer'
import { LessonNavigation } from '../components/LessonNavigation'
import { MobileCurriculumDrawer } from '../components/MobileCurriculumDrawer'
import {
  ApiClientError,
  completeLesson,
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

    if (
      error.code === 'COURSE_ACCESS_DENIED' ||
      error.code === 'ENROLLMENT_REQUIRED' ||
      error.code === 'COURSE_ACCESS_EXPIRED'
    ) {
      return 'You need an active enrollment to open this lesson.'
    }

    if (error.code === 'LESSON_LOCKED') {
      return 'Complete the previous required lesson to unlock this lesson.'
    }

    if (error.code === 'LESSON_NOT_STARTED') {
      return 'Start the lesson before marking it complete.'
    }

    if (error.code === 'COMPLETION_REQUIRES_ACTIVITY') {
      return 'This activity cannot be completed manually yet.'
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
  const [completionStatus, setCompletionStatus] = useState<
    | { type: 'idle' }
    | { type: 'submitting' }
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

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

        setCompletionStatus({ type: 'idle' })
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

  async function handleCompleteLesson(): Promise<void> {
    if (
      state.status !== 'loaded' ||
      courseSlug === undefined ||
      lessonPublicId === undefined
    ) {
      return
    }

    setCompletionStatus({ type: 'submitting' })

    try {
      const completion = await completeLesson(lessonPublicId)
      const [lesson, curriculum] = await Promise.all([
        fetchLessonDetail(lessonPublicId),
        fetchStudentCourseCurriculum(courseSlug),
      ])
      const nextTitle =
        completion.newlyUnlockedNextLesson === null
          ? null
          : completion.newlyUnlockedNextLesson.title

      setState({ status: 'loaded', lesson, curriculum })
      setCompletionStatus({
        type: 'success',
        message:
          nextTitle === null
            ? 'Lesson complete.'
            : `Lesson complete. ${nextTitle} is now unlocked.`,
      })
    } catch (error: unknown) {
      setCompletionStatus({
        type: 'error',
        message: getLessonErrorMessage(error),
      })
    }
  }

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
                <p className="lesson-progress-status">
                  Status:{' '}
                  {state.lesson.progress.status === 'completed'
                    ? 'completed'
                    : state.lesson.progress.status === 'in_progress'
                      ? 'in progress'
                      : 'not started'}
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

              <section className="lesson-completion" aria-live="polite">
                {state.lesson.manualCompletionAllowed ? (
                  <button
                    className="button-link"
                    type="button"
                    disabled={
                      state.lesson.progress.status === 'completed' ||
                      completionStatus.type === 'submitting'
                    }
                    onClick={() => void handleCompleteLesson()}
                  >
                    {state.lesson.progress.status === 'completed'
                      ? 'Completed'
                      : completionStatus.type === 'submitting'
                        ? 'Marking complete...'
                        : 'Mark complete'}
                  </button>
                ) : (
                  <p>
                    This activity will be completed through its activity in a
                    later milestone.
                  </p>
                )}
                {completionStatus.type === 'success' && (
                  <p className="form-success">{completionStatus.message}</p>
                )}
                {completionStatus.type === 'error' && (
                  <p className="form-error" role="alert">
                    {completionStatus.message}
                  </p>
                )}
              </section>

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
