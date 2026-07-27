import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../auth/use-auth'

export function ProtectedRoute() {
  const { user, loading, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="centered-page" aria-live="polite">
        <p>Restoring your session…</p>
      </main>
    )
  }

  if (user === null) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message: error,
        }}
      />
    )
  }

  return <Outlet />
}
