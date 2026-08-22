import { useEffect, useState } from 'react'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import {
  fetchBusinessOverview,
  type BusinessOverview,
} from '../../lib/commercial-api'

function php(minor: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(minor / 100)
}

export function AdminBusinessPage() {
  const [data, setData] = useState<BusinessOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetchBusinessOverview(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Business metrics could not be loaded.')
      })
    return () => controller.abort()
  }, [])

  const metrics = data === null ? [] : [
    ['Registered learners', data.students.totalRegistered],
    ['New today', data.students.newToday],
    ['New this week', data.students.newThisWeek],
    ['New this month', data.students.newThisMonth],
    ['Online now', data.online.onlineNow],
    ['Active Premium', data.access.activePremium],
    ['Tester accounts', data.access.testerAccounts],
    ['Free learners', data.access.freeLearners],
    ['Expiring in 7 days', data.access.expiringSoon],
    ['Expired access', data.access.expired],
    ['Pending verification', data.payments.pendingVerification],
    ['Approved payments', data.payments.approved],
    ['Rejected payments', data.payments.rejected],
    ['Refunded payments', data.payments.refunded],
  ] as const

  return (
    <main className="admin-page">
      <AdminPageHeader title="Business overview" description="Commercial access, payment verification, presence, and revenue health." />
      {error !== null && <p className="form-error" role="alert">{error}</p>}
      <section className="admin-metric-grid" aria-label="Business metrics">
        {metrics.map(([label, value]) => <article className="admin-panel" key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </section>
      {data !== null && (
        <section className="admin-panel tester-program" aria-labelledby="tester-program-title">
          <div className="tester-program__heading">
            <div><p className="eyebrow">External beta</p><h2 id="tester-program-title">Tester Program</h2></div>
            <strong>{data.testerProgram.active} / {data.testerProgram.capacity}</strong>
          </div>
          <progress aria-label="Active Tester Program capacity" max={data.testerProgram.capacity} value={data.testerProgram.active} />
          <dl className="commercial-detail-grid">
            <div><dt>Available</dt><dd>{data.testerProgram.available}</dd></div>
            <div><dt>Expiring in 7 days</dt><dd>{data.testerProgram.expiringSoon}</dd></div>
            <div><dt>Expired testers</dt><dd>{data.testerProgram.expired}</dd></div>
            <div><dt>Access grant</dt><dd>{data.testerProgram.durationDays} days · {php(data.testerProgram.revenueMinor)}</dd></div>
          </dl>
          <p>Tester Premium is granted manually and never assigned on signup.</p>
        </section>
      )}
      {data !== null && (
        <section className="admin-panel">
          <h2>Verified revenue</h2>
          <p>Revenue includes approved, non-zero, revenue-counting payments only. Tester access never contributes.</p>
          <dl className="commercial-revenue-grid">
            <div><dt>Today</dt><dd>{php(data.revenue.todayMinor)}</dd></div>
            <div><dt>This week</dt><dd>{php(data.revenue.thisWeekMinor)}</dd></div>
            <div><dt>This month</dt><dd>{php(data.revenue.thisMonthMinor)}</dd></div>
            <div><dt>All time</dt><dd>{php(data.revenue.allTimeMinor)}</dd></div>
            <div><dt>Paid customers</dt><dd>{data.revenue.paidCustomers}</dd></div>
            <div><dt>Approved transactions</dt><dd>{data.revenue.approvedPaidTransactions}</dd></div>
          </dl>
        </section>
      )}
    </main>
  )
}
