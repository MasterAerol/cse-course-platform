import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
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
  const { user } = useAuth()
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
        <p className="eyebrow">CSE Course Platform</p>
        <h1 id="page-title">A secure place to begin learning.</h1>
        <p className="intro">
          Browse published CSE preparation courses, then sign in to continue
          learning from your student dashboard.
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
              <Link className="button-link button-link--secondary" to="/register">
                Create account
              </Link>
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
              {connection.status === 'loading' && 'Checking connection'}
              {connection.status === 'connected' && 'API connected'}
              {connection.status === 'error' && 'Connection unavailable'}
            </p>
            <p className="status-copy">
              {connection.status === 'loading' && 'Contacting the platform API…'}
              {connection.status === 'connected' &&
                'React, Hono, and Cloudflare Workers are communicating.'}
              {connection.status === 'error' && connection.message}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
