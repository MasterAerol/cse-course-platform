import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '../src/react-app/auth/auth-context'
import { CseExamCalendar, CseExamTargetCard } from '../src/react-app/components/CseExamTarget'
import { AccountPageView, type AccountPageData } from '../src/react-app/pages/AccountPage'
import { AdminDashboardView } from '../src/react-app/pages/admin/AdminDashboardPage'
import { HomePage } from '../src/react-app/pages/HomePage'
import { LoginPage } from '../src/react-app/pages/LoginPage'
import type { AdminDashboard, User } from '../src/react-app/lib/api'
import appSource from '../src/react-app/App.tsx?raw'
import adminRouteSource from '../src/react-app/components/AdminRoute.tsx?raw'
import loginSource from '../src/react-app/pages/LoginPage.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') throw new Error('Website experience styles were not injected by Vitest.')
const stylesSource = injectedStyles

const student: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'aerol@example.test',
  firstName: 'Aerol',
  lastName: 'Ilagan',
  role: 'student',
}

function renderWithAuth(child: ReactNode, overrides: Partial<AuthContextValue> = {}): string {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    error: null,
    registrationMode: 'closed',
    googleClientId: null,
    cseExamDates: [],
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve()),
    continueWithGoogle: vi.fn(() => Promise.resolve()),
    connectGoogle: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
  return renderToStaticMarkup(
    <MemoryRouter><AuthContext.Provider value={value}>{child}</AuthContext.Provider></MemoryRouter>,
  )
}

const enrollment = {
  status: 'active' as const,
  accessStartsAt: '2026-08-01T00:00:00.000Z',
  accessExpiresAt: null,
  hasAccess: true,
}

const accountData: AccountPageData = {
  dashboard: {
    courses: [{
      course: {
        title: 'CSE Professional',
        slug: 'cse-professional',
        shortDescription: 'Complete review course',
        level: 'Professional',
        thumbnailKey: null,
        enrollment,
      },
      enrollment,
      progressPercentage: 38,
      completedRequiredLessons: 19,
      totalRequiredLessons: 50,
      continueLearning: { courseCompleted: false, lesson: null },
      enrolledAt: '2026-08-01T00:00:00.000Z',
      subjectAssessment: null,
      subjectAssessments: [],
    }],
  },
  curriculum: {
    course: {
      title: 'CSE Professional',
      slug: 'cse-professional',
      shortDescription: 'Complete review course',
      level: 'Professional',
      thumbnailKey: null,
      enrollment,
    },
    subjects: [{
      title: 'Numerical Ability',
      slug: 'numerical-ability',
      position: 1,
      topics: [{
        title: 'Percentages',
        slug: 'percentages',
        position: 1,
        publishedLessonCount: 1,
        lessons: [{
          publicId: 'lesson-public-id',
          title: 'Understanding Percentages',
          slug: 'understanding-percentages',
          lessonType: 'reading',
          position: 1,
          estimatedMinutes: 10,
          isPreview: false,
          isRequired: true,
          progressStatus: 'completed',
          completedAt: '2026-08-10T00:00:00.000Z',
          isAccessible: true,
          isLocked: false,
          lockReason: null,
          accessibility: { canAccess: true, reason: 'active_enrollment' },
        }],
      }],
    }],
  },
  readiness: null,
  mock: null,
}

const adminDashboard: AdminDashboard = {
  counts: {
    courses: 1,
    publishedCourses: 1,
    draftCourses: 0,
    subjects: 4,
    topics: 31,
    lessons: 96,
    publishedLessons: 96,
    practiceSets: 40,
    quizzes: 31,
  },
  recentChanges: [{
    id: 42,
    actorUserId: 7,
    actorEmail: 'admin@example.test',
    action: 'publish',
    entityType: 'lesson',
    entityId: 'lesson-42',
    metadata: { status: 'published' },
    createdAt: '2026-08-20T02:00:00.000Z',
  }],
  cseProfessional: {
    id: 1,
    publicId: 'course-public-id',
    title: 'CSE Professional',
    slug: 'cse-professional',
    shortDescription: null,
    description: null,
    level: 'Professional',
    thumbnailKey: null,
    status: 'published',
    accessDurationDays: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  },
}

