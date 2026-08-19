import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { PasaWiseLoader } from '../components/PasaWiseLoader'
import { fetchAdminCheck } from '../lib/api'

type AdminCheckState =
  | { status: 'loading' }
  | { status: 'authorized' }
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
        if (!response.data.authorized) {
          throw new Error('Administrator authorization could not be confirmed.')
        }
        setCheck({ status: 'authorized' })
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
        <p className="eyebrow">Administration</p>
        <h1>Administrator access</h1>
        {check.status === 'loading' && <PasaWiseLoader label="Checking administrator access…" />}
        {check.status === 'authorized' && (
          <p>Access confirmed for this administrator account.</p>
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
