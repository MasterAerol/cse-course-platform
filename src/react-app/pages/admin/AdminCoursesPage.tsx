import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { CourseForm } from '../../components/admin/AdminForms'
import { AdminPageHeader, StatusBadge } from '../../components/admin/AdminUi'
import {
  createAdminCourse,
  fetchAdminCourses,
  type AdminCourse,
} from '../../lib/api'

type CoursesState =
  | { status: 'loading' }
  | { status: 'loaded'; courses: AdminCourse[] }
  | { status: 'error'; message: string }

export function AdminCoursesPage() {
  const [state, setState] = useState<CoursesState>({ status: 'loading' })
  const [formError, setFormError] = useState<string | null>(null)

  async function loadCourses(signal?: AbortSignal): Promise<void> {
    try {
      setState({ status: 'loaded', courses: await fetchAdminCourses(signal) })
    } catch (error) {
      if (signal?.aborted) {
        return
      }
      setState({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Courses could not be loaded.',
      })
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => loadCourses(controller.signal))
    return () => controller.abort()
  }, [])

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Courses"
        description="Create, preview, publish, and archive course shells."
      />

      <section className="admin-panel">
        <h2>Create course</h2>
        {formError !== null && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <CourseForm
          onSubmit={(input) => {
            setFormError(null)
            createAdminCourse(input)
              .then(() => loadCourses())
              .catch((error: unknown) =>
                setFormError(
                  error instanceof Error
                    ? error.message
                    : 'Course could not be created.',
                ),
              )
          }}
        />
      </section>

      <section className="admin-panel">
        <h2>All courses</h2>
        {state.status === 'loading' && <p>Loading courses…</p>}
        {state.status === 'error' && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'loaded' && state.courses.length === 0 && (
          <p>No courses have been created yet.</p>
        )}
        {state.status === 'loaded' &&
          state.courses.map((course) => (
            <article className="admin-row" key={course.id}>
              <div>
                <h3>{course.title}</h3>
                <p>{course.slug}</p>
                <StatusBadge status={course.status} />
              </div>
              <Link
                className="button-link button-link--secondary"
                to={`/admin/courses/${course.id}`}
              >
                Open builder
              </Link>
            </article>
          ))}
      </section>
    </main>
  )
}
