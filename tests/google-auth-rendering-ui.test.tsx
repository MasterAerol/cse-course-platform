import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../src/react-app/auth/auth-context'
import { GoogleIdentityButton } from '../src/react-app/components/GoogleIdentityButton'
import {
  clearGoogleIdentityButton,
  getGoogleButtonWidth,
  mountGoogleIdentityButton,
  type GoogleButtonRenderOptions,
} from '../src/react-app/components/google-identity-button-lifecycle'
import {
  AccountPageView,
  type AccountPageData,
} from '../src/react-app/pages/AccountPage'
import { LoginPage } from '../src/react-app/pages/LoginPage'
import { RegistrationPage } from '../src/react-app/pages/RegistrationPage'
import type { User } from '../src/react-app/lib/api'
import googleIdentityButtonSource from '../src/react-app/components/GoogleIdentityButton.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') {
  throw new Error('Google auth styles were not injected by Vitest.')
}
const stylesSource = injectedStyles

const accountData: AccountPageData = {
  dashboard: { courses: [] },
  curriculum: null,
  readiness: null,
  mock: null,
}

function renderAuth(
  child: ReactNode,
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

function countProviderMounts(markup: string): number {
  return markup.match(/data-google-identity-button/g)?.length ?? 0
}

function accountUser(googleConnected: boolean): User {
  return {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'existing@example.test',
    firstName: 'Existing',
    lastName: 'Learner',
    role: 'student',
    signInMethods: {
      hasPassword: true,
      googleConnected,
    },
  }
}

function renderAccount(googleConnected: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AccountPageView
        user={accountUser(googleConnected)}
        cseExamDates={[]}
        data={accountData}
        googleClientId="pasawise-test.apps.googleusercontent.com"
        onConnectGoogle={vi.fn(() => Promise.resolve())}
      />
    </MemoryRouter>,
  )
}

describe('Google Identity Services rendering regressions', () => {
  it('uses one shared provider mount without custom Google branding on every auth surface', () => {
    const login = renderAuth(<LoginPage />)
    const registration = renderAuth(<RegistrationPage />)
    const closedRegistration = renderAuth(
      <RegistrationPage />,
      { registrationMode: 'closed' },
    )
    const account = renderAccount(false)
    const connectedAccount = renderAccount(true)

    for (const markup of [login, registration, account]) {
      expect(countProviderMounts(markup)).toBe(1)
      expect(markup).not.toContain('Continue with Google')
      expect(markup).not.toContain('Opens in a new tab')
    }

    expect(countProviderMounts(closedRegistration)).toBe(0)
    expect(countProviderMounts(connectedAccount)).toBe(0)
    expect(account).not.toContain('Choose the Google account')
    expect(account).toContain('Connect Google to your PasaWise account.')
    expect(account).toContain('Connect your Google account')
    expect(connectedAccount).toContain('Connected')
  })

  it('keeps one provider-owned button through rerender, cleanup, and remount', () => {
    let providerChildCount = 0
    let providerVisibleText = ''
    const container = {
      replaceChildren: (...nodes: Node[]) => {
        providerChildCount = nodes.length
        providerVisibleText = nodes.map((node) => node.textContent ?? '').join('')
      },
    } as unknown as HTMLElement
    const options: GoogleButtonRenderOptions = {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'en',
      width: 320,
    }
    const renderButton = vi.fn((parent: HTMLElement) => {
      parent.replaceChildren({
        providerOwnedButton: true,
        textContent: 'Continue with Google',
      } as unknown as Node)
    })

    expect(mountGoogleIdentityButton(container, renderButton, options)).toBe(true)
    expect(providerChildCount).toBe(1)
    expect(providerVisibleText).toBe('Continue with Google')
    expect(renderButton).toHaveBeenCalledTimes(1)

    expect(mountGoogleIdentityButton(container, renderButton, options)).toBe(false)
    expect(providerChildCount).toBe(1)
    expect(renderButton).toHaveBeenCalledTimes(1)

    clearGoogleIdentityButton(container)
    expect(providerChildCount).toBe(0)

    expect(mountGoogleIdentityButton(container, renderButton, options)).toBe(true)
    expect(providerChildCount).toBe(1)
    expect(renderButton).toHaveBeenCalledTimes(2)
    clearGoogleIdentityButton(container)
  })

  it.each([
    [0, 220],
    [219, 220],
    [320, 320],
    [375, 375],
    [390, 390],
    [430, 400],
    [1024, 400],
    [1280, 400],
    [1440, 400],
    [1920, 400],
  ])(
    'keeps the GIS button compact at a %ipx available width',
    (availableWidth, expectedWidth) => {
      expect(getGoogleButtonWidth(availableWidth)).toBe(expectedWidth)
    },
  )

  it('leaves provider-owned geometry untouched and preserves accessibility utilities', () => {
    const buttonBlock = stylesSource.match(/\.google-auth__button\s*\{([^}]*)\}/s)?.[1] ?? ''
    const srOnlyBlock = stylesSource.match(/\.sr-only\s*\{([^}]*)\}/s)?.[1] ?? ''
    const visuallyHiddenBlock =
      stylesSource.match(/\.visually-hidden\s*\{([^}]*)\}/s)?.[1] ?? ''

    expect(googleIdentityButtonSource).not.toContain('ResizeObserver')
    expect(googleIdentityButtonSource).not.toContain('Opens in a new tab')
    expect(googleIdentityButtonSource).toContain('gsi/client?hl=en')
    expect(googleIdentityButtonSource).toContain("logo_alignment: 'left'")
    expect(googleIdentityButtonSource).toContain("locale: 'en'")
    expect(buttonBlock).toContain('min-height: 2.75rem')
    expect(buttonBlock).toContain('justify-content: center')
    expect(buttonBlock).not.toContain('overflow: hidden')
    expect(stylesSource).not.toContain('.google-auth__button iframe')
    expect(stylesSource).not.toContain('.google-auth__button :where(img, svg)')
    expect(stylesSource).not.toMatch(
      /(?:^|})\s*(?:img|svg)\s*\{[^}]*width:\s*100%/m,
    )
    expect(srOnlyBlock).toContain('position: absolute')
    expect(srOnlyBlock).toContain('overflow: hidden')
    expect(visuallyHiddenBlock).toContain('position: absolute')
    expect(visuallyHiddenBlock).toContain('overflow: hidden')
  })

  it('keeps the exported shared component as the single GIS implementation', () => {
    expect(GoogleIdentityButton).toBeTypeOf('function')
  })
})

