import { describe, expect, it } from 'vitest'

import appSource from '../src/react-app/App.tsx?raw'
import practicePanelSource from '../src/react-app/components/PracticeLessonPanel.tsx?raw'
import quizPanelSource from '../src/react-app/components/QuizLessonPanel.tsx?raw'
import practiceAttemptSource from '../src/react-app/pages/PracticeAttemptPage.tsx?raw'
import practiceResultSource from '../src/react-app/pages/PracticeResultPage.tsx?raw'
import quizAttemptSource from '../src/react-app/pages/QuizAttemptPage.tsx?raw'
import quizResultSource from '../src/react-app/pages/QuizResultPage.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}
const stylesSource = injectedStyles

function cssRuleBodies(source: string, selector: string): string[] {
  const sourceWithoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '')
  return Array.from(sourceWithoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/gs))
    .filter((match) =>
      (match[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .includes(selector),
    )
    .map((match) => match[2] ?? '')
}

function hasRule(selector: string, declarations: RegExp[]): boolean {
  return cssRuleBodies(stylesSource, selector).some((body) =>
    declarations.every((declaration) => declaration.test(body)),
  )
}

function atRuleBodies(source: string, marker: string): string[] {
  const bodies: string[] = []
  let markerIndex = source.indexOf(marker)

  while (markerIndex >= 0) {
    const openingBrace = source.indexOf('{', markerIndex + marker.length)
    if (openingBrace < 0) break

    let depth = 1
    let position = openingBrace + 1
    while (position < source.length && depth > 0) {
      if (source[position] === '{') depth += 1
      if (source[position] === '}') depth -= 1
      position += 1
    }

    if (depth === 0) bodies.push(source.slice(openingBrace + 1, position - 1))
    markerIndex = source.indexOf(marker, position)
  }

  return bodies
}

describe('Lesson Practice and Topic Quiz UI', () => {
  it('keeps the established lesson-linked routes intact', () => {
    expect(appSource).toContain('path="practice-attempts/:attemptPublicId"')
    expect(appSource).toContain(
      'path="practice-attempts/:attemptPublicId/results"',
    )
    expect(appSource).toContain('path="quiz-attempts/:attemptPublicId"')
    expect(appSource).toContain(
      'path="quiz-attempts/:attemptPublicId/results"',
    )
  })

  it('uses each publisher-defined set size and preserves start or continue behavior', () => {
    expect(practicePanelSource).toContain('summary.practice.questionCount')
    expect(practicePanelSource).toContain(
      'handleStartAttempt(summary.practice.id)',
    )
    expect(practicePanelSource).toContain('summary.inProgressAttempt === null')
    expect(practicePanelSource).toContain('Continue practice')
    expect(practicePanelSource).toContain('Lesson practice')
    expect(practicePanelSource).not.toContain('5 Questions')
    expect(practicePanelSource).not.toContain('10 Questions')
    expect(practicePanelSource).not.toContain('20 Questions')

    expect(quizPanelSource).toContain('summary.quiz.questionCount')
    expect(quizPanelSource).toContain('handleStartAttempt(summary.quiz.id)')
    expect(quizPanelSource).toContain('summary.inProgressAttempt === null')
    expect(quizPanelSource).toContain('Continue quiz')
    expect(quizPanelSource).toContain('summary.quiz.description')
  })

  it('preserves one-question practice, blank navigation, autosave, and explicit submission', () => {
    for (const source of [practiceAttemptSource, quizAttemptSource]) {
      expect(source).toContain('questions[currentQuestionIndex]')
      expect(source).toContain('selectedChoices[question.id] !== null')
      expect(source).toContain('setCurrentQuestionIndex(index)')
      expect(source).toContain('Previous')
      expect(source).toContain('Next')
      expect(source).toContain('type="radio"')
      expect(source).toContain('checked={')
      expect(source).toContain('window.confirm(')
      expect(source).toContain('type="submit"')
      expect(source).not.toContain('correctChoice')
      expect(source).not.toContain('isCorrect')
    }

    expect(practiceAttemptSource).toContain('fetchPracticeAttempt(')
    expect(practiceAttemptSource).toContain('savePracticeAnswer(')
    expect(practiceAttemptSource).toContain('submitPracticeAttempt(')
    expect(quizAttemptSource).toContain('fetchQuizAttempt(')
    expect(quizAttemptSource).toContain('saveQuizAnswer(')
    expect(quizAttemptSource).toContain('submitQuizAttempt(')
  })

  it('adds learning-oriented context, Action Blue progress, and accessible navigator states', () => {
    for (const source of [practiceAttemptSource, quizAttemptSource]) {
      expect(source).toContain('learning-attempt-progress')
      expect(source).toContain('<progress')
      expect(source).toContain('Question {currentPosition} of {totalQuestions}')
      expect(source).toContain('Answered {answeredCount} of {totalQuestions}')
      expect(source).toContain('learning-question-nav')
      expect(source).toContain('aria-current={isCurrent')
      expect(source).toContain("isAnswered ? 'answered' : 'unanswered'")
      expect(source).toContain('<small aria-hidden="true">')
      expect(source).toContain('learning-question-status--desktop')
      expect(source).toContain("isAnswered ? 'Answered' : 'Unanswered'")
      expect(source).toContain('learning-question-status--mobile')
      expect(source).toContain("isAnswered ? 'Done' : 'Open'")
      expect(source).toContain('learning-answer-choice__label')
      expect(source).toContain('learning-answer-choice__selected')
    }

    expect(
      hasRule('.learning-attempt-progress progress', [
        /accent-color:\s*var\(--action-primary\)/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.learning-answer-choice:has(input:checked)', [
        /background:\s*var\(--brand-selection\)/,
        /border-color:\s*var\(--brand-blue\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.learning-answer-choice:has(input:focus-visible)', [
        /outline:\s*3px\s+solid\s+var\(--focus-ring\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.learning-question-nav .quiz-question-nav__item', [
        /min-height:\s*3rem/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.quiz-question-nav', [
        /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(4\.8rem,\s*1fr\)\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.learning-question-status--mobile', [
        /display:\s*none/,
      ]),
    ).toBe(true)
  })

  it('keeps submission separate, calm, and non-automatic', () => {
    expect(practiceAttemptSource).toContain('Finish this practice set?')
    expect(practiceAttemptSource).toContain('Submit practice')
    expect(quizAttemptSource).toContain('Finish this topic quiz?')
    expect(quizAttemptSource).toContain('Submit quiz')

    for (const source of [practiceAttemptSource, quizAttemptSource]) {
      expect(source).toContain('unanswered. You can review them before submitting')
      expect(source).toContain('unanswered questions count as zero')
      expect(source).toContain('event.preventDefault()')
      expect(source).not.toContain('useEffect(() => void handleSubmit')
    }
  })

  it('uses real result values, answer comparisons, explanations, and supported next actions', () => {
    for (const source of [practiceResultSource, quizResultSource]) {
      expect(source).toContain('state.result.earnedPoints')
      expect(source).toContain('state.result.totalPoints')
      expect(source).toContain('state.result.scorePercent')
      expect(source).toContain('question.selectedChoice === null')
      expect(source).toContain('question.isCorrect')
      expect(source).toContain('Correct</dt>')
      expect(source).toContain('Incorrect</dt>')
      expect(source).toContain('Unanswered</dt>')
      expect(source).toContain('Total</dt>')
      expect(source).toContain('Your answer</dt>')
      expect(source).toContain('Correct answer</dt>')
      expect(source).toContain('Why this works')
      expect(source).toContain('question.explanation')
      expect(source).toContain('newlyUnlockedNextLesson')
      expect(source).toContain('Back to course')
    }
    expect(practiceResultSource).toContain('Retry practice')
    expect(quizResultSource).toContain('Retry quiz')
  })

  it('keeps route loading loader-only and the polished flow bounded and mobile-safe', () => {
    for (const source of [
      practiceAttemptSource,
      quizAttemptSource,
      practiceResultSource,
      quizResultSource,
    ]) {
      expect(source).toContain('<PasaWisePageLoader')
      expect(source).toContain('mobileCollapsible')
      expect(source.indexOf('<PasaWisePageLoader')).toBeLessThan(
        source.indexOf('<LearnerTopbar'),
      )
    }

    expect(
      hasRule('.learning-attempt-card', [
        /max-width:\s*64rem/,
        /min-width:\s*0/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.learning-result-card', [
        /max-width:\s*64rem/,
        /min-width:\s*0/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    for (const selector of [
      '.learning-attempt-page',
      '.learning-result-page',
    ]) {
      expect(
        hasRule(selector, [/min-width:\s*0/, /width:\s*100%/]),
      ).toBe(true)
      expect(hasRule(selector, [/overflow-x:\s*hidden/])).toBe(false)
    }

    const mobileRules = atRuleBodies(stylesSource, '@media (max-width: 48rem)')
    expect(
      mobileRules.some((body) =>
        cssRuleBodies(body, '.learning-attempt-header').some((rule) =>
          /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(rule),
        ),
      ),
    ).toBe(true)
    const compactRules = atRuleBodies(stylesSource, '@media (max-width: 30rem)')
    expect(
      compactRules.some((body) =>
        cssRuleBodies(body, '.learning-question-nav').some((rule) =>
          /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/.test(
            rule,
          ),
        ),
      ),
    ).toBe(true)
    expect(
      compactRules.some((body) =>
        cssRuleBodies(
          body,
          '.learning-question-nav .quiz-question-nav__item',
        ).some(
          (rule) =>
            /min-width:\s*2\.75rem/.test(rule) &&
            /padding-inline:\s*var\(--space-4\)/.test(rule),
        ),
      ),
    ).toBe(true)
    expect(
      compactRules.some((body) =>
        cssRuleBodies(body, '.learning-question-status--desktop').some(
          (rule) => /display:\s*none/.test(rule),
        ),
      ),
    ).toBe(true)
    expect(
      compactRules.some((body) =>
        cssRuleBodies(body, '.learning-question-status--mobile').some(
          (rule) => /display:\s*inline/.test(rule),
        ),
      ),
    ).toBe(true)
    const narrowRules = atRuleBodies(stylesSource, '@media (max-width: 22rem)')
    expect(
      narrowRules.some((body) =>
        cssRuleBodies(body, '.learning-question-nav').some((rule) =>
          /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(
            rule,
          ),
        ),
      ),
    ).toBe(true)
    expect(
      hasRule('.learning-answer-choice__text', [
        /overflow-wrap:\s*anywhere/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.learning-explanation p', [
        /overflow-wrap:\s*anywhere/,
        /white-space:\s*pre-line/,
      ]),
    ).toBe(true)
  })
})
