import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { PasaWiseBrand } from '../components/PasaWiseBrand'
import { fetchHealth } from '../lib/api'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'connected' }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The API returned an unexpected response.'
}

export function HomePage() {
  const { user, registrationMode } = useAuth()
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function checkConnection(): Promise<void> {
      try {
        await fetchHealth(controller.signal)
        setConnection({ status: 'connected' })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setConnection({ status: 'error', message: getErrorMessage(error) })
        }
      }
    }

    void checkConnection()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <PasaWiseBrand className="hero-brand" variant="primary" />
        <p className="eyebrow">Aral nang wais. Pasa nang handa.</p>
        <h1 id="page-title">Study smarter. Walk into the CSE ready.</h1>
        <p className="intro">
          Build exam confidence with focused lessons, guided practice, and a
          clear next step every time you return.
        </p>

        <div className="button-row">
          {user === null ? (
            <>
              <Link className="button-link" to="/courses">
                Browse courses
              </Link>
              <Link className="button-link" to="/login">
                Sign in
              </Link>
              {registrationMode === 'open' && (
                <Link
                  className="button-link button-link--secondary"
                  to="/register"
                >
                  Create account
                </Link>
              )}
            </>
          ) : (
            <>
              <Link className="button-link" to="/dashboard">
                Open dashboard
              </Link>
              <Link className="button-link button-link--secondary" to="/courses">
                Browse courses
              </Link>
            </>
          )}
        </div>

        <div className="status-card" aria-live="polite" aria-atomic="true">
          <span
            className={`status-indicator status-indicator--${connection.status}`}
          />
          <div>
            <p className="status-label">
              {connection.status === 'loading' && 'Preparing your review space'}
              {connection.status === 'connected' && 'PasaWise is ready'}
              {connection.status === 'error' && 'PasaWise could not connect'}
            </p>
            <p className="status-copy">
              {connection.status === 'loading' &&
                'Checking that lessons and practice are available…'}
              {connection.status === 'connected' &&
                'Your lessons, practice, and progress tools are available.'}
              {connection.status === 'error' && connection.message}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
