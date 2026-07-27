import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth } from '../auth/use-auth'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout(): Promise<void> {
    setSubmitting(true)
    setError(null)

    try {
      await logout()
      await navigate('/login', { replace: true })
    } catch (logoutError: unknown) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : 'Logout could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (user === null) {
    return null
  }

  return (
    <main className="dashboard-page">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        <button
          className="button-secondary"
          type="button"
          disabled={submitting}
          onClick={() => void handleLogout()}
        >
          {submitting ? 'Signing out…' : 'Sign out'}
        </button>
      </nav>

      <section className="dashboard-card">
        <p className="eyebrow">Authenticated dashboard</p>
        <h1>
          Welcome, {user.firstName} {user.lastName}.
        </h1>
        <p>
          You are signed in as <strong>{user.email}</strong> with the{' '}
          <strong>{user.role}</strong> role.
        </p>
        <p>
          Course and lesson features are intentionally not part of this
          milestone.
        </p>

        {user.role === 'admin' && (
          <Link className="button-link" to="/admin">
            Test admin route
          </Link>
        )}

        {error !== null && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}