describe('PasaWise website experience', () => {
  it('positions the product clearly without advertising closed registration or fake statistics', () => {
    const markup = renderWithAuth(<HomePage />)
    for (const text of [
      'CSE Professional Review Platform',
      'Aral nang wais. Pasa nang handa.',
      'Learn',
      'Practice',
      'Analyze',
      'Recover',
      'Simulate',
      'Numerical Ability',
      'Verbal Ability',
      'Analytical Ability',
      'General Information',
      'Smart Recovery',
      'Full Mock Examination',
      'Next CSE date not configured',
    ]) expect(markup).toContain(text)
    expect(markup).toContain('href="/login"')
    expect(markup).not.toContain('href="/register"')
    expect(markup).not.toMatch(/pass rate|guaranteed|learners served/iu)
  })

  it('uses real auth policy for the landing CTA and preserves valid internal links', () => {
    const openMarkup = renderWithAuth(<HomePage />, { registrationMode: 'open' })
    const signedInMarkup = renderWithAuth(<HomePage />, { user: student })
    expect(openMarkup).toContain('href="/register"')
    expect(openMarkup).toContain('Start reviewing')
    expect(signedInMarkup).toContain('Continue reviewing')
    expect(signedInMarkup).toContain('href="/dashboard"')
    for (const href of ['#how-it-works', '#subjects', '/courses', '/login']) expect(renderWithAuth(<HomePage />)).toContain(`href="${href}"`)
  })

  it('keeps the login form accessible while presenting the polished product entry', () => {
    const markup = renderWithAuth(<LoginPage />)
    expect(markup).toContain('Continue preparing with purpose.')
    expect(markup).toContain('for="login-email"')
    expect(markup).toContain('autoComplete="email"')
    expect(markup).toContain('for="login-password"')
    expect(markup).toContain('autoComplete="current-password"')
    expect(markup).toContain('aria-label="Show password"')
    expect(markup).toContain('aria-busy="false"')
    expect(loginSource).toContain("role=\"alert\"")
    expect(loginSource).toContain('disabled={submitting}')
  })

  it('renders a current-user profile and real progress without exposing internal IDs', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><AccountPageView user={student} cseExamDates={[]} data={accountData} /></MemoryRouter>,
    )
    expect(markup).toContain('Aerol Ilagan')
    expect(markup).toContain('aerol@example.test')
    expect(markup).toContain('38%')
    expect(markup).toContain('19 of 50 required lessons complete')
    expect(markup).toContain('Numerical Ability')
    expect(markup).toContain('Next CSE date not configured')
    expect(markup).not.toContain(student.id)
    expect(markup).not.toContain('actorUserId')
  })

  it('renders future, today, and unconfigured countdown states accessibly', () => {
    const future = renderToStaticMarkup(<MemoryRouter><CseExamTargetCard configuredDates={['2026-08-30']} now={new Date('2026-08-20T03:00:00.000Z')} linkToCalendar /></MemoryRouter>)
    const today = renderToStaticMarkup(<MemoryRouter><CseExamTargetCard configuredDates={['2026-08-20']} now={new Date('2026-08-20T03:00:00.000Z')} /></MemoryRouter>)
    const empty = renderToStaticMarkup(<MemoryRouter><CseExamTargetCard configuredDates={[]} /></MemoryRouter>)
    expect(future).toContain('aria-label="10 days remaining"')
    expect(future).toContain('dateTime="2026-08-30"')
    expect(future).toContain('href="/exam-calendar"')
    expect(today).toContain('Exam day')
    expect(empty).toContain('role="status"')
    expect(`${future}${today}${empty}`).not.toMatch(/-\d+ days remaining/u)
  })

  it('renders a semantic target calendar with today and target labels', () => {
    const markup = renderToStaticMarkup(<CseExamCalendar configuredDates={['2026-08-25']} now={new Date('2026-08-20T03:00:00.000Z')} />)
    expect(markup).toContain('role="grid"')
    expect(markup).toContain('aria-current="date"')
    expect(markup).toContain('CSE target date')
    expect(markup).toContain('August 2026')
  })

  it('turns real admin counts and changes into an operational dashboard without raw JSON', () => {
    const markup = renderToStaticMarkup(<MemoryRouter><AdminDashboardView dashboard={adminDashboard} /></MemoryRouter>)
    expect(markup).toContain('Published lessons')
    expect(markup).toContain('Curriculum inventory')
    expect(markup).toContain('Learner accounts')
    expect(markup).toContain('Recent admin changes')
    expect(markup).toContain('Published')
    expect(markup).toContain('View change details')
    expect(markup).not.toContain('JSON.stringify')
    expect(adminRouteSource).toContain("user?.role !== 'admin'")
  })

  it('registers protected account/calendar routes and responsive contracts for all five areas', () => {
    expect(appSource).toContain('path="account"')
    expect(appSource).toContain('path="exam-calendar"')
    for (const selector of ['.public-hero', '.auth-experience', '.account-layout', '.exam-calendar-page__grid', '.admin-dashboard-grid']) expect(stylesSource).toContain(selector)
    expect(stylesSource).toContain('@media (max-width: 48rem)')
    expect(stylesSource).toContain('@media (max-width: 30rem)')
    expect(stylesSource).toContain('width: min(calc(100% - 2rem), var(--layout-wide-max))')
    expect(stylesSource).toContain('min-height: 2.75rem')
  })
})
