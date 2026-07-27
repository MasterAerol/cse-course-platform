import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { fetchAdminCheck } from '../lib/api'

type AdminCheckState =
  | { status: 'loading' }
  | { status: 'authorized'; email: string }
  | { status: 'error'; message: string }

export function AdminPage() {
  const [check, setCheck] = useState<AdminCheckState>({
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function verifyAdminRoute(): Promise<void> {
      try {
        const response = await fetchAdminCheck(controller.signal)
        setCheck({
          status: 'authorized',
          email: response.data.user.email,
        })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setCheck({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Admin authorization could not be checked.',
          })
        }
      }
    }

    void verifyAdminRoute()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <main className="centered-page">
      <section className="message-card" aria-live="polite">
        <p className="eyebrow">Admin route test</p>
        <h1>Server-enforced administrator check</h1>
        {check.status === 'loading' && <p>Checking the protected API…</p>}
        {check.status === 'authorized' && (
          <p>
            Access confirmed for <strong>{check.email}</strong>.
          </p>
        )}
        {check.status === 'error' && (
          <p className="form-error" role="alert">
            {check.message}
          </p>
        )}
        <Link className="button-link button-link--secondary" to="/dashboard">
          Return to dashboard
        </Link>
      </section>
    </main>
  )
}
