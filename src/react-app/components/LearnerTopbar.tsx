import { useContext, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthContext } from '../auth/auth-context'

interface LearnerTopbarProps {
  children?: ReactNode
  as?: 'header' | 'nav'
  className?: string
  ariaLabel?: string
  showSignOut?: boolean
}

export function LearnerTopbar({
  children,
  as = 'nav',
  className,
  ariaLabel = 'Primary',
  showSignOut = false,
}: LearnerTopbarProps) {
  const Root = as === 'header' ? 'header' : 'nav'
  const mergedClassName = `topbar${className === undefined ? '' : ` ${className}`}`
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const logout = authContext?.logout
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <Link className="brand-link" to="/">
        CSE Course Platform
      </Link>
      <div className="topbar-actions">
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