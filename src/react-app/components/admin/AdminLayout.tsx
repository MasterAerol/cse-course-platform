import { NavLink, Outlet } from 'react-router'

import { useAuth } from '../../auth/use-auth'

export function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <NavLink className="admin-brand" to="/admin">
          CSE Admin
        </NavLink>
        <nav>
          <NavLink to="/admin">Dashboard</NavLink>
          <NavLink to="/admin/courses">Courses</NavLink>
          <NavLink to="/admin/students">Beta Students</NavLink>
          <NavLink to="/admin/audit-log">Audit Log</NavLink>
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Admin Content Builder Lite</p>
            <p>
              Signed in as <strong>{user?.email}</strong>
            </p>
          </div>
          <NavLink className="button-link button-link--secondary" to="/dashboard">
            Student dashboard
          </NavLink>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
