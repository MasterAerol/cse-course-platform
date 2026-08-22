import { useState } from 'react'
import { useLocation } from 'react-router'

import {
  submitFeedback,
  type FeedbackCategory,
} from '../lib/commercial-api'

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  content: 'Content',
  confusing: 'Confusing',
  suggestion: 'Suggestion',
  other: 'Other',
}

export function BetaFeedbackForm() {
  const location = useLocation()
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <section className="account-panel feedback-panel" aria-labelledby="feedback-title">
      <div className="account-panel__heading">
        <p className="eyebrow">Beta feedback</p>
        <h2 id="feedback-title">Report a problem</h2>
      </div>
      <p>Tell the PasaWise team what happened. Your current PasaWise page is included automatically.</p>
      <form
        className="feedback-form"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitting(true)
          setStatus(null)
          void submitFeedback({
            category,
            message,
            pagePath: `${location.pathname}${location.search}`,
          })
            .then(() => {
              setMessage('')
              setStatus('Thank you. Your feedback was sent to the PasaWise team.')
            })
            .catch((error: unknown) => {
              setStatus(
                error instanceof Error
                  ? error.message
                  : 'Feedback could not be submitted.',
              )
            })
            .finally(() => setSubmitting(false))
        }}
      >
        <label>
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Message
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <small>{message.length}/2000 characters</small>
        <button disabled={submitting} type="submit">
          {submitting ? 'Sending…' : 'Send feedback'}
        </button>
      </form>
      {status !== null && <p role="status">{status}</p>}
    </section>
  )
}
