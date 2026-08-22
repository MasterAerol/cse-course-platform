import { describe, expect, it } from 'vitest'

import { mockExamDistributionNotice } from '../src/shared/mock-exam-copy'
import appSource from '../src/react-app/App.tsx?raw'
import navigatorSource from '../src/react-app/components/QuestionRangeNavigator.tsx?raw'
import {
  formatMockExamDescription,
  formatMockExamSimulationLabel,
  formatMockReviewQuestionList,
} from '../src/react-app/lib/mock-exam-presentation'
import attemptSource from '../src/react-app/pages/MockExamAttemptPage.tsx?raw'
import overviewSource from '../src/react-app/pages/MockExamPage.tsx?raw'
import resultSource from '../src/react-app/pages/MockExamResultPage.tsx?raw'
import reviewSource from '../src/react-app/pages/MockExamReviewPage.tsx?raw'

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

    if (depth === 0) {
      bodies.push(source.slice(openingBrace + 1, position - 1))
    }
    markerIndex = source.indexOf(marker, position)
  }

  return bodies
}

function hasDeclarations(body: string, declarations: RegExp[]): boolean {
  return declarations.every((declaration) => declaration.test(body))
}

function hasRule(selector: string, declarations: RegExp[]): boolean {
  return cssRuleBodies(stylesSource, selector).some((body) =>
    hasDeclarations(body, declarations),
  )
}

