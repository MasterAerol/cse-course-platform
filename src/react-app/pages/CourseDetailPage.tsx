import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { CurriculumSubject } from '../components/CurriculumSubject'
import { EnrollmentBadge } from '../components/EnrollmentBadge'
import { fetchCourseDetail, type CourseDetail } from '../lib/api'

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; course: CourseDetail }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Course details could not be loaded.'
}

export function CourseDetailPage() {
  const { courseSlug } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState<DetailState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadCourse(): Promise<void> {
      if (courseSlug === undefined) {
        setState({ status: 'error', message: 'Course slug is missing.' })
        return
      }

      try {
        const course = await fetchCourseDetail(courseSlug, controller.signal)
        setState({ status: 'loaded', course })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(error) })
        }
      }
    }

    void loadCourse()

    return () => {
      controller.abort()
    }
  }, [courseSlug])

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        <div className="topbar-actions">
          <Link className="button-link button-link--secondary" to="/courses">
            Catalog
          </Link>
          {user === null ? (
            <Link className="button-link" to="/login">
              Sign in
            </Link>
          ) : (
            <Link className="button-link" to="/dashboard">
              Dashboard
            </Link>
          )}
        </div>
      </nav>

      {state.status === 'loading' && <p>Loading course...</p>}

      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <>
          <section className="page-header">
            <div className="card-heading-row">
              <p className="eyebrow">{state.course.level ?? 'Course'}</p>
              <EnrollmentBadge enrollment={state.course.enrollment} />
            </div>
            <h1>{state.course.title}</h1>
            <p>{state.course.description ?? state.course.shortDescription}</p>
          </section>

          <section className="curriculum-panel">
            <h2>Curriculum</h2>
            {state.course.curriculum.map((subject) => (
              <CurriculumSubject
                key={subject.slug}
                courseSlug={state.course.slug}
                subject={subject}
              />
            ))}
            {user === null && (
              <p className="meta-copy">
                Sign in with an enrolled account to open protected lessons.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
