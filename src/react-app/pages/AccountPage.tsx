import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { BetaFeedbackForm } from '../components/BetaFeedbackForm'
import { CommercialAccessPanel } from '../components/CommercialAccessPanel'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { CseExamTargetCard } from '../components/CseExamTarget'
import { GoogleIdentityButton } from '../components/GoogleIdentityButton'
import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { ProgressBar } from '../components/ProgressBar'
import {
  fetchStudentCourseCurriculum,
  fetchStudentDashboard,
  type StudentCourseCurriculum,
  type StudentDashboard,
  type User,
} from '../lib/api'
import { fetchMockSummary, type MockExamSummary } from '../lib/mock-exam-api'
import { fetchCseReadiness, type CseReadiness } from '../lib/readiness-api'

export interface AccountPageData {
  dashboard: StudentDashboard
  curriculum: StudentCourseCurriculum | null
  readiness: CseReadiness | null
  mock: MockExamSummary | null
}

type AccountState =
  | { status: 'loading' }
  | { status: 'loaded'; data: AccountPageData }
  | { status: 'error'; message: string }

function subjectProgress(curriculum: StudentCourseCurriculum | null) {
  return curriculum?.subjects.map((subject) => {
    const lessons = subject.topics.flatMap((topic) => topic.lessons).filter((lesson) => lesson.isRequired)
    const completed = lessons.filter((lesson) => lesson.progressStatus === 'completed').length
    return {
      slug: subject.slug,
      title: subject.title,
      completed,
      total: lessons.length,
      percentage: lessons.length === 0 ? 0 : Math.round((completed / lessons.length) * 100),
    }
  }) ?? []
}

