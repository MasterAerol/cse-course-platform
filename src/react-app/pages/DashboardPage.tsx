import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { ContinueLearningCard } from '../components/ContinueLearningCard'
import { EnrollmentBadge } from '../components/EnrollmentBadge'
import { ProgressBar } from '../components/ProgressBar'
import { SubjectAssessmentCard } from '../components/SubjectAssessmentCard'
import { MockExamCard } from '../components/MockExamCard'
import {
  fetchStudentDashboard,
  type StudentDashboard,
} from '../lib/api'

type DashboardState =
  | { status: 'loading' }
  | { status: 'loaded'; dashboard: StudentDashboard }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Dashboard could not be loaded.'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard(): Promise<void> {
      try {
        const dashboard = await fetchStudentDashboard(controller.signal)
        setDashboardState({ status: 'loaded', dashboard })
      } catch (dashboardError: unknown) {
        if (!controller.signal.aborted) {
          setDashboardState({
            status: 'error',
            message: getErrorMessage(dashboardError),
          })
        }
      }
    }

    void loadDashboard()

    return () => {
      controller.abort()
    }
  }, [])

  async function handleLogout(): Promise<void> {
    setSubmitting(true)
    setError(null)

    try {
      await logout()
      await navigate('/login', { replace: true })
    } catch (logoutError: unknown) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : 'Logout could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (user === null) {
    return null
  }

  return (
    <main className="dashboard-page">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        <div className="topbar-actions">
          <Link className="button-link button-link--secondary" to="/courses">
            Catalog
          </Link>
          <button
            className="button-secondary"
            type="button"
            disabled={submitting}
            onClick={() => void handleLogout()}
          >
            {submitting ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </nav>

      <section className="dashboard-header">
        <p className="eyebrow">Student dashboard</p>
        <h1>
          Welcome, {user.firstName} {user.lastName}.
        </h1>
        <p>
          {user.role === 'admin'
            ? 'You are signed in with administrator access.'
            : 'You are signed in with learner access.'}
        </p>

        {user.role === 'admin' && (
          <Link className="button-link" to="/admin">
            Open administration
          </Link>
        )}

        {error !== null && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {dashboardState.status === 'loading' && (
        <section className="dashboard-card">
          <p>Loading your courses...</p>
        </section>
      )}

      {dashboardState.status === 'error' && (
        <p className="form-error" role="alert">
          {dashboardState.message}
        </p>
      )}

      {dashboardState.status === 'loaded' &&
        dashboardState.dashboard.courses.length === 0 && (
          <section className="dashboard-card">
            <h2>No enrolled courses yet</h2>
            <p>
              You are signed in, but no course is enrolled for this account
              yet. Ask an administrator to enroll you, then your courses and
              Continue Learning card will appear here.
            </p>
            <Link className="button-link" to="/courses">
              Browse catalog
            </Link>
          </section>
        )}

      {dashboardState.status === 'loaded' &&
        dashboardState.dashboard.courses.length > 0 && (
          <section className="dashboard-grid" aria-label="Enrolled courses">
            {dashboardState.dashboard.courses.map((course) => (
              <article className="dashboard-card" key={course.course.slug}>
                <div className="card-heading-row">
                  <p className="eyebrow">{course.course.level ?? 'Course'}</p>
                  <EnrollmentBadge enrollment={course.enrollment} />
                </div>
                <h2>{course.course.title}</h2>
                <ProgressBar value={course.progressPercentage} />
                <p className="meta-copy">
                  {course.progressPercentage}% complete.{' '}
                  {course.completedRequiredLessons} of{' '}
                  {course.totalRequiredLessons} required lessons complete.
                </p>
                <p className="meta-copy">
                  Enrollment status: {course.enrollment.status}
                  {course.enrollment.accessExpiresAt !== null
                    ? `. Access expires ${formatDate(
                        course.enrollment.accessExpiresAt,
                      )}.`
                    : '. No access expiration is set.'}
                </p>
                {course.enrollment.hasAccess ? (
                  <>
                    <ContinueLearningCard progress={course} />
                    {course.subjectAssessments.map((assessment) => <SubjectAssessmentCard key={assessment.assessment.publicId} summary={assessment} />)}
                    {course.course.slug === 'cse-professional' && <MockExamCard />}
                  </>
                ) : (
                  <section className="continue-card continue-card--muted">
                    <p className="eyebrow">Continue Learning</p>
                    <h3>Access unavailable</h3>
                    <p>
                      This enrollment does not currently grant course access.
                    </p>
                  </section>
                )}
              </article>
            ))}
          </section>
        )}
    </main>
  )
}
