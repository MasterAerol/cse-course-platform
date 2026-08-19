import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import {
  createMockAttempt,
  fetchMockSummary,
  type MockExamSummary,
} from '../lib/mock-exam-api'
import {
  formatMockExamDescription,
  formatMockExamSimulationLabel,
} from '../lib/mock-exam-presentation'

interface MockHistoryItem {
  public_id: string
  attempt_number: number
  mode: string
  status: string
  earned_points: number | null
  total_points: number | null
  score_percent: number | null
  passed: number | null
  created_at: string
  submitted_at: string | null
}

function MockExamTopbar() {
  return (
    <LearnerTopbar
      as="header"
      mobileCollapsible
      showSignOut
      ariaLabel="Main navigation"
    >
      <Link className="button-link button-link--secondary" to="/dashboard">
        Dashboard
      </Link>
      <Link className="button-link button-link--secondary" to="/courses">
        Courses
      </Link>
      <Link className="button-link button-link--secondary" to="/readiness">
        Readiness
      </Link>
    </LearnerTopbar>
  )
}

function formatAttemptDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatMode(mode: string): string {
  return mode === 'timed' ? 'Timed Simulation' : 'Untimed Practice'
}

function isActiveStatus(status: string): boolean {
  return status === 'instructions' || status === 'in_progress'
}

export function MockExamPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<MockExamSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showEdq, setShowEdq] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchMockSummary(controller.signal)
      .then(setSummary)
      .catch((value: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            value instanceof Error ? value.message : 'Mock could not be loaded.',
          )
        }
      })
    return () => controller.abort()
  }, [])

  async function begin(mode: 'timed' | 'untimed'): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const data = await createMockAttempt(mode)
      await navigate(`/mock-exam-attempts/${data.attempt.publicId}`)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Attempt could not be prepared.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (error !== null && summary === null) {
    return (
      <main className="page-shell mock-exam-overview-page">
        <MockExamTopbar />
        <p className="form-error" role="alert">
          {error}
        </p>
      </main>
    )
  }

  if (summary === null) {
    return <PasaWisePageLoader label="Preparing the Full Mock Examination…" />
  }

  const activeAttempt = summary.activeAttempt as unknown as
    | MockHistoryItem
    | null
  const history = summary.history as unknown as MockHistoryItem[]
  const hasPerformanceSummary =
    summary.attemptCount > 0 &&
    summary.latestScore !== null &&
    summary.bestScore !== null

  return (
    <main className="page-shell mock-exam-overview-page">
      <MockExamTopbar />

      <section
        className="mock-overview-hero"
        aria-labelledby="mock-overview-title"
      >
        <div className="mock-overview-hero__content">
          <p className="eyebrow">
            {formatMockExamSimulationLabel(summary.examination.simulationLabel)}
          </p>
          <h1 id="mock-overview-title">{summary.examination.title}</h1>
          <p className="mock-overview-hero__description">
            {formatMockExamDescription(summary.examination.description)}
          </p>
          <div className="mock-overview-facts" aria-label="Full Mock details">
            <span>{summary.examination.questionCount} scored questions</span>
            <span>{summary.examination.timedDurationMinutes} minutes</span>
            <span>
              Pass {summary.examination.passingTarget}/
              {summary.examination.questionCount} (
              {summary.examination.passingScore}%)
            </span>
            <span>Full exam simulation</span>
          </div>
          <p className="mock-overview-rule">
            Unanswered questions score zero. Answers save automatically, the
            timed clock continues if you leave, and submission is final.
          </p>
          <div className="mock-overview-actions">
            {activeAttempt !== null ? (
              <Link
                className="button-link"
                to={`/mock-exam-attempts/${activeAttempt.public_id}`}
              >
                Continue Full Mock
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void begin('timed')}
                >
                  {busy
                    ? 'Preparing…'
                    : summary.attemptCount > 0
                      ? 'Retake Timed Mock'
                      : 'Start Timed Mock'}
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void begin('untimed')}
                >
                  Start Untimed Practice
                </button>
              </>
            )}
          </div>
          {error !== null ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {hasPerformanceSummary ? (
          <aside
            className="mock-overview-performance"
            aria-labelledby="mock-overview-performance-title"
          >
            <h2 id="mock-overview-performance-title">Your performance</h2>
            <dl>
              <div>
                <dt>Latest score</dt>
                <dd>{summary.latestScore}%</dd>
              </div>
              <div className="mock-overview-performance__best">
                <dt>Best score</dt>
                <dd>{summary.bestScore}%</dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{summary.attemptCount}</dd>
              </div>
            </dl>
          </aside>
        ) : (
          <aside className="mock-overview-readiness" aria-label="Before you begin">
            <p className="eyebrow">Before you begin</p>
            <h2>Set aside focused exam time</h2>
            <p>
              Choose the timed simulation for the closest exam experience, or
              use untimed practice when you are still building endurance.
            </p>
          </aside>
        )}
      </section>

      <p className="mock-overview-notice">{summary.notice}</p>

      <MockAttemptHistory history={history} />

      <section className="mock-edq-section" aria-labelledby="mock-edq-heading">
        <div>
          <p className="eyebrow">Optional preparation</p>
          <h2 id="mock-edq-heading">Exam-day questionnaire practice</h2>
          <p>
            These selections stay only on this page and never affect your mock
            score or saved progress.
          </p>
        </div>
        <button
          className="button-secondary"
          type="button"
          aria-expanded={showEdq}
          onClick={() => setShowEdq((visible) => !visible)}
        >
          {showEdq ? 'Hide optional EDQ' : 'Try optional EDQ practice'}
        </button>
        {showEdq ? <Edq /> : null}
      </section>
    </main>
  )
}

