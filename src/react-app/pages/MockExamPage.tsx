import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { createMockAttempt, fetchMockSummary, type MockExamSummary } from '../lib/mock-exam-api'

export function MockExamPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<MockExamSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showEdq, setShowEdq] = useState(false)

  useEffect(() => {
    const c = new AbortController()
    fetchMockSummary(c.signal)
      .then(setSummary)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Mock could not be loaded.')
      })
    return () => c.abort()
  }, [])

  async function begin(mode: 'timed' | 'untimed'): Promise<void> {
    setBusy(true)
    try {
      const data = await createMockAttempt(mode)
      await navigate(`/mock-exam-attempts/${data.attempt.publicId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Attempt could not be prepared.')
    } finally {
      setBusy(false)
    }
  }

  if (error !== null) {
    return (
      <main className="page-shell">
        <LearnerTopbar as="header" showSignOut>
          <Link className="button-link button-link--secondary" to="/dashboard">
            Dashboard
          </Link>
          <Link className="button-link button-link--secondary" to="/courses">
            Catalog
          </Link>
        </LearnerTopbar>
        <p className="form-error">{error}</p>
      </main>
    )
  }

  if (summary === null) {
    return <PasaWisePageLoader label="Preparing the Full Mock Examinationâ€¦" />
  }

  return (
    <main className="page-shell">
      <LearnerTopbar as="header" showSignOut>
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
        <Link className="button-link button-link--secondary" to="/courses">
          Catalog
        </Link>
      </LearnerTopbar>

      <section className="dashboard-card assessment-overview">
        <p className="eyebrow">{summary.examination.simulationLabel}</p>
        <h1>{summary.examination.title}</h1>
        <p>{summary.examination.description}</p>
        <div className="assessment-facts">
          <span>150 scored questions</span>
          <span>Four subject areas</span>
          <span>Timed: 190 minutes</span>
          <span>Pass: 120/150 (80%)</span>
        </div>
        <p>{summary.notice}</p>
        <p>
          Unanswered questions score zero. Progress saves automatically. A timed
          clock continues if you leave. Submission is final. No calculator is
          provided or required by this platform simulation.
        </p>
        <button className="button-secondary" type="button" onClick={() => setShowEdq((v) => !v)}>
          {showEdq ? 'Hide optional EDQ' : 'Try optional EDQ practice'}
        </button>
        {showEdq && <Edq />}
        <div className="quiz-step-row">
          <button disabled={busy} onClick={() => void begin('timed')}>
            Start Timed Mock
          </button>
          <button disabled={busy} onClick={() => void begin('untimed')}>
            Start Untimed Practice
          </button>
        </div>
      </section>

      <section className="dashboard-card">
        <h2>Attempt history</h2>
        {summary.history.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          summary.history.map((raw) => {
            const item = raw as {
              public_id: string
              attempt_number: number
              mode: string
              score_percent: number | null
              passed: number | null
              status: string
            }
            return (
              <article className="assessment-history" key={item.public_id}>
                <strong>
                  Attempt {item.attempt_number} · {item.mode}
                </strong>
                <span>
                  {item.score_percent ?? '—'}% · {item.passed === 1 ? 'Passed' : item.status === 'instructions' || item.status === 'in_progress' ? 'Active' : 'Needs improvement'}
                </span>
                {item.score_percent !== null && (
                  <Link to={`/mock-exam-attempts/${item.public_id}/results`}>Results</Link>
                )}
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}

function Edq() {
  return (
    <section className="message-card">
      <h2>Optional, nonpersistent EDQ practice</h2>
      <p>These safe practice selections stay only on this page and never affect your score.</p>
      <label>
        Age bracket
        <select defaultValue="">
          <option value="">Prefer not to answer</option>
          <option>18·24</option>
          <option>25·34</option>
          <option>35 or older</option>
        </select>
      </label>
      <label>
        Exam experience
        <select defaultValue="">
          <option value="">Prefer not to answer</option>
          <option>First-time examinee</option>
          <option>Repeat examinee</option>
        </select>
      </label>
      <label>
        Study method
        <select defaultValue="">
          <option value="">Prefer not to answer</option>
          <option>Self-study</option>
          <option>Review course</option>
          <option>Study group</option>
        </select>
      </label>
      <p className="meta-copy">You may skip this step at any time.</p>
    </section>
  )
}
