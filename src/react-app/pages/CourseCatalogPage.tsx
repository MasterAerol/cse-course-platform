import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { CourseCard } from '../components/CourseCard'
import { fetchCourses, type CourseSummary } from '../lib/api'

type CatalogState =
  | { status: 'loading' }
  | { status: 'loaded'; courses: CourseSummary[] }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Courses could not be loaded.'
}

export function CourseCatalogPage() {
  const { user } = useAuth()
  const [state, setState] = useState<CatalogState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadCourses(): Promise<void> {
      try {
        const courses = await fetchCourses(controller.signal)
        setState({ status: 'loaded', courses })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(error) })
        }
      }
    }

    void loadCourses()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        {user === null ? (
          <Link className="button-link button-link--secondary" to="/login">
            Sign in
          </Link>
        ) : (
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
        )}
      </nav>

      <section className="page-header">
        <p className="eyebrow">Course Catalog</p>
        <h1>Published courses</h1>
        <p>
          Browse currently available CSE preparation courses. Drafts and
          archived courses stay hidden.
        </p>
      </section>

      {state.status === 'loading' && <p>Loading courses...</p>}

      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && state.courses.length === 0 && (
        <section className="message-card">
          <h2>No published courses yet</h2>
          <p>Course catalog entries will appear here after publication.</p>
        </section>
      )}

      {state.status === 'loaded' && state.courses.length > 0 && (
        <section className="course-grid" aria-label="Published courses">
          {state.courses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </section>
      )}
    </main>
  )
}
