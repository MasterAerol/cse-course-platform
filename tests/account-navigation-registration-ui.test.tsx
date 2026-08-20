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

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__

if (typeof injectedStyles !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}

const stylesSource = injectedStyles

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function declarationsFor(selector: string): ReadonlyMap<string, string> {
  const selectorPattern = new RegExp(
    `${escapeRegExp(selector)}\\s*\\{([^{}]*)\\}`,
    'gu',
  )
  const matches = [...stylesSource.matchAll(selectorPattern)].filter((match) => {
    if (match.index === undefined) {
      return false
    }

    const precedingSource = stylesSource.slice(0, match.index).trimEnd()
    const precedingCharacter = precedingSource.at(-1)

    return (
      precedingCharacter === undefined ||
      precedingCharacter === '{' ||
      precedingCharacter === '}' ||
      precedingCharacter === ','
    )
  })
  const body = matches.at(-1)?.[1]

  if (body === undefined) {
    throw new Error(`Expected CSS rule for ${selector}`)
  }

  return new Map(
    body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.length > 0)
      .map((declaration) => {
        const separator = declaration.indexOf(':')

        if (separator < 0) {
          throw new Error(`Invalid CSS declaration in ${selector}: ${declaration}`)
        }

        return [
          declaration.slice(0, separator).trim(),
          declaration.slice(separator + 1).trim(),
        ] as const
      }),
  )
}

function cssLengthInPixels(value: string): number {
  const match = /^(\d+(?:\.\d+)?)rem$/u.exec(value)

  if (match?.[1] === undefined) {
    throw new Error(`Expected a rem length, received ${value}`)
  }

  return Number(match[1]) * 16
}

function customPropertyValue(name: string): string {
  const propertyPattern = new RegExp(
    `${escapeRegExp(name)}\\s*:\\s*([^;]+);`,
    'u',
  )
  const value = propertyPattern.exec(stylesSource)?.[1]?.trim()

  if (value === undefined) {
    throw new Error(`Expected CSS custom property ${name}`)
  }

  return value
}

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
    expect(markup.match(/href="\/dashboard"/gu)).toHaveLength(1)
    expect(markup).not.toContain('href="/courses"')
    expect(markup).not.toContain('topbar-context-actions')
    expect(markup).toContain('href="/courses/cse-professional"')
    expect(markup).toContain('href="/account"')
    expect(markup).toContain('href="/exam-calendar"')
    expect(markup).toContain('Sign out')
    expect(markup).not.toContain('Open navigation menu')
    expect(markup).not.toContain('Admin</a>')
  })

  it('keeps one navy avatar at the true mobile header edge', () => {
    const mobileTopbar = declarationsFor('.topbar.topbar--authenticated')
    const mobileActions = declarationsFor(
      '.topbar.topbar--authenticated > .topbar-actions',
    )
    const mobileAccountMenu = declarationsFor(
      '.topbar.topbar--authenticated > .topbar-actions > .account-menu',
    )
    const trigger = declarationsFor('.account-menu__trigger')
    const avatar = declarationsFor('.account-menu__avatar')
    const focusAvatar = declarationsFor(
      '.account-menu__trigger:focus-visible .account-menu__avatar',
    )
    const accountMenu = declarationsFor('.account-menu')
    const mobilePanel = declarationsFor(
      '.topbar--authenticated .account-menu__panel',
    )
    const triggerSize = cssLengthInPixels(trigger.get('width') ?? '')
    const avatarSize = cssLengthInPixels(avatar.get('width') ?? '')
    const paddingRight = mobileTopbar.get('padding-right') ?? ''
    const insetToken = /var\((--[^)]+)\)/u.exec(paddingRight)?.[1]

    if (insetToken === undefined) {
      throw new Error(`Expected a custom-property mobile inset in ${paddingRight}`)
    }

    const mobileInset = cssLengthInPixels(customPropertyValue(insetToken))

    expect(mobileTopbar.get('width')).toBe('100vw')
    expect(mobileTopbar.get('max-width')).toBe('100vw')
    expect(mobileTopbar.get('margin-inline')).toBe('calc(50% - 50vw)')
    expect(paddingRight).toBe(
      'max(var(--space-16), env(safe-area-inset-right))',
    )
    expect(mobileActions.get('width')).toBe('auto')
    expect(mobileActions.get('margin-left')).toBe('auto')
    expect(mobileActions.get('justify-content')).toBe('flex-end')
    expect(mobileAccountMenu.get('width')).toBe('2.75rem')
    expect(trigger.get('min-height')).toBe('2.75rem')
    expect(trigger.get('justify-items')).toBe('end')
    expect(trigger.get('border')).toBe('0')
    expect(trigger.get('background')).toBe('transparent')
    expect(trigger.get('box-shadow')).toBe('none')
    expect(avatar.get('background')).toBe('var(--brand-navy)')
    expect(focusAvatar.get('box-shadow')).toContain('var(--focus-ring)')
    expect(accountMenu.get('position')).toBe('relative')
    expect(mobilePanel.get('position')).toBe('absolute')
    expect(triggerSize).toBeGreaterThanOrEqual(44)
    expect(avatarSize).toBeGreaterThanOrEqual(32)
    expect(avatarSize).toBeLessThanOrEqual(36)

    for (const viewportWidth of [320, 375, 390, 430]) {
      const fullBleedHeaderRight = viewportWidth
      const triggerRight = fullBleedHeaderRight - mobileInset
      const avatarRight = triggerRight
      const avatarRightInset = viewportWidth - avatarRight

      expect(triggerRight - triggerSize).toBeGreaterThanOrEqual(0)
      expect(avatarRightInset).toBeGreaterThanOrEqual(12)
      expect(avatarRightInset).toBeLessThanOrEqual(16)
    }
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
