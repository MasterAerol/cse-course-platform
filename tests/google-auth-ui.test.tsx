import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../src/react-app/auth/auth-context'
import {
  AccountPageView,
  type AccountPageData,
} from '../src/react-app/pages/AccountPage'
import { LoginPage } from '../src/react-app/pages/LoginPage'
import { RegistrationPage } from '../src/react-app/pages/RegistrationPage'
import type { User } from '../src/react-app/lib/api'
import staticHeaders from '../public/_headers?raw'

const accountData: AccountPageData = {
  dashboard: { courses: [] },
  curriculum: null,
  readiness: null,
  mock: null,
}

function renderAuth(
  child: React.ReactNode,
  input: Partial<AuthContextValue> = {},
): string {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    error: null,
    registrationMode: 'open',
    googleClientId: 'pasawise-test.apps.googleusercontent.com',
    cseExamDates: [],
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve({
      registrationId: '123e4567-e89b-12d3-a456-426614174099',
      maskedEmail: 'le•••@example.test',
      codeExpiresAt: '2026-08-21T00:10:00.000Z',
      resendAvailableAt: '2026-08-21T00:01:00.000Z',
    })),
    verifyRegistrationEmail: vi.fn(() => Promise.resolve()),
    resendRegistrationVerification: vi.fn(() => Promise.reject(new Error('not used'))),
    continueWithGoogle: vi.fn(() => Promise.resolve()),
    connectGoogle: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    ...input,
  }

  return renderToStaticMarkup(
    <MemoryRouter>
      <AuthContext.Provider value={value}>{child}</AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('Google account UI', () => {
  it('prefers the official Google button placeholder on Login with password fallback', () => {
    const markup = renderAuth(<LoginPage />)

    expect(markup).toContain('data-google-identity-button')
    expect(markup).toContain('Loading Google sign-in')
    expect(markup).toContain('role="separator"')
    expect(markup).toContain('login-password')
    expect(markup).toContain('Log in')
  })

  it('shows Google and password account creation only when registration is open', () => {
    const open = renderAuth(<RegistrationPage />)
    const closed = renderAuth(
      <RegistrationPage />,
      { registrationMode: 'closed' },
    )

    expect(open).toContain('Create your account')
    expect(open).toContain('data-google-identity-button')
    expect(open).toContain('registration-password')
    expect(closed).toContain('Registration is currently closed')
    expect(closed).not.toContain('data-google-identity-button')
    expect(closed).not.toContain('<form')
  })

  it('shows connected methods without a fake password form for a Google-only learner', () => {
    const user: User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'learner@gmail.com',
      firstName: 'Google',
      lastName: 'Learner',
      role: 'student',
      signInMethods: {
        hasPassword: false,
        googleConnected: true,
      },
    }
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AccountPageView
          user={user}
          cseExamDates={[]}
          data={accountData}
          googleClientId="pasawise-test.apps.googleusercontent.com"
          onConnectGoogle={vi.fn(() => Promise.resolve())}
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('Sign-in methods')
    expect(markup).toContain('Connected')
    expect(markup).toContain('Password not configured')
    expect(markup).toContain('does not create or store a placeholder password')
    expect(markup).not.toContain('current-password')
  })

  it('allows an existing password learner to intentionally connect Google', () => {
    const user: User = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'existing@example.test',
      firstName: 'Existing',
      lastName: 'Learner',
      role: 'student',
      signInMethods: {
        hasPassword: true,
        googleConnected: false,
      },
    }
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AccountPageView
          user={user}
          cseExamDates={[]}
          data={accountData}
          googleClientId="pasawise-test.apps.googleusercontent.com"
          onConnectGoogle={vi.fn(() => Promise.resolve())}
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('Not connected')
    expect(markup).toContain('data-google-identity-button')
    expect(markup).toContain('Change password')
  })

  it('allows only Google Identity Services in the static CSP', () => {
    expect(staticHeaders).toContain(
      "script-src 'self' https://accounts.google.com/gsi/client",
    )
    expect(staticHeaders).toContain(
      'frame-src https://accounts.google.com/gsi/',
    )
    expect(staticHeaders).toContain(
      "connect-src 'self' https://accounts.google.com/gsi/",
    )
    expect(staticHeaders).toContain(
      'Cross-Origin-Opener-Policy: same-origin-allow-popups',
    )
  })
})
