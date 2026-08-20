import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { AdminMetadata, AdminPageHeader, StatusBadge } from '../../components/admin/AdminUi'
import { PasaWiseLoader } from '../../components/PasaWiseLoader'
import { adminLabel } from '../../lib/admin-copy'
import { fetchAdminDashboard, type AdminAuditLog, type AdminDashboard } from '../../lib/api'

type DashboardState =
  | { status: 'loading' }
  | { status: 'loaded'; dashboard: AdminDashboard }
  | { status: 'error'; message: string }

function recentChange(value: unknown, index: number): AdminAuditLog {
  const record = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return {
    id: typeof record.id === 'number' ? record.id : -1 - index,
    actorUserId: typeof record.actorUserId === 'number' ? record.actorUserId : null,
    actorEmail: typeof record.actorEmail === 'string' ? record.actorEmail : null,
    action: typeof record.action === 'string' ? record.action : 'updated',
    entityType: typeof record.entityType === 'string' ? record.entityType : 'content',
    entityId: typeof record.entityId === 'string' ? record.entityId : null,
    metadata: record.metadata ?? null,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
  }
}

function formatAdminDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString()
}

export function AdminDashboardView({ dashboard }: { dashboard: AdminDashboard }) {
  const changes = dashboard.recentChanges.map(recentChange)
  const overview = [
    ['Published courses', dashboard.counts.publishedCourses],
    ['Published lessons', dashboard.counts.publishedLessons],
    ['Draft courses', dashboard.counts.draftCourses],
    ['Total courses', dashboard.counts.courses],
  ] as const
  const content = [
    ['Subjects', dashboard.counts.subjects],
    ['Topics', dashboard.counts.topics],
    ['Lessons', dashboard.counts.lessons],
    ['Practice sets', dashboard.counts.practiceSets],
    ['Quizzes', dashboard.counts.quizzes],
  ] as const

  return (
    <>
      <section className="admin-stat-grid" aria-label="Content overview">
        {overview.map(([label, value]) => (
          <article className="admin-stat" key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel" aria-labelledby="content-inventory-title">
          <div className="admin-panel__heading"><div><p className="eyebrow">Content</p><h2 id="content-inventory-title">Curriculum inventory</h2></div><Link to="/admin/courses">Manage content</Link></div>
          <dl className="admin-inventory-list">
            {content.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          {dashboard.cseProfessional !== null && (
            <div className="admin-active-course">
              <div><span>Active course</span><strong>{dashboard.cseProfessional.title}</strong></div>
              <StatusBadge status={dashboard.cseProfessional.status} />
              <Link className="button-link button-link--secondary" to={`/admin/courses/${dashboard.cseProfessional.id}`}>Open builder</Link>
            </div>
          )}
        </section>

        <section className="admin-panel" aria-labelledby="operations-title">
          <div className="admin-panel__heading"><div><p className="eyebrow">Operations</p><h2 id="operations-title">Quick actions</h2></div></div>
          <div className="admin-quick-actions">
            <Link to="/admin/courses"><strong>Course &amp; lesson builder</strong><span>Manage real curriculum and publishing states.</span></Link>
            <Link to="/admin/students"><strong>Learner accounts</strong><span>Create invited accounts and manage enrollments.</span></Link>
            <Link to="/admin/audit-log"><strong>Audit log</strong><span>Review recent authorized content changes.</span></Link>
          </div>
        </section>
      </div>

      <section className="admin-panel" aria-labelledby="recent-admin-changes-title">
        <div className="admin-panel__heading"><div><p className="eyebrow">System record</p><h2 id="recent-admin-changes-title">Recent admin changes</h2></div><Link to="/admin/audit-log">View full audit log</Link></div>
        {changes.length === 0 ? (
          <p>No admin changes have been logged yet.</p>
        ) : (
          <div className="admin-change-list">
            {changes.map((change) => (
              <article key={change.id}>
                <div className="admin-change-list__mark" aria-hidden="true" />
                <div><strong>{adminLabel(change.action)} {adminLabel(change.entityType)}</strong><p>{change.actorEmail ?? 'Unknown admin'} · {formatAdminDate(change.createdAt)}</p><AdminMetadata metadata={change.metadata} /></div>
                <span>{change.entityId ?? '—'}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

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
        description="Monitor curriculum status, learner operations, and authorized changes."
        actions={<Link className="button-link" to="/admin/courses">Manage courses</Link>}
      />
      {state.status === 'loading' && <PasaWiseLoader label="Loading admin dashboard…" />}
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'loaded' && <AdminDashboardView dashboard={state.dashboard} />}
    </main>
  )
}
