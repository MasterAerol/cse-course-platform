import { useCallback, useEffect, useState } from 'react'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import {
  fetchAdminFeedback,
  updateFeedbackStatus,
  type BetaFeedback,
  type FeedbackStatus,
} from '../../lib/commercial-api'

const statusLabels: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
}

export function AdminFeedbackPage() {
  const [filter, setFilter] = useState<FeedbackStatus | ''>('new')
  const [feedback, setFeedback] = useState<BetaFeedback[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(
    (signal?: AbortSignal): Promise<void> =>
      fetchAdminFeedback(filter || undefined, signal).then(setFeedback),
    [filter],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setMessage(
          error instanceof Error ? error.message : 'Feedback could not be loaded.',
        )
      }
    })
    return () => controller.abort()
  }, [load])

  function changeStatus(id: string, status: FeedbackStatus): void {
    setMessage(null)
    void updateFeedbackStatus(id, status)
      .then(() => load())
      .catch((error: unknown) =>
        setMessage(
          error instanceof Error ? error.message : 'Status could not be updated.',
        ),
      )
  }

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Beta feedback"
        description="Review authenticated learner reports. Submitted text is stored as plain text and never rendered as HTML."
      />
      <div className="commercial-filter-bar">
        <label>
          Status
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as FeedbackStatus | '')}
          >
            <option value="">All</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {message !== null && <p className="form-error" role="status">{message}</p>}
      <section className="feedback-admin-list" aria-label="Learner feedback">
        {feedback.length === 0 ? (
          <p>No feedback matches this filter.</p>
        ) : feedback.map((item) => (
          <article className="admin-panel feedback-admin-card" key={item.id}>
            <header>
              <div>
                <span className="eyebrow">{item.category}</span>
                <h2>{item.learner.name}</h2>
                <p>{item.learner.email}</p>
              </div>
              <span className={`admin-status admin-status--${item.status === 'resolved' ? 'active' : 'warning'}`}>
                {statusLabels[item.status]}
              </span>
            </header>
            <p className="feedback-message">{item.message}</p>
            <dl className="commercial-detail-grid">
              <div><dt>Page</dt><dd>{item.pagePath}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></div>
            </dl>
            <div className="commercial-payment-actions" aria-label="Feedback status">
              {(Object.keys(statusLabels) as FeedbackStatus[]).map((status) => (
                <button
                  disabled={item.status === status}
                  key={status}
                  type="button"
                  onClick={() => changeStatus(item.id, status)}
                >
                  Mark {statusLabels[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
