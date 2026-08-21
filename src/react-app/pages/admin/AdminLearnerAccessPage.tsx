import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import {
  extendLearnerAccess,
  fetchAdminLearner,
  grantLearnerAccess,
  revokeLearnerAccess,
  type AdminLearnerDetail,
} from '../../lib/commercial-api'

export function AdminLearnerAccessPage() {
  const { learnerId = '' } = useParams()
  const [data, setData] = useState<AdminLearnerDetail | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [plan, setPlan] = useState('tester-premium')
  const [days, setDays] = useState(14)
  const [reason, setReason] = useState('Access revoked by administrator.')

  useEffect(() => {
    const controller = new AbortController()
    void fetchAdminLearner(learnerId, controller.signal)
      .then(setData)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Learner could not be loaded.')
      })
    return () => controller.abort()
  }, [learnerId])

  function run(action: Promise<AdminLearnerDetail>, success: string): void {
    setMessage(null)
    void action.then((result) => { setData(result); setMessage(success) }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'The access action failed.'))
  }

  return (
    <main className="admin-page">
      <AdminPageHeader title={data?.learner.name ?? 'Learner access'} description="Commercial access controls are independent from course enrollment, progress, history, and scores." />
      <p><Link to="/admin/commercial-learners">← Back to learner access</Link></p>
      {message !== null && <p className="form-success" role="status">{message}</p>}
      {data !== null && <>
        <section className="admin-panel">
          <h2>Current access</h2>
          <dl className="commercial-detail-grid">
            <div><dt>Email</dt><dd>{data.learner.email}</dd></div>
            <div><dt>Registered</dt><dd>{new Date(data.learner.registeredAt).toLocaleString()}</dd></div>
            <div><dt>Last active</dt><dd>{data.learner.lastActiveAt === null ? 'No recorded activity' : new Date(data.learner.lastActiveAt).toLocaleString()}</dd></div>
            <div><dt>Online</dt><dd>{data.learner.online ? 'Online now' : 'Offline'}</dd></div>
            <div><dt>Enrollment</dt><dd>{data.learner.enrollmentStatus ?? 'Not enrolled'}</dd></div>
            <div><dt>Access</dt><dd>{data.access.status}</dd></div>
            <div><dt>Plan</dt><dd>{data.access.planName ?? 'None'}</dd></div>
            <div><dt>Source</dt><dd>{data.access.source ?? 'None'}</dd></div>
            <div><dt>Starts</dt><dd>{data.access.startsAt === null ? 'Not applicable' : new Date(data.access.startsAt).toLocaleString()}</dd></div>
            <div><dt>Expires</dt><dd>{data.access.expiresAt === null ? 'Not applicable' : new Date(data.access.expiresAt).toLocaleString()}</dd></div>
            <div><dt>Course progress</dt><dd>{data.learner.courseProgressPercent}%</dd></div>
          </dl>
        </section>
        <section className="admin-panel">
          <h2>Payment history</h2>
          {data.payments.length === 0 ? <p>No payment requests.</p> : <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Request</th><th>Plan</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>{data.payments.map((payment) => <tr key={payment.id}>
              <td>{payment.id}</td>
              <td>{payment.plan.name}</td>
              <td>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(payment.expectedAmountMinor / 100)}</td>
              <td>{payment.status}</td>
              <td>{new Date(payment.createdAt).toLocaleString()}</td>
            </tr>)}</tbody>
          </table></div>}
        </section>
        <section className="admin-panel commercial-action-grid">
          <form onSubmit={(event) => { event.preventDefault(); if (window.confirm(`Grant ${plan} commercial access to ${data.learner.name}?`)) run(grantLearnerAccess(learnerId, plan), 'Access granted and audit logged.') }}>
            <h2>Grant access</h2>
            <label>Plan<select value={plan} onChange={(event) => setPlan(event.target.value)}><option value="tester-premium">Tester Premium — 14 days</option><option value="founding-learner">Founding Learner — 30 days</option><option value="regular-monthly">Regular Monthly — 30 days</option></select></label>
            <button type="submit">Confirm grant</button>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); if (window.confirm(`Extend ${data.learner.name}'s commercial access by ${days} days?`)) run(extendLearnerAccess(learnerId, days), 'Access extended and audit logged.') }}>
            <h2>Extend active access</h2>
            <label>Additional days<input type="number" min="1" max="366" value={days} onChange={(event) => setDays(event.target.valueAsNumber)} /></label>
            <button type="submit">Confirm extension</button>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); if (window.confirm(`Revoke ${data.learner.name}'s commercial access? Learning data will be preserved.`)) run(revokeLearnerAccess(learnerId, reason), 'Access revoked and audit logged.') }}>
            <h2>Revoke access</h2>
            <label>Reason<textarea required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <button className="button-danger" type="submit">Confirm revocation</button>
          </form>
        </section>
      </>}
    </main>
  )
}