function MockAttemptHistory({ history }: { history: MockHistoryItem[] }) {
  return (
    <section
      className="mock-history-section"
      aria-labelledby="mock-history-heading"
    >
      <div className="mock-history-section__heading">
        <div>
          <p className="eyebrow">Full Mock</p>
          <h2 id="mock-history-heading">Attempt history</h2>
          <p>Review completed simulations or continue an unfinished attempt.</p>
        </div>
        <span>
          {history.length} {history.length === 1 ? 'attempt' : 'attempts'}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="mock-history-empty">
          <h3>No mock attempts yet</h3>
          <p>Your completed Full Mock results will appear here.</p>
        </div>
      ) : (
        <div className="mock-history-list">
          {history.map((item) => {
            const active = isActiveStatus(item.status)
            const status = active
              ? 'In Progress'
              : item.passed === 1
                ? 'Passed'
                : 'Needs Improvement'
            const date = item.submitted_at ?? item.created_at

            return (
              <article key={item.public_id}>
                <div className="mock-history-identity">
                  <p className="eyebrow">{formatMode(item.mode)}</p>
                  <h3>Attempt {item.attempt_number}</h3>
                  <time dateTime={date}>{formatAttemptDate(date)}</time>
                </div>
                <div className="mock-history-score">
                  <span>Score</span>
                  <strong>
                    {item.earned_points === null || item.total_points === null
                      ? '—'
                      : `${item.earned_points} / ${item.total_points}`}
                  </strong>
                  <small>
                    {item.score_percent === null
                      ? 'Not submitted'
                      : `${item.score_percent}%`}
                  </small>
                </div>
                <span
                  className={`mock-status mock-status--${active ? 'progress' : item.passed === 1 ? 'passed' : 'improvement'}`}
                >
                  {status}
                </span>
                <Link
                  className="button-link button-link--secondary"
                  to={
                    active
                      ? `/mock-exam-attempts/${item.public_id}`
                      : `/mock-exam-attempts/${item.public_id}/results`
                  }
                >
                  {active ? 'Continue' : 'View Result'}
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Edq() {
  return (
    <section className="message-card mock-edq-form">
      <h3>Optional, nonpersistent EDQ practice</h3>
      <p>
        These safe practice selections stay only on this page and never affect
        your score.
      </p>
      <label>
        Age bracket
        <select defaultValue="">
          <option value="">Prefer not to answer</option>
          <option>18–24</option>
          <option>25–34</option>
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
