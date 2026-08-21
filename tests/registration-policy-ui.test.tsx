import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../src/react-app/auth/auth-context'
import { HomePage } from '../src/react-app/pages/HomePage'
import { LoginPage } from '../src/react-app/pages/LoginPage'
import { RegistrationPage } from '../src/react-app/pages/RegistrationPage'

function renderWithRegistrationMode(
  registrationMode: AuthContextValue['registrationMode'],
  child: ReactNode,
): string {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    error: null,
    registrationMode,
    googleClientId: null,
    cseExamDates: [],
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve()),
    continueWithGoogle: vi.fn(() => Promise.resolve()),
    connectGoogle: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
  }

  return renderToStaticMarkup(
    <MemoryRouter>
      <AuthContext.Provider value={value}>{child}</AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('private-beta registration UI', () => {
  it('does not advertise self-registration when registration is closed', () => {
    const home = renderWithRegistrationMode('closed', <HomePage />)
    const login = renderWithRegistrationMode('closed', <LoginPage />)

    expect(home).not.toContain('Create account')
    expect(home).not.toContain('href="/register"')
    expect(login).not.toContain('Create an account')
    expect(login).toContain('Private-beta access is provided by an administrator.')
  })

  it('shows a private-beta message instead of a registration form when closed', () => {
    const registration = renderWithRegistrationMode(
      'closed',
      <RegistrationPage />,
    )

    expect(registration).toContain('Registration is currently closed')
    expect(registration).toContain('approved private-beta learners')
    expect(registration).not.toContain('<form')
  })

  it('retains explicit development registration when configured open', () => {
    const home = renderWithRegistrationMode('open', <HomePage />)
    const registration = renderWithRegistrationMode(
      'open',
      <RegistrationPage />,
    )

    expect(home).toContain('Start reviewing')
    expect(registration).toContain('Create your account')
    expect(registration).toContain('<form')
  })
})