import { Link, Outlet } from 'react-router'

import { useAuth } from '../auth/use-auth'

export function AdminRoute() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return (
      <main className="centered-page">
        <section className="message-card">
          <p className="eyebrow">Access denied</p>
          <h1>Administrator access is required.</h1>
          <p>Your student account cannot open this route.</p>
          <Link className="button-link" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      </main>
    )
  }

  return <Outlet />
}
