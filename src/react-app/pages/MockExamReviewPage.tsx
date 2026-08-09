import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { LearnerTopbar } from '../components/LearnerTopbar'
import { fetchMockReview } from '../lib/mock-exam-api'

type Review = Awaited<ReturnType<typeof fetchMockReview>>

export function MockExamReviewPage() {
  const { attemptPublicId = '' } = useParams()
  const [data, setData] = useState<Review | null>(null)
  const [subject, setSubject] = useState('all')
  const [state, setState] = useState('all')

  useEffect(() => {
    const c = new AbortController()
    void fetchMockReview(attemptPublicId, c.signal).then(setData).catch(() => undefined)
    return () => c.abort()
  }, [attemptPublicId])

  const filtered =
    useMemo(
      () =>
        data?.questions.filter(
          (q) =>
            (subject === 'all' || q.subject.slug === subject) &&
            (state === 'all' ||
              (state === 'correct' && q.isCorrect) ||
              (state === 'incorrect' && !q.isCorrect && !q.unanswered) ||
              (state === 'unanswered' && q.unanswered) ||
              (state === 'marked' && q.markedForReview)),
        ) ?? [],
      [data, subject, state],
    )

  if (data === null) {
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
        <p>Loading stored answer review…</p>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <LearnerTopbar as="header" showSignOut>
        <Link className="button-link button-link--secondary" to={`/mock-exam-attempts/${attemptPublicId}/results`}>
          ? Results
        </Link>
        <Link className="button-link button-link--secondary" to="/dashboard">
          Dashboard
        </Link>
      </LearnerTopbar>

      <h1>Answer review</h1>
      <div className="quiz-step-row">
        <label>
          Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="all">All subjects</option>
            {data.subjects.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Result
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All</option>
            <option value="correct">Correct</option>
            <option value="incorrect">Incorrect</option>
            <option value="unanswered">Unanswered</option>
            <option value="marked">Marked for review</option>
          </select>
        </label>
      </div>

      {filtered.map((q) => (
        <article className="dashboard-card" key={q.publicId}>
          <p className="eyebrow">
            Question {q.position} · {q.subject.title} · {q.topic.title} · {q.difficulty}
            {q.markedForReview ? ' · Marked' : ''}
          </p>
          <h2>{q.prompt}</h2>
          <ul>
            {q.choices.map((choice) => (
              <li key={choice.publicId}>
                {choice.text}
                {choice.publicId === q.correctChoice.publicId ? ' — Correct answer' : ''}
                {choice.publicId === q.selectedChoice?.publicId ? ' — Your answer' : ''}
              </li>
            ))}
          </ul>
          <p>{q.unanswered ? 'Unanswered' : q.isCorrect ? 'Correct' : 'Incorrect'}</p>
          {q.explanation && <p>{q.explanation}</p>}
          {q.source != null && (
            <p className="meta-copy">
              Source: {typeof q.source === 'string' ? q.source : JSON.stringify(q.source)}
            </p>
          )}
        </article>
      ))}
    </main>
  )
}
