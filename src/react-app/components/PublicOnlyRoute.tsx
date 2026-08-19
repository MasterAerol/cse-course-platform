import { Navigate, Outlet } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { PasaWisePageLoader } from './PasaWiseLoader'

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <PasaWisePageLoader label="Restoring your session…" />
  }

  return user === null ? <Outlet /> : <Navigate to="/dashboard" replace />
}
