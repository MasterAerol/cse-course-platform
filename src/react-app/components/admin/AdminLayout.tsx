import { NavLink, Outlet } from 'react-router'

import { useAuth } from '../../auth/use-auth'
import { PasaWiseBrand } from '../PasaWiseBrand'

export function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand-wrap">
          <PasaWiseBrand variant="mark" />
          <div><strong>PasaWise</strong><span>Admin workspace</span></div>
        </div>
        <nav>
          <p>Overview</p>
          <NavLink end to="/admin">Dashboard</NavLink>
          <p>Content</p>
          <NavLink to="/admin/courses">Courses &amp; curriculum</NavLink>
          <p>Operations</p>
          <NavLink to="/admin/students">Learner accounts</NavLink>
          <NavLink to="/admin/commercial-learners">Learner access</NavLink>
          <NavLink to="/admin/payments">Payments</NavLink>
          <NavLink to="/admin/business">Business overview</NavLink>
          <NavLink to="/admin/commercial-settings">Commercial controls</NavLink>
          <NavLink to="/admin/feedback">Beta feedback</NavLink>
          <NavLink to="/admin/audit-log">Audit log</NavLink>
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">PasaWise operations</p>
            <p>
              Signed in as <strong>{user?.email}</strong>
            </p>
          </div>
          <div className="admin-header__actions">
            <span className="admin-status admin-status--active">Authorized admin</span>
            <NavLink className="button-link button-link--secondary" to="/dashboard">
              Learner view
            </NavLink>
            <NavLink className="button-link button-link--secondary" to="/account">
              Account
            </NavLink>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