describe('Full Mock Examination UI', () => {
  it('keeps the established Full Mock routes intact', () => {
    expect(appSource).toContain(
      'path="mock-examinations/:mockExamSlug" element={<PremiumRoute feature="full_mock"><MockExamPage /></PremiumRoute>}',
    )
    expect(appSource).toContain(
      'path="mock-exam-attempts/:attemptPublicId" element={<PremiumRoute feature="full_mock"><MockExamAttemptPage /></PremiumRoute>}',
    )
    expect(appSource).toContain(
      'path="mock-exam-attempts/:attemptPublicId/results" element={<PremiumRoute feature="full_mock"><MockExamResultPage /></PremiumRoute>}',
    )
    expect(appSource).toContain(
      'path="mock-exam-attempts/:attemptPublicId/review" element={<PremiumRoute feature="full_mock"><MockExamReviewPage /></PremiumRoute>}',
    )
  })

  it('uses real exam metadata, performance, active-attempt, and history data', () => {
    expect(overviewSource).toContain('summary.examination.questionCount')
    expect(overviewSource).toContain('summary.examination.timedDurationMinutes')
    expect(overviewSource).toContain('summary.examination.passingTarget')
    expect(overviewSource).toContain('summary.examination.passingScore')
    expect(overviewSource).toContain('summary.latestScore')
    expect(overviewSource).toContain('summary.bestScore')
    expect(overviewSource).toContain('summary.attemptCount')
    expect(overviewSource).toContain('activeAttempt !== null')
    expect(overviewSource).toContain('Continue Full Mock')
    expect(overviewSource).toContain("? 'Retake Timed Mock'")
    expect(overviewSource).toContain(": 'Start Timed Mock'")
    expect(overviewSource).toContain("begin('timed')")
    expect(overviewSource).toContain("begin('untimed')")
    expect(overviewSource).toContain('history.map((item)')
    expect(overviewSource).toContain('item.earned_points')
    expect(overviewSource).toContain('item.total_points')
    expect(overviewSource).toContain('item.score_percent')
    expect(overviewSource).toContain('item.submitted_at ?? item.created_at')
    expect(overviewSource).toContain("item.passed === 1")
    expect(overviewSource).toContain("active ? 'Continue' : 'View Result'")
    expect(overviewSource).toContain('No mock attempts yet')
    expect(overviewSource).not.toContain('\uFFFD')
  })

  it('keeps internal versioning and misleading official wording out of learner copy', () => {
    expect(
      formatMockExamSimulationLabel(
        'Platform-Designed Subject Distribution v1',
      ),
    ).toBe('Platform-Designed Subject Distribution')
    expect(
      formatMockExamDescription(
        'A complete 150-question cross-subject CSE Professional review simulation with official timed and untimed practice modes.',
      ),
    ).toBe(
      'A complete 150-question cross-subject CSE Professional review simulation with timed simulation and untimed practice modes.',
    )
    expect(overviewSource).toContain(
      'formatMockExamSimulationLabel(summary.examination.simulationLabel)',
    )
    expect(overviewSource).toContain(
      'formatMockExamDescription(summary.examination.description)',
    )
    expect(overviewSource).toContain('summary.notice')
    expect(mockExamDistributionNotice).toContain('platform-designed')
    expect(mockExamDistributionNotice).toContain(
      'not an official CSC item allocation',
    )
  })

  it('preserves the timed one-question workflow, persistence, and neutral live answers', () => {
    expect(attemptSource).toContain('const q = data.questions[index]')
    expect(attemptSource).toContain('saveMockChoice(')
    expect(attemptSource).toContain('saveMockReviewFlag(')
    expect(attemptSource).toContain('submitMock(attemptPublicId)')
    expect(attemptSource).toContain('setInterval(tick, 1000)')
    expect(attemptSource).toContain('if (value === 0')
    expect(attemptSource).toContain("type=\"radio\"")
    expect(attemptSource).toContain('Previous')
    expect(attemptSource).toContain('Next')
    expect(attemptSource).toContain('checked={q.selectedChoicePublicId === choice.publicId}')
    expect(attemptSource).toContain('aria-pressed={q.markedForReview}')
    expect(attemptSource).toContain("q.markedForReview ? 'Marked' : 'Review'")
    expect(attemptSource).not.toContain('correctChoicePublicId')
    expect(attemptSource).not.toContain('isCorrect')
  })

  it('presents formal timer, progress, navigator, selection, and save-state contracts', () => {
    expect(attemptSource).toContain('Time Remaining')
    expect(attemptSource).toContain('formatTime(remaining)')
    expect(attemptSource).toContain('Question {index + 1} of {data.totalCount}')
    expect(attemptSource).toContain('<progress')
    expect(attemptSource).toContain('Full Mock progress: question')
    expect(attemptSource).toContain('QuestionStatusChips({')
    expect(attemptSource).toContain('<QuestionRangeNavigator')
    expect(attemptSource).toContain('role="dialog"')
    expect(attemptSource).toContain('aria-modal="true"')
    expect(attemptSource).toContain('assessment-choice-label')
    expect(attemptSource).toContain('answer-choice-control')
    expect(attemptSource).toContain('answer-choice-marker')
    expect(attemptSource).not.toContain('assessment-choice-selected')
    expect(attemptSource).toContain('String.fromCharCode(65 + choiceIndex)')
    expect(attemptSource).toContain("? 'Saving...'")
    expect(attemptSource).toContain(": 'Saved'")
  })

  it('keeps final review informative, editable, and separate from submission', () => {
    expect(attemptSource).toContain('Review before submission')
    expect(attemptSource).toContain('Answered</dt>')
    expect(attemptSource).toContain('Unanswered</dt>')
    expect(attemptSource).toContain('Marked</dt>')
    expect(attemptSource).toContain('Total</dt>')
    expect(attemptSource).toContain('summary.unansweredCount')
    expect(attemptSource).toContain('will count as zero')
    expect(attemptSource).toContain('summary.markedForReviewCount')
    expect(attemptSource).toContain('Return to a question')
    expect(attemptSource).toContain('navigateToQuestion(questionIndex)')
    expect(attemptSource).toContain('setReviewing(false)')
    expect(attemptSource).toContain('Continue Reviewing')
    expect(attemptSource).toContain('Submission is final.')
    expect(attemptSource).toContain('Submit Full Mock')
    expect(attemptSource.match(/void finish\(\)/g)).toHaveLength(1)
    expect(attemptSource).not.toContain('window.confirm(')
  })

  it('lists small review sets and summarizes large sets without changing counts', () => {
    const smallUnanswered = [12, 38, 72, 101, 144]
    const allUnanswered = Array.from({ length: 150 }, (_, index) => index + 1)
    const largeMarked = Array.from({ length: 20 }, (_, index) => index + 1)

    expect(formatMockReviewQuestionList([], 'unanswered')).toBe('None')
    expect(
      formatMockReviewQuestionList(smallUnanswered, 'unanswered'),
    ).toBe('12, 38, 72, 101, 144')
    expect(
      formatMockReviewQuestionList(allUnanswered, 'unanswered'),
    ).toBe(
      '150 unanswered questions. Use the question navigator below to return to any item.',
    )
    expect(formatMockReviewQuestionList(largeMarked, 'marked')).toBe(
      '20 questions marked for review. Use the question navigator below to revisit them.',
    )
    expect(attemptSource).toContain('summary.unansweredCount')
    expect(attemptSource).toContain('summary.unansweredQuestionNumbers')
    expect(attemptSource).toContain('summary.markedQuestionNumbers')
    expect(attemptSource).toContain('mock-submit-review-navigator')
    expect(attemptSource).toContain('<QuestionRangeNavigator')
  })

  it('uses real result scoring, threshold, subject data, and supported next actions', () => {
    expect(resultSource).toContain("data.passed ? 'Passed' : 'Needs Improvement'")
    expect(resultSource).toContain('data.earnedPoints')
    expect(resultSource).toContain('data.totalPoints')
    expect(resultSource).toContain('data.scorePercent')
    expect(resultSource).toContain('data.examination.passingTarget')
    expect(resultSource).toContain('data.examination.passingScore')
    expect(resultSource).toContain('pointsToPassing')
    expect(resultSource).toContain('data.correctCount')
    expect(resultSource).toContain('data.incorrectCount')
    expect(resultSource).toContain('data.unansweredCount')
    expect(resultSource).toContain('data.subjects')
    expect(resultSource).toContain('data.topics')
    expect(resultSource).toContain('data.strongestSubject')
    expect(resultSource).toContain('data.weakestSubject')
    expect(resultSource).toContain('Review Answers')
    expect(resultSource).toContain('to="/readiness"')
    expect(resultSource).toContain('Retake or View History')
  })

  it('labels answer-review states, persisted marks, choices, and explanations', () => {
    expect(reviewSource).toContain("question.unanswered")
    expect(reviewSource).toContain("? 'unanswered'")
    expect(reviewSource).toContain("? 'correct'")
    expect(reviewSource).toContain(": 'incorrect'")
    expect(reviewSource).toContain('question.markedForReview')
    expect(reviewSource).toContain('Marked for review')
    expect(reviewSource).toContain('Your answer')
    expect(reviewSource).toContain('Correct answer')
    expect(reviewSource).toContain('No answer was selected')
    expect(reviewSource).toContain('question.explanation')
    expect(reviewSource).toContain('question.choices.map')
    expect(reviewSource).toContain('No questions match these filters')
  })

  it('keeps route-level Full Mock loading states loader-only', () => {
    for (const source of [overviewSource, attemptSource, resultSource, reviewSource]) {
      expect(source).toContain('<PasaWisePageLoader')
      expect(source).toContain('mobileCollapsible')
    }
    expect(overviewSource).toContain('Preparing the Full Mock Examination')
    expect(attemptSource).toContain('Preparing your Full Mock examination')
    expect(resultSource).toContain('Checking your Full Mock results')
    expect(reviewSource).toContain('Opening your Full Mock review')
  })

  it('keeps the complete Full Mock flow bounded on desktop and fluid on mobile', () => {
    for (const selector of [
      '.mock-exam-overview-page',
      '.mock-attempt-page',
      '.mock-submit-review-page',
      '.mock-result-page',
      '.mock-review-page',
    ]) {
      expect(
        hasRule(selector, [
          /width:\s*100%/,
          /max-width:\s*var\(--layout-assessment-max\)/,
          /min-width:\s*0/,
          /margin-inline:\s*auto/,
        ]),
      ).toBe(true)
    }

    expect(
      hasRule('.mock-overview-hero', [
        /grid-template-columns:\s*minmax\(0,\s*1\.25fr\)\s+minmax\(18rem,\s*0\.75fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-attempt-page .mock-attempt-desktop-layout', [
        /grid-template-columns:\s*minmax\(18\.5rem,\s*20rem\)\s+minmax\(0,\s*1fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-result-hero', [
        /grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(20rem,\s*0\.85fr\)/,
      ]),
    ).toBe(true)

    const mobileRules = atRuleBodies(
      stylesSource,
      '@media (max-width: 48rem)',
    )
    expect(
      mobileRules.some((body) =>
        cssRuleBodies(body, '.mock-result-hero').some((rule) =>
          hasDeclarations(rule, [
            /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
          ]),
        ),
      ),
    ).toBe(true)
    expect(stylesSource).toContain('@media (max-width: 30rem)')
    expect(stylesSource).toContain('env(safe-area-inset-bottom)')
  })

  it('gives only the desktop inline navigator a readable two-row group header', () => {
    expect(
      hasRule(
        '.mock-attempt-page .question-range-nav-desktop .question-range__header',
        [
          /display:\s*grid/,
          /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/,
          /grid-template-areas:\s*'title chevron'\s*'meta meta'/,
        ],
      ),
    ).toBe(true)
    expect(
      hasRule(
        '.mock-attempt-page .question-range-nav-desktop .question-range__title',
        [/grid-area:\s*title/, /overflow-wrap:\s*anywhere/],
      ),
    ).toBe(true)
    expect(
      hasRule(
        '.mock-attempt-page .question-range-nav-desktop .question-range__meta',
        [/grid-area:\s*meta/, /width:\s*100%/],
      ),
    ).toBe(true)
    expect(
      hasRule(
        '.mock-attempt-page .question-range-nav-desktop .question-range__chevron',
        [/grid-area:\s*chevron/, /justify-self:\s*end/],
      ),
    ).toBe(true)
    expect(
      hasRule(
        '.mock-attempt-page .question-range-nav-desktop .question-range__meta-chip',
        [/padding:\s*0\.12rem\s+0\.46rem/, /font-size:\s*0\.86rem/],
      ),
    ).toBe(true)
    expect(
      hasRule('.mock-attempt-page .question-range-button', [
        /min-height:\s*3rem/,
      ]),
    ).toBe(true)

    expect(navigatorSource).toContain('aria-expanded={isExpanded}')
    expect(navigatorSource).toContain('question-range-button--current')
    expect(navigatorSource).toContain('question-range-button--answered')
    expect(navigatorSource).toContain('question-range-button--marked')
    expect(navigatorSource).toContain('Unanswered')
    expect(attemptSource).toContain('question-navigator-drawer__content')
    expect(attemptSource).toContain(
      'navigatorIdPrefix="mock-question-range-drawer"',
    )
    expect(attemptSource).toContain(
      'navigatorIdPrefix="mock-question-range-inline"',
    )
  })

  it('uses approved selection, review-flag, and answer-state semantics', () => {
    expect(
      hasRule('.mock-attempt-progress progress', [
        /accent-color:\s*var\(--action-primary\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-exam-choice:has(input:checked)', [
        /background:\s*var\(--brand-selection\)/,
        /border-color:\s*var\(--brand-blue\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.quiz-choice > .answer-choice-control', [
        /position:\s*absolute/,
        /clip-path:\s*inset\(50%\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-exam-choice', [
        /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule(".mock-attempt-review-control[aria-pressed='true']", [
        /background:\s*var\(--achievement-surface\)/,
        /border-color:\s*var\(--achievement\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-answer-card--correct', [
        /border-inline-start-color:\s*var\(--color-success\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-answer-card--incorrect', [
        /border-inline-start-color:\s*var\(--color-danger\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.mock-answer-card--unanswered', [
        /border-inline-start-color:\s*var\(--achievement\)/,
      ]),
    ).toBe(true)
  })
})
