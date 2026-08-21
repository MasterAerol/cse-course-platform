import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../src/react-app/auth/auth-context'
import googleIdentityButtonSource from '../src/react-app/components/GoogleIdentityButton.tsx?raw'
import publicAuthShellSource from '../src/react-app/components/PublicAuthShell.tsx?raw'
import type { PendingRegistration } from '../src/react-app/lib/api'
import { EmailVerificationPage } from '../src/react-app/pages/EmailVerificationPage'
import { LoginPage } from '../src/react-app/pages/LoginPage'
import { RegistrationPage } from '../src/react-app/pages/RegistrationPage'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') {
  throw new Error('Authentication styles were not injected by Vitest.')
}
const stylesSource = injectedStyles.replace(/\r\n/gu, '\n')

const verification: PendingRegistration = {
  registrationId: '123e4567-e89b-12d3-a456-426614174099',
  maskedEmail: 'le•••@example.test',
  codeExpiresAt: '2026-08-22T00:10:00.000Z',
  resendAvailableAt: '2026-08-22T00:01:00.000Z',
}

function authValue(input: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    loading: false,
    error: null,
    registrationMode: 'open',
    googleClientId: 'pasawise-test.apps.googleusercontent.com',
    cseExamDates: [],
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve(verification)),
    verifyRegistrationEmail: vi.fn(() => Promise.resolve()),
    resendRegistrationVerification: vi.fn(() => Promise.resolve(verification)),
    continueWithGoogle: vi.fn(() => Promise.resolve()),
    connectGoogle: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    ...input,
  }
}

function renderAuth(
  child: ReactNode,
  input: Partial<AuthContextValue> = {},
): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AuthContext.Provider value={authValue(input)}>
        {child}
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

function renderOtp(): string {
  return renderToStaticMarkup(
    <MemoryRouter
      initialEntries={[{
        pathname: '/verify-email',
        search: '?registration=' + verification.registrationId,
        state: { verification },
      }]}
    >
      <AuthContext.Provider value={authValue()}>
        <EmailVerificationPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

function ruleBlock(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^$()|[\]\\]/gu, '\\$&')
  const match = source.match(new RegExp(escapedSelector + '\\s*\\{([^}]*)\\}', 'su'))
  return match?.[1] ?? ''
}

function tokenPx(token: string): number {
  const match = stylesSource.match(
    new RegExp(token + '\\s*:\\s*([0-9.]+)rem', 'u'),
  )
  if (match?.[1] === undefined) throw new Error('Missing CSS token ' + token)
  return Number.parseFloat(match[1]) * 16
}