export function AccountPageView({
  user,
  cseExamDates,
  data,
  googleClientId = null,
  onConnectGoogle,
}: {
  user: User
  cseExamDates: readonly string[]
  data: AccountPageData
  googleClientId?: string | null
  onConnectGoogle?: (credential: string) => Promise<void>
}) {
  const course = data.dashboard.courses.find((item) => item.course.slug === 'cse-professional') ?? data.dashboard.courses[0] ?? null
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  const subjects = subjectProgress(data.curriculum)
  const assessmentAttempts = course?.subjectAssessments.reduce((sum, assessment) => sum + assessment.attemptCount, 0) ?? 0
  const signInMethods = user.signInMethods ?? { hasPassword: true, googleConnected: false }
  const emailVerification = user.emailVerification ?? { verified: true, method: 'legacy' as const }
  const verificationMethod = emailVerification.method === 'google'
    ? 'Verified by Google' : 'Verified by email'

  return (
    <>
      <header className="account-hero">
        <div className="account-avatar" aria-hidden="true">{initials}</div>
        <div>
          <p className="eyebrow">Learner profile</p>
          <h1>{user.firstName} {user.lastName}</h1>
          <p>{user.role === 'admin' ? 'PasaWise administrator and learner' : 'CSE Professional learner'}</p>
        </div>
        <dl className="account-hero__metrics">
          <div><dt>Course progress</dt><dd>{course === null ? '—' : `${course.progressPercentage}%`}</dd></div>
          <div><dt>Readiness</dt><dd>{data.readiness?.hasSufficientEvidence === true ? `${data.readiness.score}/100` : 'Building'}</dd></div>
          <div><dt>Assessments</dt><dd>{assessmentAttempts}</dd></div>
        </dl>
      </header>

      <div className="account-layout">
        <div className="account-main-column">
          <section className="account-panel" aria-labelledby="profile-details-title">
            <div className="account-panel__heading"><p className="eyebrow">Profile</p><h2 id="profile-details-title">Account details</h2></div>
            <dl className="account-details">
              <div><dt>Name</dt><dd>{user.firstName} {user.lastName}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Course</dt><dd>{course?.course.title ?? 'CSE Professional'}</dd></div>
              <div><dt>Enrollment</dt><dd>{course?.enrollment.status ?? 'Not enrolled'}</dd></div>
            </dl>
          </section>

          <section className="account-panel" aria-labelledby="learning-progress-title">
            <div className="account-panel__heading"><p className="eyebrow">Learning</p><h2 id="learning-progress-title">Long-term progress</h2></div>
            {course === null ? (
              <p>No enrolled course progress is available for this account.</p>
            ) : (
              <>
                <div className="account-course-progress">
                  <div><strong>{course.course.title}</strong><span>{course.completedRequiredLessons} of {course.totalRequiredLessons} required lessons complete</span></div>
                  <strong>{course.progressPercentage}%</strong>
                  <ProgressBar value={course.progressPercentage} />
                </div>
                {subjects.length > 0 && (
                  <div className="account-subject-grid">
                    {subjects.map((subject) => (
                      <article key={subject.slug}>
                        <div><h3>{subject.title}</h3><strong>{subject.percentage}%</strong></div>
                        <ProgressBar value={subject.percentage} />
                        <p>{subject.completed} of {subject.total} required lessons</p>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="account-panel" aria-labelledby="activity-summary-title">
            <div className="account-panel__heading"><p className="eyebrow">Evidence</p><h2 id="activity-summary-title">Assessment summary</h2></div>
            <div className="account-evidence-grid">
              <article><span>Subject attempts</span><strong>{assessmentAttempts}</strong><p>Submitted and active subject assessment attempts.</p></article>
              <article><span>Best full mock</span><strong>{data.mock?.bestScore === null || data.mock === null ? 'No score yet' : `${data.mock.bestScore}%`}</strong><p>{data.mock === null ? 'Full mock evidence is not available.' : `${data.mock.attemptCount} full mock ${data.mock.attemptCount === 1 ? 'attempt' : 'attempts'}.`}</p></article>
              <article><span>CSE Readiness</span><strong>{data.readiness?.hasSufficientEvidence === true ? `${data.readiness.score}/100` : 'Building evidence'}</strong><p>{data.readiness?.confidenceExplanation ?? 'Submit learning activity to build an estimate.'}</p></article>
            </div>
          </section>
        </div>

        <aside className="account-side-column">
          <CseExamTargetCard configuredDates={cseExamDates} compact linkToCalendar />
          <BetaFeedbackForm />
          <CommercialAccessPanel />
          <section className="account-panel" aria-labelledby="sign-in-methods-title">
            <div className="account-panel__heading">
              <p className="eyebrow">Account security</p>
              <h2 id="sign-in-methods-title">Sign-in methods</h2>
            </div>
            <div className="sign-in-methods">
              <article>
                <div><strong>Email</strong><span>{emailVerification.verified ? 'Verified' : 'Not verified'}</span></div>
                <p>{emailVerification.verified ? `${verificationMethod}: ${user.email}` : 'Email verification is required before learner access.'}</p>
              </article>
              <article>
                <div><strong>Google</strong><span>{signInMethods.googleConnected ? 'Connected' : 'Not connected'}</span></div>
                <p>{signInMethods.googleConnected ? user.email : 'Connect Google to your PasaWise account.'}</p>
                {!signInMethods.googleConnected && googleClientId !== null && onConnectGoogle !== undefined && (
                  <div className="google-connect-panel">
                    <strong>Connect your Google account</strong>
                    <GoogleIdentityButton
                      clientId={googleClientId}
                      context="signin"
                      onCredential={onConnectGoogle}
                    />
                  </div>
                )}
              </article>
              <article>
                <div><strong>Password</strong><span>{signInMethods.hasPassword ? 'Configured' : 'Not configured'}</span></div>
                <p>{signInMethods.hasPassword ? 'You can sign in using your email and password.' : 'Google sign-in is available.'}</p>
              </article>
            </div>
          </section>
          <section className="account-panel" aria-labelledby="account-security-title">
            <div className="account-panel__heading">
              <p className="eyebrow">Password security</p>
              <h2 id="account-security-title">{signInMethods.hasPassword ? 'Change password' : 'Password not configured'}</h2>
            </div>
            {signInMethods.hasPassword ? (
              <>
                <p>Confirm your current password before choosing a new one.</p>
                <ChangePasswordForm />
              </>
            ) : (
              <p>Continue with Google to sign in. PasaWise does not create or store a placeholder password.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}

export function AccountPage() {
  const { connectGoogle, googleClientId, user, cseExamDates } = useAuth()
  const [state, setState] = useState<AccountState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadAccount(): Promise<void> {
      try {
        const dashboard = await fetchStudentDashboard(controller.signal)
        const hasCseAccess = dashboard.courses.some((course) => course.course.slug === 'cse-professional' && course.enrollment.hasAccess)
        const [curriculum, readiness, mock] = await Promise.all([
          hasCseAccess ? fetchStudentCourseCurriculum('cse-professional', controller.signal).catch(() => null) : Promise.resolve(null),
          fetchCseReadiness(controller.signal).catch(() => null),
          fetchMockSummary(controller.signal).catch(() => null),
        ])
        if (!controller.signal.aborted) setState({ status: 'loaded', data: { dashboard, curriculum, readiness, mock } })
      } catch (error: unknown) {
        if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Your account could not be loaded.' })
      }
    }

    void loadAccount()
    return () => controller.abort()
  }, [])

  if (user === null) return null
  if (state.status === 'loading') return <PasaWisePageLoader label="Preparing your profile…" />

  return (
    <main className="page-shell account-page">
      <LearnerTopbar as="header" mobileCollapsible showSignOut>
        <Link className="dashboard-nav-link" to="/dashboard">Dashboard</Link>
        <Link className="dashboard-nav-link" to="/courses">Courses</Link>
        <Link aria-current="page" className="dashboard-nav-link dashboard-nav-link--active" to="/account">Account</Link>
      </LearnerTopbar>
      {state.status === 'error' ? (
        <section className="message-card account-error" role="alert">
          <h1>Profile unavailable</h1><p>{state.message}</p>
        </section>
      ) : (
        <AccountPageView
          user={user}
          cseExamDates={cseExamDates}
          data={state.data}
          googleClientId={googleClientId}
          onConnectGoogle={(credential) => connectGoogle({ credential })}
        />
      )}
    </main>
  )
}
