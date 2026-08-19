import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import { PasaWiseLoader } from '../../components/PasaWiseLoader'
import { fetchAdminDashboard, type AdminDashboard } from '../../lib/api'

type DashboardState =
  | { status: 'loading' }
  | { status: 'loaded'; dashboard: AdminDashboard }
  | { status: 'error'; message: string }

export function AdminDashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchAdminDashboard(controller.signal)
      .then((dashboard) => setState({ status: 'loaded', dashboard }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Admin dashboard could not be loaded.',
          })
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Admin dashboard"
        description="Content counts, recent changes, and quick entry points."
        actions={<Link className="button-link" to="/admin/courses">Manage courses</Link>}
      />
      {state.status === 'loading' && <PasaWiseLoader label="Loading admin dashboard…" />}
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'loaded' && (
        <>
          <section className="admin-stat-grid">
            {Object.entries(state.dashboard.counts).map(([key, value]) => (
              <article className="admin-stat" key={key}>
                <span>{key.replace(/[A-Z]/g, ' $&')}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          {state.dashboard.cseProfessional !== null && (
            <section className="admin-panel">
              <h2>Quick link</h2>
              <Link
                className="button-link button-link--secondary"
                to={`/admin/courses/${state.dashboard.cseProfessional.id}`}
              >
                Open CSE Professional
              </Link>
            </section>
          )}
          <section className="admin-panel">
            <h2>Recent admin changes</h2>
            {state.dashboard.recentChanges.length === 0 ? (
              <p>No admin changes have been logged yet.</p>
            ) : (
              <pre>{JSON.stringify(state.dashboard.recentChanges, null, 2)}</pre>
            )}
          </section>
        </>
      )}
    </main>
  )
}