describe('public authentication responsive shell', () => {
  it('shares one semantic shell and centered brand structure across Login, Register, and OTP', () => {
    const surfaces = [
      renderAuth(<LoginPage />),
      renderAuth(<RegistrationPage />),
      renderAuth(<RegistrationPage />, { registrationMode: 'closed' }),
      renderOtp(),
      renderAuth(<EmailVerificationPage />, { registrationMode: 'closed' }),
    ]

    for (const markup of surfaces) {
      expect(markup).toContain('class="auth-page auth-page--public"')
      expect(markup).toMatch(/class="auth-card auth-card--authentication(?: verification-card)?"/u)
      expect(markup).toContain('class="brand-link brand-link--primary"')
      expect(markup.match(/aria-label="PasaWise home"/gu)).toHaveLength(1)
    }

    expect(publicAuthShellSource).toContain('<PasaWiseBrand linked variant="primary" />')
    expect(renderOtp()).toContain('inputMode="numeric"')
    expect(renderOtp()).toContain('autoComplete="one-time-code"')
    expect(renderOtp()).toContain('maxLength="6"')
  })

  it('derives safe, full-width phone geometry at every acceptance viewport', () => {
    const marker = stylesSource.lastIndexOf('/* Public authentication responsive shell */')
    const responsiveStyles = stylesSource.slice(marker)
    const mobileStart = responsiveStyles.indexOf('@media (max-width: 48rem)')
    const shortViewportStart = responsiveStyles.indexOf('@media (max-height: 42rem)')
    const desktopRules = responsiveStyles.slice(0, mobileStart)
    const mobileRules = responsiveStyles.slice(mobileStart, shortViewportStart)
    const mobilePage = ruleBlock(mobileRules, '.auth-page--public')
    const mobileCard = ruleBlock(
      mobileRules,
      '.auth-card--authentication,\n  .verification-card.auth-card--authentication',
    )
    const sharedWidthRule = ruleBlock(
      desktopRules,
      ".auth-card--authentication form,\n.auth-card--authentication form > button[type='submit'],\n.auth-card--authentication .google-auth,\n.auth-card--authentication .google-auth__button-frame,\n.auth-card--authentication .auth-divider",
    )

    expect(marker).toBeGreaterThan(-1)
    expect(mobilePage).toContain('place-items: start center')
    expect(mobilePage).toContain('padding-left: max(var(--space-12), env(safe-area-inset-left))')
    expect(mobilePage).toContain('padding-right: max(var(--space-12), env(safe-area-inset-right))')
    expect(mobilePage).toContain('padding-top: max(var(--space-24), env(safe-area-inset-top))')
    expect(mobileCard).toContain('width: 100%')
    expect(mobileCard).toContain('max-width: none')
    expect(mobileCard).toContain('padding: clamp(var(--space-20), 5.5vw, var(--space-24))')
    expect(sharedWidthRule).toContain('width: 100%')
    expect(sharedWidthRule).toContain('min-width: 0')

    const sideInset = tokenPx('--space-12')
    const minimumCardPadding = tokenPx('--space-20')
    const maximumCardPadding = tokenPx('--space-24')

    for (const viewportWidth of [320, 375, 390, 430]) {
      const cardWidth = viewportWidth - (sideInset * 2)
      const cardPadding = Math.min(
        maximumCardPadding,
        Math.max(minimumCardPadding, viewportWidth * 0.055),
      )
      const contentWidth = cardWidth - (cardPadding * 2)

      expect(sideInset).toBeGreaterThanOrEqual(12)
      expect(sideInset).toBeLessThanOrEqual(16)
      expect(cardWidth).toBe(viewportWidth - 24)
      expect(contentWidth).toBeGreaterThanOrEqual(220)
    }
  })

  it('preserves the compact centered desktop card from 1024px through 1920px', () => {
    const marker = stylesSource.lastIndexOf('/* Public authentication responsive shell */')
    const responsiveStyles = stylesSource.slice(marker)
    const desktopRules = responsiveStyles.slice(
      0,
      responsiveStyles.indexOf('@media (max-width: 48rem)'),
    )
    const desktopCard = ruleBlock(desktopRules, '.auth-card--authentication')
    const maxWidthRem = Number.parseFloat(
      desktopCard.match(/29\.5rem/u)?.[0] ?? '0',
    )
    const maxCardWidth = maxWidthRem * 16

    expect(ruleBlock(desktopRules, '.auth-page--public')).toContain('min-height: 100dvh')
    expect(maxCardWidth).toBe(472)

    for (const viewportWidth of [1024, 1280, 1440, 1920]) {
      const cardWidth = Math.min(viewportWidth, maxCardWidth)
      const sideSpace = (viewportWidth - cardWidth) / 2
      expect(cardWidth).toBe(472)
      expect(sideSpace).toBeGreaterThan(0)
    }
  })

  it('centers the natural-aspect primary logo through the shared brand wrapper', () => {
    const marker = stylesSource.lastIndexOf('/* Public authentication responsive shell */')
    const responsiveStyles = stylesSource.slice(marker)
    const desktopRules = responsiveStyles.slice(
      0,
      responsiveStyles.indexOf('@media (max-width: 48rem)'),
    )
    const brandWrapper = ruleBlock(
      desktopRules,
      '.auth-card--authentication > .brand-link--primary',
    )
    const brandImage = ruleBlock(
      desktopRules,
      '.auth-card--authentication .pasawise-brand--primary',
    )

    expect(brandWrapper).toContain('display: flex')
    expect(brandWrapper).toContain('width: 100%')
    expect(brandWrapper).toContain('justify-content: center')
    expect(brandImage).toContain('width: 8.5rem')
    expect(brandImage).toContain('max-height: none')
  })

  it('keeps the Google first paint hidden behind one stable provider-sized placeholder', () => {
    const login = renderAuth(<LoginPage />)
    const marker = stylesSource.lastIndexOf('/* Public authentication responsive shell */')
    const responsiveStyles = stylesSource.slice(marker)
    const frame = ruleBlock(responsiveStyles, '.google-auth__button-frame')
    const loadingButton = ruleBlock(
      responsiveStyles,
      '.google-auth__button-frame--loading .google-auth__button',
    )

    expect(login).toContain('google-auth__button-frame--loading')
    expect(login).toContain('google-auth__placeholder')
    expect(login).toContain('data-google-identity-button')
    expect(login).toContain('class="sr-only"')
    expect(login).not.toContain('Continue with Google')
    expect(login).not.toContain('Opens in new tab')
    expect(frame).toContain('height: 2.75rem')
    expect(frame).toContain('min-height: 2.75rem')
    expect(loadingButton).toContain('visibility: hidden')
    expect(loadingButton).toContain('pointer-events: none')
    expect(googleIdentityButtonSource).toContain('new MutationObserver')
    expect(googleIdentityButtonSource.match(/requestAnimationFrame/gu)).toHaveLength(2)
    expect(googleIdentityButtonSource).toContain('readinessObserver?.disconnect()')
    expect(googleIdentityButtonSource).toContain('cancelAnimationFrame')
    expect(googleIdentityButtonSource).not.toContain('ResizeObserver')
    expect(stylesSource).not.toContain('.google-auth__button iframe')
    expect(stylesSource).not.toContain('.google-auth__button :where(img, svg)')
  })
})
