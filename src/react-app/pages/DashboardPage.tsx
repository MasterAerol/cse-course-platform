import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { ContinueLearningCard } from '../components/ContinueLearningCard'
import { EnrollmentBadge } from '../components/EnrollmentBadge'
import { ProgressBar } from '../components/ProgressBar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { SubjectAssessmentCard } from '../components/SubjectAssessmentCard'
import { SmartRecoveryCard } from '../components/SmartRecoveryCard'
import { MockExamCard } from '../components/MockExamCard'
import { MistakeNotebookCard } from '../components/MistakeNotebookCard'
import { ReadinessCard } from '../components/ReadinessCard'

import { LearnerTopbar } from '../components/LearnerTopbar'
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
  const { user } = useAuth()
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

  if (user === null) {
    return null
  }

  if (dashboardState.status === 'loading') {
    return <PasaWisePageLoader label="Preparing your dashboard…" />
  }

  return (
    <main className="dashboard-page">
      <LearnerTopbar
        className="dashboard-topbar"
        mobileCollapsible
        showSignOut
        ariaLabel="Main navigation"
      >
        <Link
          aria-current="page"
          className="dashboard-nav-link dashboard-nav-link--active"
          to="/dashboard"
        >
          Dashboard
        </Link>
        <Link className="dashboard-nav-link" to="/courses">
          Courses
        </Link>
      </LearnerTopbar>

      <section className="dashboard-header">
        <p className="eyebrow">Student dashboard</p>
        <h1>
          Welcome, {user.firstName} {user.lastName}.
        </h1>
        <p className="dashboard-header__intro">
          {user.role === 'admin'
            ? 'You are signed in with administrator access.'
            : 'Your next lesson, progress, and focused review are ready in one place.'}
        </p>

        {user.role === 'admin' && (
          <Link className="button-link" to="/admin">
            Open administration
          </Link>
        )}
      </section>

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
              <article
                className="dashboard-card dashboard-course"
                key={course.course.slug}
              >
                <header className="dashboard-course-summary">
                  <div className="dashboard-course-summary__copy">
                    <div className="card-heading-row">
                      <p className="eyebrow">{course.course.level ?? 'Course'}</p>
                      <EnrollmentBadge enrollment={course.enrollment} />
                    </div>
                    <div className="dashboard-course-title-row">
                      <h2>{course.course.title}</h2>
                      {course.progressPercentage === 100 && (
                        <span className="dashboard-completion-status">Complete</span>
                      )}
                    </div>
                    <p className="meta-copy dashboard-enrollment-copy">
                      Enrollment status: {course.enrollment.status}
                      {course.enrollment.accessExpiresAt !== null
                        ? `. Access expires ${formatDate(course.enrollment.accessExpiresAt)}.`
                        : '. No access expiration is set.'}
                    </p>
                  </div>
                  <div
                    className="dashboard-course-progress"
                    aria-label={`${course.progressPercentage}% course progress`}
                  >
                    <div className="dashboard-course-progress__heading">
                      <span>Course progress</span>
                      <strong>{course.progressPercentage}%</strong>
                    </div>
                    <ProgressBar value={course.progressPercentage} />
                    <p className="meta-copy">
                      {course.completedRequiredLessons} of{' '}
                      {course.totalRequiredLessons} required lessons complete
                    </p>
                  </div>
                </header>
                {course.enrollment.hasAccess ? (
                  <>
                    <section
                      className={`dashboard-section dashboard-next-section${
                        course.continueLearning.courseCompleted
                          ? ' dashboard-next-section--complete'
                          : ''
                      }`}
                      aria-labelledby={`next-step-${course.course.slug}`}
                    >
                      <div className="dashboard-section-heading">
                        <div>
                          <p className="eyebrow">Pick up where you left off</p>
                          <h2 id={`next-step-${course.course.slug}`}>Your next step</h2>
                        </div>
                        <p>One focused action to keep your study momentum moving.</p>
                      </div>
                      <div className="dashboard-priority-grid">
                        <ContinueLearningCard progress={course} />
                      </div>
                    </section>

                    {user.role === 'student' &&
                      course.course.slug === 'cse-professional' && (
                        <section
                          className="dashboard-recovery-zone"
                          aria-label="Recommended Smart Recovery"
                        >
                          <SmartRecoveryCard />
                        </section>
                      )}

                    <div className="dashboard-tools-grid">
                      <section
                        className="dashboard-section dashboard-tool-section"
                        aria-labelledby={`assessments-${course.course.slug}`}
                      >
                        <div className="dashboard-section-heading">
                          <div>
                            <p className="eyebrow">Measure your progress</p>
                            <h2 id={`assessments-${course.course.slug}`}>
                              Subject assessments
                            </h2>
                          </div>
                          <p>Check readiness by subject when you are prepared.</p>
                        </div>
                        <div className="dashboard-subject-grid">
                          {course.subjectAssessments.map((assessment) => (
                            <SubjectAssessmentCard
                              key={assessment.assessment.publicId}
                              summary={assessment}
                            />
                          ))}
                        </div>
                      </section>

                      {course.course.slug === 'cse-professional' && (
                        <section
                          className="dashboard-section dashboard-tool-section"
                          aria-labelledby={`study-tools-${course.course.slug}`}
                        >
                          <div className="dashboard-section-heading">
                            <div>
                              <p className="eyebrow">Review and prepare</p>
                              <h2 id={`study-tools-${course.course.slug}`}>
                                Study insights and simulation
                              </h2>
                            </div>
                            <p>Use these tools when they support your next goal.</p>
                          </div>
                          <div className="dashboard-support-grid">
                            <MockExamCard />
                            {user.role === 'student' && <ReadinessCard />}
                            {user.role === 'student' && <MistakeNotebookCard />}
                          </div>
                        </section>
                      )}
                    </div>
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
