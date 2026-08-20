import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Link, MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../src/react-app/auth/auth-context'
import { AccountPageView, type AccountPageData } from '../src/react-app/pages/AccountPage'
import { LearnerTopbar } from '../src/react-app/components/LearnerTopbar'
import { LoginPage } from '../src/react-app/pages/LoginPage'
import { RegistrationPage } from '../src/react-app/pages/RegistrationPage'
import type { User } from '../src/react-app/lib/api'
import accountMenuSource from '../src/react-app/components/AccountMenu.tsx?raw'

const student: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'learner@example.test',
  firstName: 'Ana',
  lastName: 'Ilagan',
  role: 'student',
}

const accountData: AccountPageData = {
  dashboard: { courses: [] },
  curriculum: null,
  readiness: null,
  mock: null,
}

function renderWithAuth(
  child: ReactNode,
  user: User | null = student,
  registrationMode: AuthContextValue['registrationMode'] = 'open',
): string {
  const value: AuthContextValue = {
    user,
    loading: false,
    error: null,
    registrationMode,
    cseExamDates: [],
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
  }

  return renderToStaticMarkup(
    <MemoryRouter>
      <AuthContext.Provider value={value}>{child}</AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('global account navigation and registration UI', () => {
  it('uses one profile-circle menu instead of authenticated mobile nesting', () => {
    const markup = renderWithAuth(
      <LearnerTopbar mobileCollapsible showSignOut>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/courses">Courses</Link>
      </LearnerTopbar>,
    )

    expect(markup).toContain('aria-label="Open account menu"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('>AI<')
    expect(markup).toContain('learner@example.test')
    expect(markup).toContain('href="/dashboard"')
    expect(markup).toContain('href="/courses/cse-professional"')
    expect(markup).toContain('href="/account"')
    expect(markup).toContain('href="/exam-calendar"')
    expect(markup).toContain('Sign out')
    expect(markup).not.toContain('Open navigation menu')
    expect(markup).not.toContain('Admin</a>')
  })

  it('exposes Admin only from an actually authorized admin identity', () => {
    const adminMarkup = renderWithAuth(
      <LearnerTopbar showSignOut />,
      { ...student, role: 'admin' },
    )
    const studentMarkup = renderWithAuth(<LearnerTopbar showSignOut />)

    expect(adminMarkup).toContain('href="/admin"')
    expect(studentMarkup).not.toContain('href="/admin"')
  })

  it('keeps the profile popover interaction and focus contracts explicit', () => {
    expect(accountMenuSource).toContain("document.addEventListener('pointerdown'")
    expect(accountMenuSource).toContain("document.addEventListener('keydown'")
    expect(accountMenuSource).toContain("event.key === 'Escape'")
    expect(accountMenuSource).toContain('triggerRef.current?.focus()')
    expect(accountMenuSource).toContain('setOpenPath(null)')
    expect(accountMenuSource).toContain('aria-label="Account navigation"')
  })

  it('shows registration confirmation and the secondary Login signup action only when open', () => {
    const registration = renderWithAuth(<RegistrationPage />, null, 'open')
    const openLogin = renderWithAuth(<LoginPage />, null, 'open')
    const closedLogin = renderWithAuth(<LoginPage />, null, 'closed')

    expect(registration).toContain('Create your account')
    expect(registration).toContain('name="confirmPassword"')
    expect(registration).toContain('autoComplete="new-password"')
    expect(registration).toContain('Password requirements')
    expect(registration).toContain('Already have an account?')
    expect(registration).toContain('href="/login"')
    expect(openLogin).toContain('Create an account')
    expect(openLogin).toContain('href="/register"')
    expect(closedLogin).not.toContain('href="/register"')
  })

  it('puts secure password change on Profile & Account without exposing identifiers', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AccountPageView
          user={student}
          cseExamDates={[]}
          data={accountData}
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('Change password')
    expect(markup).toContain('name="currentPassword"')
    expect(markup).toContain('name="newPassword"')
    expect(markup).toContain('name="confirmNewPassword"')
    expect(markup).toContain('autoComplete="current-password"')
    expect(markup).toContain('aria-label="Show current password"')
    expect(markup).toContain('aria-label="Show new passwords"')
    expect(markup).not.toContain(student.id)
  })
})
