import { Navigate, Outlet } from 'react-router'

import { useAuth } from '../auth/use-auth'

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="centered-page" aria-live="polite">
        <p>Restoring your session…</p>
      </main>
    )
  }

  return user === null ? <Outlet /> : <Navigate to="/dashboard" replace />
}
