import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { fetchMockSummary, type MockExamSummary } from '../lib/mock-exam-api'

export function MockExamCard() {
  const [state, setState] = useState<MockExamSummary | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchMockSummary(controller.signal)
      .then((response) => setState(response))
      .catch(() => {
        return
      })

    return () => controller.abort()
  }, [])

  if (state === null) {
    return null
  }

  const active =
    state.activeAttempt as ({ public_id?: string; mode?: string; status?: string } | null)

  return (
    <section className="continue-card mock-exam-card course-detail-mock-card">
      <p className="eyebrow">Final simulation</p>
      <h3>{state.examination.title}</h3>
      <p>
        {state.examination.questionCount} scored questions ·
        {` ${state.examination.timedDurationMinutes} minutes`}
        {` · Pass: ${state.examination.passingTarget}/${state.examination.questionCount} (${state.examination.passingScore}%)`}
      </p>
      <p className="meta-copy">
        Attempts: {state.attemptCount} · Latest: {state.latestScore ?? '—'}% · Best: {state.bestScore ?? '—'}%
      </p>
      <div className="topbar-actions">
        {active?.public_id !== undefined ? (
          <Link
            className="button-link"
            to={`/mock-exam-attempts/${active.public_id}`}
          >
            Resume {active.mode} mock
          </Link>
        ) : (
          <Link className="button-link" to={`/mock-examinations/${state.examination.slug}`}>
            Start full mock
          </Link>
        )}
      </div>
    </section>
  )
}