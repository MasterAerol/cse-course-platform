import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthContext } from '../auth/auth-context'
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
  const Root = as === 'header' ? 'header' : 'nav'
  const mergedClassName = `topbar${
    mobileCollapsible ? ' topbar--mobile-collapsible' : ''
  }${className === undefined ? '' : ` ${className}`}`
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const logout = authContext?.logout
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
      {mobileCollapsible && (
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
        id={mobileCollapsible ? mobileMenuId : undefined}
        className={`topbar-actions${
          mobileCollapsible
            ? ` topbar-actions--collapsible${mobileMenuOpen ? ' is-open' : ''}`
            : ''
        }`}
        onClick={(event) => {
          if (
            mobileCollapsible &&
            event.target instanceof Element &&
            event.target.closest('a, button') !== null
          ) {
            setMobileMenuOpen(false)
          }
        }}
      >
        {children}
        {showSignOut ? (
          user === null ? (
            <Link className="button-link button-link--secondary" to="/login">
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              className="button-secondary"
              disabled={submitting}
              onClick={() => void handleSignOut()}
            >
              {submitting ? 'Signing out...' : 'Sign out'}
            </button>
          )
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