import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthContext } from '../auth/auth-context'
import { AccountMenu } from './AccountMenu'
import { PasaWiseBrand } from './PasaWiseBrand'

interface LearnerTopbarProps {
  children?: ReactNode
  as?: 'header' | 'nav'
  className?: string
  ariaLabel?: string
  mobileCollapsible?: boolean
  showSignOut?: boolean
}

export function LearnerTopbar({
  children,
  as = 'nav',
  className,
  ariaLabel = 'Primary',
  mobileCollapsible = false,
  showSignOut = false,
}: LearnerTopbarProps) {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const logout = authContext?.logout
  const useMobileCollapsible = mobileCollapsible && user === null
  const Root = as === 'header' ? 'header' : 'nav'
  const mergedClassName = [
    'topbar',
    useMobileCollapsible ? 'topbar--mobile-collapsible' : null,
    user === null ? null : 'topbar--authenticated',
    className,
  ].filter((value) => value !== null && value !== undefined).join(' ')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuId = useId()
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!mobileMenuOpen) {
      return
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  async function handleSignOut(): Promise<void> {
    if (logout === undefined) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await logout()
    } catch (signOutError: unknown) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Sign out could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Root className={mergedClassName} aria-label={ariaLabel}>
      <PasaWiseBrand linked variant="header" />
      {useMobileCollapsible && (
        <button
          ref={menuButtonRef}
          type="button"
          className="topbar-menu-trigger button-secondary"
          aria-controls={mobileMenuId}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>
      )}
      <div
        id={useMobileCollapsible ? mobileMenuId : undefined}
        className={`topbar-actions${
          useMobileCollapsible
            ? ` topbar-actions--collapsible${mobileMenuOpen ? ' is-open' : ''}`
            : ''
        }`}
        onClick={(event) => {
          if (
            useMobileCollapsible &&
            event.target instanceof Element &&
            event.target.closest('a, button') !== null
          ) {
            setMobileMenuOpen(false)
          }
        }}
      >
        {user === null && children !== undefined && (
          <div className="topbar-context-actions">{children}</div>
        )}
        {user !== null ? (
          <AccountMenu
            user={user}
            submitting={submitting}
            onSignOut={() => void handleSignOut()}
          />
        ) : showSignOut ? (
          <Link className="button-link button-link--secondary" to="/login">
            Sign in
          </Link>
        ) : null}
      </div>
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Root>
  )
}