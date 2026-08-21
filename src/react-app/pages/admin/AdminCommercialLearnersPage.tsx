import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import {
  fetchAdminLearners,
  type AdminLearnerSummary,
} from '../../lib/commercial-api'

export function AdminCommercialLearnersPage() {
  const [learners, setLearners] = useState<AdminLearnerSummary[]>([])
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      void fetchAdminLearners({ query: query || undefined, access: access || undefined }, controller.signal)
        .then((result) => { setLearners(result); setError(null) })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Learners could not be loaded.')
        })
    }, 150)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [access, query])

  return (
    <main className="admin-page">
      <AdminPageHeader title="Learner access" description="Search learner accounts and manage commercial access without changing course history or progression." />
      <section className="admin-panel commercial-filter-bar">
        <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" /></label>
        <label>Access<select value={access} onChange={(event) => setAccess(event.target.value)}><option value="">All</option><option>FREE</option><option>PREMIUM</option><option>TESTER</option><option>EXPIRED</option></select></label>
      </section>
      {error !== null && <p className="form-error" role="alert">{error}</p>}
      <section className="admin-panel">
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Learner</th><th>Registered</th><th>Last active</th><th>Access</th><th>Presence</th><th>Enrollment</th><th>Progress</th><th /></tr></thead>
          <tbody>{learners.map((learner) => <tr key={learner.id}>
            <td><strong>{learner.name}</strong><br /><small>{learner.email}</small></td>
            <td>{new Date(learner.registeredAt).toLocaleDateString()}</td>
            <td>{learner.lastActiveAt === null ? 'No activity' : new Date(learner.lastActiveAt).toLocaleString()}</td>
            <td>{learner.currentAccess}{learner.accessExpiresAt === null ? '' : <><br /><small>to {new Date(learner.accessExpiresAt).toLocaleDateString()}</small></>}</td>
            <td><span className={learner.online ? 'presence presence--online' : 'presence'}>{learner.online ? 'Online' : 'Offline'}</span></td>
            <td>{learner.enrollmentStatus ?? 'Not enrolled'}</td>
            <td>{learner.courseProgressPercent}%</td>
            <td><Link to={`/admin/commercial-learners/${learner.id}`}>Manage</Link></td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </main>
  )
}
