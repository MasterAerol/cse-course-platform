import { useMemo, type ReactElement } from 'react'

import { type MockQuestion } from '../lib/mock-exam-api'

const QUESTIONS_PER_RANGE = 25

type MockQuestionState = Pick<
  MockQuestion,
  'publicId' | 'position' | 'selectedChoicePublicId' | 'markedForReview'
>

interface QuestionRangeNavigatorQuestion {
  publicId: string
  position: number
  answered: boolean
  marked: boolean
}

interface RangeState {
  index: number
  start: number
  end: number
  questions: QuestionRangeNavigatorQuestion[]
}

interface QuestionRangeNavigatorProps {
  totalQuestions: number
  questions: MockQuestionState[]
  currentIndex: number
  expandedRangeIndex: number
  onRangeExpand: (rangeIndex: number) => void
  onQuestionSelect: (index: number) => void
  navigatorIdPrefix: string
}

function mapQuestion(question: MockQuestionState): QuestionRangeNavigatorQuestion {
  return {
    publicId: question.publicId,
    position: question.position,
    answered: question.selectedChoicePublicId !== null,
    marked: question.markedForReview,
  }
}

function makeQuestionLabel({
  answered,
  marked,
  current,
  position,
}: {
  answered: boolean
  marked: boolean
  current: boolean
  position: number
}): string {
  const states: string[] = []
  if (current) states.push('current')
  states.push(answered ? 'answered' : 'unanswered')
  if (marked) states.push('marked for review')

  return `Question ${position}, ${states.join(', ')}`
}

function makeSmallStatus(answered: boolean, marked: boolean): string {
  if (answered && marked) {
    return 'Answered · Marked'
  }

  if (answered) {
    return 'Answered'
  }

  if (marked) {
    return 'Unanswered · Marked'
  }

  return 'Unanswered'
}

export function QuestionRangeNavigator({
  totalQuestions,
  questions,
  currentIndex,
  expandedRangeIndex,
  onRangeExpand,
  onQuestionSelect,
  navigatorIdPrefix,
}: QuestionRangeNavigatorProps): ReactElement {
  const mappedQuestions = useMemo(() => questions.map(mapQuestion), [questions])

  const rangeCount = Math.max(1, Math.ceil(totalQuestions / QUESTIONS_PER_RANGE))
  const ranges = useMemo(
    () =>
      Array.from({ length: rangeCount }, (_, index): RangeState => {
        const start = index * QUESTIONS_PER_RANGE + 1
        const end = Math.min((index + 1) * QUESTIONS_PER_RANGE, totalQuestions)
        const rangeQuestions = mappedQuestions.filter(
          (question) => question.position >= start && question.position <= end,
        )

        return { index, start, end, questions: rangeQuestions }
      }),
    [mappedQuestions, rangeCount, totalQuestions],
  )

  return (
    <nav className="question-range-navigator" aria-label="Question navigator">
      {ranges.map((range) => {
        const isExpanded = range.index === expandedRangeIndex
        const panelId = `question-range-${range.start}`
        const headingId = `${navigatorIdPrefix}-heading-${range.index}`
        const answeredCount = range.questions.filter((q) => q.answered).length
        const unansweredCount = range.questions.length - answeredCount
        const markedCount = range.questions.filter((q) => q.marked).length

        return (
          <section className="question-range" key={range.index}>
            <button
              type="button"
              className="question-range__header"
              id={headingId}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={() => onRangeExpand(range.index)}
            >
              <span className="question-range__title">
                Questions {range.start}-{range.end}
              </span>
              <span className="question-range__meta">
                <span className="question-range__meta-chip">Answered {answeredCount}</span>
                <span className="question-range__meta-chip">Unanswered {unansweredCount}</span>
                <span className="question-range__meta-chip">Marked {markedCount}</span>
              </span>
              <span
                className="question-range__chevron"
                aria-hidden="true"
                data-state={isExpanded ? 'open' : 'closed'}
              />
            </button>

            {isExpanded && (
              <div
                id={panelId}
                className="question-range__content"
                role="region"
                aria-labelledby={headingId}
              >
                <div className="question-range__grid">
                  {range.questions.map((question, offset) => {
                    const isCurrent = question.position - 1 === currentIndex
                    const label = makeQuestionLabel({
                      answered: question.answered,
                      marked: question.marked,
                      current: isCurrent,
                      position: question.position,
                    })

                    return (
                      <button
                        key={question.publicId}
                        type="button"
                        className={`question-range-button ${
                          isCurrent ? 'question-range-button--current' : ''
                        } ${question.answered ? 'question-range-button--answered' : ''} ${
                          question.marked ? 'question-range-button--marked' : ''
                        }`}
                        aria-label={label}
                        aria-current={isCurrent ? 'step' : undefined}
                        data-question-index={question.position - 1}
                        data-order={range.index * QUESTIONS_PER_RANGE + offset + 1}
                        onClick={() => onQuestionSelect(question.position - 1)}
                      >
                        <span>{question.position}</span>
                        <small>{makeSmallStatus(question.answered, question.marked)}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </nav>
  )
}
