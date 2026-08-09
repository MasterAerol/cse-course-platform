import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
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
import { LearnerTopbar } from '../components/LearnerTopbar'
import { QuestionRangeNavigator } from '../components/QuestionRangeNavigator'

const QUESTIONS_PER_RANGE = 25
const QUESTION_NAVIGATOR_ID = 'mock-question-navigator'
const DRAWER_TRANSITION_MS = 220
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

function QuestionStatusChips(summary: {
  answered: number
  unanswered: number
  marked: number
}): ReactElement {
  return (
    <div
      className="question-status-chips"
      role="status"
      aria-live="polite"
      aria-label={`Answered ${summary.answered}, Unanswered ${summary.unanswered}, Marked ${summary.marked}`}
    >
      <span className="question-status-chip">Answered {summary.answered}</span>
      <span className="question-status-chip">Unanswered {summary.unanswered}</span>
      <span className="question-status-chip">Marked {summary.marked}</span>
    </div>
  )
}

function normalizeTextWithPeso(value: string): string {
  return value
    .replace(/\uFFFD/g, '\u20B1')
    .replace(/\u00A0/g, ' ')
}

function ReviewFlagIcon({ marked }: { marked: boolean }): ReactElement {
  return (
    <svg
      className="mock-attempt-review-icon"
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 3v17.2l5.2-2.6 5.2 2.6V3H6z"
        fill={marked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
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
  const scrollContainer = root.querySelector<HTMLElement>(
    '.question-navigator-drawer__content',
  )
  if (scrollContainer === null) {
    currentButton.scrollIntoView({
      block: 'center',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
    return
  }

  const containerRect = scrollContainer.getBoundingClientRect()
  const buttonRect = currentButton.getBoundingClientRect()
  const offset = buttonRect.top - containerRect.top

  scrollContainer.scrollTo({
    top: scrollContainer.scrollTop + offset - containerRect.height * 0.22,
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
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'failed'
  >('saved')
  const [reviewing, setReviewing] = useState(false)
  const [summary, setSummary] = useState<
    Awaited<ReturnType<typeof fetchSubmissionReview>> | null
  >(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false)
  const [isNavigatorMounted, setIsNavigatorMounted] = useState(false)
  const [manualExpandedRangeIndex, setManualExpandedRangeIndex] = useState<number | null>(
    null,
  )

  const topbar = (
    <LearnerTopbar showSignOut>
      <Link className="button-link button-link--secondary" to="/dashboard">
        Dashboard
      </Link>
      <Link className="button-link button-link--secondary" to="/catalog">
        Catalog
      </Link>
      <Link className="button-link button-link--secondary" to="/smart-recovery">
        Smart Recovery
      </Link>
    </LearnerTopbar>
  )

  const submitting = useRef(false)
  const drawerRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const navigatorCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (isNavigatorOpen) {
      if (navigatorCloseTimeoutRef.current !== null) {
        clearTimeout(navigatorCloseTimeoutRef.current)
        navigatorCloseTimeoutRef.current = null
      }
      return
    }

    if (!isNavigatorMounted) {
      return
    }

    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : DRAWER_TRANSITION_MS

    navigatorCloseTimeoutRef.current = setTimeout(() => {
      setIsNavigatorMounted(false)
    }, delay)

    return () => {
      if (navigatorCloseTimeoutRef.current !== null) {
        clearTimeout(navigatorCloseTimeoutRef.current)
        navigatorCloseTimeoutRef.current = null
      }
    }
  }, [isNavigatorOpen, isNavigatorMounted])

  useEffect(() => {
    if (!isNavigatorOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [isNavigatorOpen])

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

  useEffect(() => () => {
    if (navigatorCloseTimeoutRef.current !== null) {
      clearTimeout(navigatorCloseTimeoutRef.current)
    }
  }, [])

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

    const previous = data
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
      setData(previous)
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

  const closeQuestionNavigator = (): void => {
    setIsNavigatorOpen(false)
    triggerRef.current?.focus()
  }

  const openQuestionNavigator = useCallback((): void => {
    setManualExpandedRangeIndex(null)
    setIsNavigatorMounted(true)
    setIsNavigatorOpen(true)
  }, [])

  const handleQuestionSelect = (questionIndex: number): void => {
    navigateToQuestion(questionIndex)
    if (isNavigatorOpen) {
      closeQuestionNavigator()
    }
  }

  if (error !== null && data === null) {
    return (
      <main className="page-shell">
        {topbar}
        <p className="form-error">{error}</p>
      </main>
    )
  }

  if (data === null) {
    return (
      <main className="page-shell">
        {topbar}
        <p>Preparing your immutable 150-question snapshot...</p>
      </main>
    )
  }

  if (data.attempt.status === 'instructions') {
    return (
      <main className="page-shell">
        {topbar}
        <section className="dashboard-card">
          <p className="eyebrow">
            {getModeLabel(data.attempt.mode)}
            {'\u00B7'}
            Attempt {data.attempt.attemptNumber}
          </p>
          <h1 className="mock-attempt-title">Full CSE Professional Mock Examination</h1>
          <ul>
            <li>150 scored questions across four subject areas</li>
            <li>
              {data.attempt.mode === 'timed'
                ? '190 minutes; the clock continues if you leave'
                : 'Untimed Practice; no deadline'
              }
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
        {topbar}
        <p className="form-error">The stored attempt is incomplete.</p>
      </main>
    )
  }

  if (reviewing && summary !== null) {
    return (
      <main className="page-shell">
        {topbar}
        <section className="dashboard-card">
          <h1>Review before submission</h1>
          {QuestionStatusChips({
            answered: summary.answeredCount,
            unanswered: summary.unansweredCount,
            marked: summary.markedForReviewCount,
          })}
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
      ? 'Saving...'
      : saveState === 'failed'
        ? 'Save failed'
        : 'Saved'
  const unansweredCount = data.totalCount - data.answeredCount

  return (
    <main className="page-shell quiz-page mock-attempt-page">
      <div className="mock-exam-page">
        {topbar}
        <header className="mock-exam-header">
          <div>
            <h1 className="mock-attempt-title">Full CSE Professional Mock Examination</h1>
            <div className="mock-attempt-badges">
              <span className="badge badge--muted">{getModeLabel(data.attempt.mode)}</span>
              <span className="badge badge--muted">
                Attempt {data.attempt.attemptNumber}
              </span>
              <span className="badge badge--muted">
                Passing Score: {data.examination.passingScore}%
              </span>
            </div>
          </div>
          <p className="meta-copy mock-attempt-timer" aria-live="polite">
            {data.attempt.mode === 'timed'
              ? `Time remaining: ${formatTime(remaining)}`
              : 'Untimed Practice'}
          </p>
        </header>

        <main className="mock-exam-workspace">
          <button
            type="button"
            className="question-drawer-trigger"
            ref={triggerRef}
            aria-controls={QUESTION_NAVIGATOR_ID}
            aria-expanded={isNavigatorOpen}
            aria-label="Open question navigator"
            onClick={openQuestionNavigator}
          >
            <span className="question-drawer-trigger__label">
              <span className="question-drawer-trigger__icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="question-drawer-trigger__text">
                Questions {index + 1} / {data.totalCount}
              </span>
            </span>
          </button>

          {isNavigatorMounted ? (
            <>
              <button
                aria-label="Close question navigator backdrop"
                className={`drawer-backdrop ${isNavigatorOpen ? 'is-open' : ''}`}
                type="button"
                onClick={closeQuestionNavigator}
                tabIndex={isNavigatorOpen ? 0 : -1}
              />
              <aside
                id={QUESTION_NAVIGATOR_ID}
                className={`question-navigator-drawer ${
                  isNavigatorOpen ? 'is-open' : ''
                }`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${QUESTION_NAVIGATOR_ID}-title`}
                aria-hidden={!isNavigatorOpen}
                ref={drawerRef}
                tabIndex={-1}
              >
                <header className="drawer-header">
                  <h2 id={`${QUESTION_NAVIGATOR_ID}-title`}>Question Navigator</h2>
                  <button
                    type="button"
                    className="question-drawer-close button-secondary"
                    onClick={closeQuestionNavigator}
                    aria-label="Close question navigator"
                  >
                    <span className="question-drawer-close__icon" aria-hidden="true">
                      <span />
                      <span />
                    </span>
                    <span className="sr-only">Close</span>
                  </button>
                </header>

                <div className="question-navigator-drawer__content">
                  <div className="question-navigator">
                    <header className="question-navigator__header">
                      {QuestionStatusChips({
                        answered: data.answeredCount,
                        unanswered: unansweredCount,
                        marked: data.markedForReviewCount,
                      })}
                    </header>
                    <div className="question-navigator__body">
                      <div className="question-navigator__ranges">
                        <QuestionRangeNavigator
                          totalQuestions={data.totalCount}
                          questions={data.questions}
                          currentIndex={index}
                          expandedRangeIndex={expandedRangeIndex}
                          onRangeExpand={handleRangeExpand}
                          onQuestionSelect={handleQuestionSelect}
                          navigatorIdPrefix="mock-question-range-drawer"
                        />
                      </div>
                      <div className="question-navigator__legend">
                        {getNavigatorLegend()}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </>
          ) : null}
          <div className="mock-attempt-desktop-layout">
            <div className="question-range-nav-desktop question-navigator" aria-live="polite">
              <header className="question-navigator__header">
                <span className="sr-only">Question Navigator</span>
              </header>
              <div className="question-navigator__body">
                <div className="question-navigator__ranges">
                  <QuestionRangeNavigator
                    totalQuestions={data.totalCount}
                    questions={data.questions}
                    currentIndex={index}
                    expandedRangeIndex={expandedRangeIndex}
                    onRangeExpand={handleRangeExpand}
                    onQuestionSelect={handleQuestionSelect}
                    navigatorIdPrefix="mock-question-range-inline"
                  />
                </div>
                <div className="question-navigator__legend">
                  {getNavigatorLegend()}
                </div>
              </div>
            </div>

            <section className="quiz-attempt-card">
              {QuestionStatusChips({
                answered: data.answeredCount,
                unanswered: unansweredCount,
                marked: data.markedForReviewCount,
              })}

              <article className="mock-attempt-question-card">
                <header className="mock-attempt-question-header">
                  <p className="mock-attempt-question-label">QUESTION {q.position}</p>
                  <button
                    type="button"
                    className="mock-attempt-review-control"
                    onClick={() => void mark(q.publicId, !q.markedForReview)}
                    aria-pressed={q.markedForReview}
                    aria-label={
                      q.markedForReview
                        ? `Remove question ${q.position} from review`
                        : `Mark question ${q.position} for review`
                    }
                  >
                    <ReviewFlagIcon marked={q.markedForReview} />
                    <span>{q.markedForReview ? 'Marked' : 'Review'}</span>
                  </button>
                </header>

                <p className="mock-attempt-question-prompt">
                  {normalizeTextWithPeso(q.prompt)}
                </p>

                <div className="quiz-choice-list">
                  {q.choices.map((choice) => (
                    <label className="quiz-choice" key={choice.publicId}>
                      <input
                        type="radio"
                        name={q.publicId}
                        checked={q.selectedChoicePublicId === choice.publicId}
                        onChange={() => void choose(q.publicId, choice.publicId)}
                      />
                      <span>{normalizeTextWithPeso(choice.text)}</span>
                    </label>
                  ))}
                </div>

                <p className="sr-only" aria-live="polite">
                  {getQuestionButtonLabel(q, index === q.position - 1)}
                </p>
              </article>

              <div className="mock-navigation">
                <div className="mock-navigation__buttons">
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={index === 0}
                    onClick={() => navigateToQuestion(Math.max(0, index - 1))}
                  >
                    Previous
                  </button>

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

                <p className="mock-navigation__save-status" aria-live="polite">
                  {saveStatus}
                </p>

                <div className="mock-navigation__submit">
                  <button type="button" onClick={() => void openReview()}>
                    Review & Submit Examination
                  </button>
                </div>
              </div>

              {error !== null ? <p className="form-error">{error}</p> : null}
            </section>
          </div>
        </main>
      </div>
    </main>
  )
}