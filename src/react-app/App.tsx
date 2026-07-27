import { useEffect, useState } from 'react'

import { fetchHealth } from './lib/api'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'connected' }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The API returned an unexpected response.'
}

export function App() {
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
        <h1 id="page-title">A strong foundation for focused learning.</h1>
        <p className="intro">
          The application shell and Cloudflare API are ready for the course
          experience to grow one verified milestone at a time.
        </p>

        <div className="status-card" aria-live="polite" aria-atomic="true">
          {connection.status === 'loading' && (
            <>
              <span className="status-indicator status-indicator--loading" />
              <div>
                <p className="status-label">Checking connection</p>
                <p className="status-copy">Contacting the platform API…</p>
              </div>
            </>
          )}

          {connection.status === 'connected' && (
            <>
              <span className="status-indicator status-indicator--connected" />
              <div>
                <p className="status-label">API connected</p>
                <p className="status-copy">
                  React, Hono, and Cloudflare Workers are communicating.
                </p>
              </div>
            </>
          )}

          {connection.status === 'error' && (
            <>
              <span className="status-indicator status-indicator--error" />
              <div>
                <p className="status-label">Connection unavailable</p>
                <p className="status-copy">{connection.message}</p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
