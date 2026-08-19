import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { PasaWisePageLoader } from './PasaWiseLoader'

export function ProtectedRoute() {
  const { user, loading, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PasaWisePageLoader label="Restoring your session…" />
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
