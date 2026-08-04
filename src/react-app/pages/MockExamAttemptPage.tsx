import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  fetchMockAttempt,
  fetchSubmissionReview,
  saveMockChoice,
  saveMockReviewFlag,
  startMockProper,
  submitMock,
  type MockAttempt,
  type MockQuestion,
} from '../lib/mock-exam-api'
import { mockExamDistributionNotice } from '../../shared/mock-exam-copy'
import { QuestionRangeNavigator } from '../components/QuestionRangeNavigator'

const QUESTIONS_PER_RANGE = 25
const QUESTION_NAVIGATOR_ID = 'mock-question-navigator'
const DRAWER_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function formatTime(seconds: number | null): string {
  if (seconds === null) {
    return 'Loading...'
  }

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getModeLabel(mode: 'timed' | 'untimed' | undefined): string {
  return mode === 'timed' ? 'Timed Simulation' : 'Untimed Practice'
}

function getNavigatorStatusLabel(summary: {
  answered: number
  unanswered: number
  marked: number
}): string {
  return `Answered ${summary.answered} · Unanswered ${summary.unanswered} · Marked ${summary.marked}`
}

function getQuestionButtonLabel(question: MockQuestion, current: boolean): string {
  const status = [
    current ? 'current' : null,
    question.selectedChoicePublicId === null ? 'unanswered' : 'answered',
    question.markedForReview ? 'marked for review' : null,
  ]
    .filter(Boolean)
    .join(', ')

  return `Question ${question.position}, ${status}`
}

function focusFirstQuestionInDrawer(
  root: HTMLElement | null,
  questionIndex: number,
  reducedMotion: boolean,
): void {
  if (root === null) {
    return
  }

  const currentButton = root.querySelector<HTMLElement>(
    `[data-question-index="${questionIndex}"]`,
  )

  if (currentButton === null) {
    const firstQuestion = root.querySelector<HTMLElement>('[data-question-index]')
    if (firstQuestion !== null) {
      firstQuestion.focus()
    }
    return
  }

  currentButton.focus({ preventScroll: true })
  currentButton.scrollIntoView({
    block: 'center',
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
}

function getNavigatorLegend() {
  return (
    <div
      className="question-navigator-legend"
      aria-label="Question status legend"
    >
      <span>
        <i className="question-navigator-legend__swatch question-range-button--current" />
        Current
      </span>
      <span>
        <i className="question-navigator-legend__swatch question-range-button--answered" />
        Answered
      </span>
      <span>
        <i className="question-navigator-legend__swatch question-range-button--marked" />
        Marked
      </span>
      <span>
        <i className="question-navigator-legend__swatch question-range-button" />
        Unanswered
      </span>
    </div>
  )
}

export function MockExamAttemptPage() {
  const { attemptPublicId = '' } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState<MockAttempt | null>(null)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>(
    'idle',
  )
  const [reviewing, setReviewing] = useState(false)
  const [summary, setSummary] = useState<
    Awaited<ReturnType<typeof fetchSubmissionReview>> | null
  >(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false)
  const [manualExpandedRangeIndex, setManualExpandedRangeIndex] = useState<number | null>(null)

  const submitting = useRef(false)
  const drawerRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const c = new AbortController()

    fetchMockAttempt(attemptPublicId, c.signal)
      .then((value) => {
        if ('resultAvailable' in value) {
          void navigate(`/mock-exam-attempts/${value.attempt.publicId}/results`, {
            replace: true,
          })
        } else {
          setData(value)
        }
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error
            ? e.message
            : 'Attempt could not be restored.',
        )
      })

    return () => c.abort()
  }, [attemptPublicId, navigate])

  useEffect(() => {
    if (
      data?.attempt.mode !== 'timed' ||
      data.attempt.deadlineAt == null ||
      data.attempt.serverNow === undefined
    ) {
      return
    }

    const offset = Date.parse(data.attempt.serverNow) - Date.now()

    const tick = () => {
      const value = Math.max(
        0,
        Math.floor(
          (Date.parse(data.attempt.deadlineAt ?? '') - (Date.now() + offset)) /
            1000,
        ),
      )
      setRemaining(value)

      if (value === 0 && !submitting.current) {
        submitting.current = true
        submitMock(attemptPublicId)
          .then(() =>
            navigate(`/mock-exam-attempts/${attemptPublicId}/results`, {
              replace: true,
            }),
          )
          .catch(() => {
            submitting.current = false
          })
      }
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [data, attemptPublicId, navigate])

  const currentRangeIndex = data === null ? 0 : Math.floor(index / QUESTIONS_PER_RANGE)
  const maxRangeIndex =
    data === null
      ? 0
      : Math.max(1, Math.ceil(data.totalCount / QUESTIONS_PER_RANGE)) - 1
  const expandedRangeIndex = Math.max(
    0,
    Math.min(manualExpandedRangeIndex ?? currentRangeIndex, maxRangeIndex),
  )

  useEffect(() => {
    if (!isNavigatorOpen || data === null || drawerRef.current === null) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const handleFocusInDrawer = (): void => {
      focusFirstQuestionInDrawer(
        drawerRef.current,
        index,
        prefersReducedMotion,
      )
    }

    requestAnimationFrame(handleFocusInDrawer)

    const getFocusableElements = (): HTMLElement[] =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          DRAWER_FOCUSABLE_SELECTOR,
        ) ?? [],
      ).filter((element) => !element.hasAttribute('disabled'))

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsNavigatorOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (first === undefined || last === undefined) {
        return
      }

      const activeElement = document.activeElement as HTMLElement | null

      if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [data, index, isNavigatorOpen])

  async function start(): Promise<void> {
    try {
      setData(await startMockProper(attemptPublicId))
    } catch {
      setError('Test proper could not start.')
    }
  }

  async function choose(questionId: string, choiceId: string): Promise<void> {
    if (data === null) {
      return
    }

    const previous = data
    const questions = data.questions.map((question) =>
      question.publicId === questionId
        ? { ...question, selectedChoicePublicId: choiceId }
        : question,
    )

    setData({
      ...data,
      questions,
      answeredCount: questions.filter((question) => question.selectedChoicePublicId !== null)
        .length,
    })
    setSaveState('saving')

    try {
      await saveMockChoice(attemptPublicId, questionId, choiceId)
      setSaveState('saved')
    } catch (e) {
      setData(previous)
      setSaveState('failed')
      setError(e instanceof Error ? e.message : 'Save failed.')
    }
  }

  async function mark(questionId: string, value: boolean): Promise<void> {
    if (data === null) {
      return
    }

    setData({
      ...data,
      questions: data.questions.map((question) =>
        question.publicId === questionId
          ? { ...question, markedForReview: value }
          : question,
      ),
      markedForReviewCount:
        data.markedForReviewCount + (value ? 1 : -1),
    })

    try {
      await saveMockReviewFlag(attemptPublicId, questionId, value)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review flag could not be saved.')
    }
  }

  async function openReview(): Promise<void> {
    try {
      setSummary(await fetchSubmissionReview(attemptPublicId))
      setReviewing(true)
    } catch {
      setError('Summary could not be loaded.')
    }
  }

  async function finish(): Promise<void> {
    if (submitting.current) {
      return
    }

    submitting.current = true
    try {
      await submitMock(attemptPublicId)
      await navigate(`/mock-exam-attempts/${attemptPublicId}/results`, {
        replace: true,
      })
    } catch {
      submitting.current = false
      setError('Submission failed.')
    }
  }

  const handleRangeExpand = useCallback((rangeIndex: number): void => {
    setManualExpandedRangeIndex(rangeIndex)
  }, [])

  const navigateToQuestion = useCallback((questionIndex: number): void => {
    setManualExpandedRangeIndex(null)
    setIndex(questionIndex)
  }, [])

  const handleQuestionSelect = useCallback((questionIndex: number): void => {
    navigateToQuestion(questionIndex)
    if (isNavigatorOpen) {
      setIsNavigatorOpen(false)
      triggerRef.current?.focus()
    }
  }, [isNavigatorOpen, navigateToQuestion])

  const openQuestionNavigator = useCallback((): void => {
    setIsNavigatorOpen(true)
  }, [])

  const closeQuestionNavigator = useCallback((): void => {
    setIsNavigatorOpen(false)
    triggerRef.current?.focus()
  }, [])

  if (error !== null && data === null) {
    return (
      <main className="page-shell">
        <p className="form-error">{error}</p>
      </main>
    )
  }

  if (data === null) {
    return (
      <main className="page-shell">
        <p>Preparing your immutable 150-question snapshot…</p>
      </main>
    )
  }

  if (data.attempt.status === 'instructions') {
    return (
      <main className="page-shell">
        <Link to="/dashboard">? Dashboard</Link>
        <section className="dashboard-card">
          <p className="eyebrow">
            {getModeLabel(data.attempt.mode)}
            {' · '}
            Attempt {data.attempt.attemptNumber}
          </p>
          <h1>{data.examination.title}</h1>
          <ul>
            <li>150 scored questions across four subject areas</li>
            <li>
              {data.attempt.mode === 'timed'
                ? '190 minutes; the clock continues if you leave'
                : 'Untimed practice; no deadline'}
            </li>
            <li>Unanswered questions score zero</li>
            <li>Answers autosave; submission is final</li>
            <li>{mockExamDistributionNotice}</li>
          </ul>
          <button type="button" onClick={() => void start()}>
            Start Test Proper
          </button>
        </section>
      </main>
    )
  }

  const q = data.questions[index]
  if (q === undefined) {
    return (
      <main className="page-shell">
        <p className="form-error">The stored attempt is incomplete.</p>
      </main>
    )
  }

  if (reviewing && summary !== null) {
    return (
      <main className="page-shell">
        <section className="dashboard-card">
          <h1>Review before submission</h1>
          <p>
            {getNavigatorStatusLabel({
              answered: summary.answeredCount,
              unanswered: summary.unansweredCount,
              marked: summary.markedForReviewCount,
            })}
          </p>
          <p>
            Unanswered:{' '}
            {summary.unansweredQuestionNumbers.join(', ') || 'None'}
          </p>
          <p>Marked: {summary.markedQuestionNumbers.join(', ') || 'None'}</p>
          <div className="assessment-facts">
            {summary.subjectAllocation.map((item) => (
              <span key={item.title}>
                {item.title}: {item.count}
              </span>
            ))}
          </div>
          <div className="quiz-step-row">
            <button
              className="button-secondary"
              type="button"
              onClick={() => setReviewing(false)}
            >
              Return to Question
            </button>
            <button type="button" onClick={() => void finish()}>
              Submit Examination
            </button>
          </div>
        </section>
      </main>
    )
  }

  const saveStatus =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'failed'
        ? 'Save failed'
        : saveState === 'saved'
          ? 'Saved'
          : 'Autosave ready'
  const unansweredCount = data.totalCount - data.answeredCount

  return (
    <main className="page-shell quiz-page">
      <header className="topbar mock-attempt-topbar">
        <div>
          <h1>{data.examination.title}</h1>
          <div className="mock-attempt-badges">
            <span className="badge badge--muted">{getModeLabel(data.attempt.mode)}</span>
            <span className="badge badge--muted">
              Attempt {data.attempt.attemptNumber}
            </span>
            <span className="badge badge--muted">
              Passing score {data.examination.passingScore}%
            </span>
          </div>
        </div>
        <p className="meta-copy mock-attempt-timer" aria-live="polite">
          {data.attempt.mode === 'timed'
            ? `Time: ${formatTime(remaining)}`
            : 'Untimed practice'}
        </p>
      </header>

      <button
        type="button"
        className="question-drawer-trigger"
        ref={triggerRef}
        aria-controls={QUESTION_NAVIGATOR_ID}
        aria-expanded={isNavigatorOpen}
        aria-label="Open question navigator"
        onClick={openQuestionNavigator}
      >
        <span>?</span>
        Questions
        <span>{index + 1} / {data.totalCount}</span>
      </button>

      <div className="question-range-nav-desktop" aria-live="polite">
        <QuestionRangeNavigator
          totalQuestions={data.totalCount}
          questions={data.questions}
          currentIndex={index}
          expandedRangeIndex={expandedRangeIndex}
          onRangeExpand={handleRangeExpand}
          onQuestionSelect={handleQuestionSelect}
          navigatorIdPrefix="mock-question-range-inline"
        />
        {getNavigatorLegend()}
      </div>

      {isNavigatorOpen ? (
        <>
          <button
            aria-label="Close question navigator backdrop"
            className="drawer-backdrop"
            type="button"
            onClick={closeQuestionNavigator}
          />
          <aside
            id={QUESTION_NAVIGATOR_ID}
            className="question-navigator-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${QUESTION_NAVIGATOR_ID}-title`}
            ref={drawerRef}
          >
            <header className="drawer-header">
              <h2 id={`${QUESTION_NAVIGATOR_ID}-title`}>Question Navigator</h2>
              <button
                type="button"
                className="button-secondary"
                onClick={closeQuestionNavigator}
                aria-label="Close question navigator"
              >
                ?
              </button>
            </header>

            <p className="meta-copy" id={`${QUESTION_NAVIGATOR_ID}-status`}>
              {getNavigatorStatusLabel({
                answered: data.answeredCount,
                unanswered: unansweredCount,
                marked: data.markedForReviewCount,
              })}
            </p>

            <QuestionRangeNavigator
              totalQuestions={data.totalCount}
              questions={data.questions}
              currentIndex={index}
              expandedRangeIndex={expandedRangeIndex}
              onRangeExpand={handleRangeExpand}
              onQuestionSelect={handleQuestionSelect}
              navigatorIdPrefix="mock-question-range-drawer"
            />

            {getNavigatorLegend()}
          </aside>
        </>
      ) : null}

      <section className="quiz-attempt-card">
        <p className="eyebrow">Question {q.position}</p>
        <p className="meta-copy">
          Answered {data.answeredCount}/{data.totalCount} · Unanswered {unansweredCount} · Marked {data.markedForReviewCount}
        </p>

        <fieldset className="quiz-question">
          <legend>
            <span>Question {q.position}</span>
            {q.prompt}
          </legend>
          <div className="quiz-choice-list">
            {q.choices.map((choice) => (
              <label className="quiz-choice" key={choice.publicId}>
                <input
                  type="radio"
                  name={q.publicId}
                  checked={q.selectedChoicePublicId === choice.publicId}
                  onChange={() => void choose(q.publicId, choice.publicId)}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </div>
          <label className="question-review-control">
            <input
              type="checkbox"
              checked={q.markedForReview}
              onChange={(event) =>
                void mark(q.publicId, event.currentTarget.checked)
              }
            />
            <span>Mark this question for review</span>
          </label>
          <p className="meta-copy" aria-live="polite">
            {getQuestionButtonLabel(q, index === q.position - 1)}
          </p>
        </fieldset>

        <div className="mock-attempt-step-row">
          <button
            className="button-secondary"
            type="button"
            disabled={index === 0}
            onClick={() => navigateToQuestion(Math.max(0, index - 1))}
          >
            Previous
          </button>

          <p className="meta-copy" aria-live="polite">
            {saveStatus}
          </p>

          <button
            className="button-secondary"
            type="button"
            disabled={index >= data.questions.length - 1}
            onClick={() =>
              navigateToQuestion(Math.min(data.questions.length - 1, index + 1))
            }
          >
            Next
          </button>
        </div>

        <div className="quiz-submit-row">
          <button type="button" onClick={() => void openReview()}>
            Review & Submit Examination
          </button>
        </div>

        {error !== null ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  )
}



