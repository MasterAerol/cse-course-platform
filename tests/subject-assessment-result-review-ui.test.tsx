import { describe, expect, it } from 'vitest'

import overviewSource from '../src/react-app/pages/SubjectAssessmentPage.tsx?raw'
import attemptSource from '../src/react-app/pages/SubjectAssessmentAttemptPage.tsx?raw'
import resultSource from '../src/react-app/pages/SubjectAssessmentResultPage.tsx?raw'
import reviewSource from '../src/react-app/pages/SubjectAssessmentReviewPage.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}
const stylesSource = injectedStyles

function hasRule(selector: string, declarations: RegExp[]): boolean {
  const sourceWithoutComments = stylesSource.replace(/\/\*[\s\S]*?\*\//g, '')
  return Array.from(sourceWithoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/gs)).some(
    (match) =>
      (match[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .includes(selector) &&
      declarations.every((declaration) => declaration.test(match[2] ?? '')),
  )
}

describe('Subject Assessment review and result UI', () => {
  it('keeps final review informative without changing submission behavior', () => {
    expect(attemptSource).toContain('Review before submitting')
    expect(attemptSource).toContain('Answered</dt>')
    expect(attemptSource).toContain('Unanswered</dt>')
    expect(attemptSource).toContain('Total</dt>')
    expect(attemptSource).toContain('Use the question navigator above')
    expect(attemptSource).toContain('will count as zero')
    expect(attemptSource).toContain('window.confirm(')
    expect(attemptSource).toContain('Select Cancel to continue reviewing.')
    expect(attemptSource).toContain('Submit Assessment')
    expect(attemptSource).not.toContain('autoSubmit')
  })

  it('renders real result metrics, status, topic performance, and supported next actions', () => {
    expect(resultSource).toContain("result.passed ? 'Passed' : 'Needs Improvement'")
    expect(resultSource).toContain('result.earnedPoints')
    expect(resultSource).toContain('result.totalPoints')
    expect(resultSource).toContain('result.scorePercent')
    expect(resultSource).toContain('result.breakdown.correctCount')
    expect(resultSource).toContain('result.breakdown.incorrectCount')
    expect(resultSource).toContain('result.breakdown.unansweredCount')
    expect(resultSource).toContain('result.assessment.passingScore')
    expect(resultSource).toContain('result.assessment.passingTarget')
    expect(resultSource).toContain('result.breakdown.topics.map')
    expect(resultSource).toContain('Review Answers')
    expect(resultSource).toContain('Assessment History')
    expect(resultSource).toContain('to="/readiness"')
  })

  it('labels correct, incorrect, and unanswered answer-review states', () => {
    expect(reviewSource).toContain("question.unanswered")
    expect(reviewSource).toContain("? 'unanswered'")
    expect(reviewSource).toContain("? 'correct'")
    expect(reviewSource).toContain(": 'incorrect'")
    expect(reviewSource).toContain('Your answer')
    expect(reviewSource).toContain('No answer selected')
    expect(reviewSource).toContain('Correct answer')
    expect(reviewSource).toContain('Explanation')
    expect(reviewSource).toContain('question.topic.title')
  })

  it('keeps review and result layouts bounded, readable, and mobile-fluid', () => {
    for (const selector of [
      '.subject-assessment-result-page',
      '.subject-assessment-review-page',
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
      hasRule('.assessment-result-hero', [
        /grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(20rem,\s*0\.85fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-answer-card', [
        /min-width:\s*0/,
        /overflow-wrap|display:\s*grid/,
      ]),
    ).toBe(true)
    expect(stylesSource).toContain('@media (max-width: 48rem)')
    expect(stylesSource).toContain('@media (max-width: 30rem)')
    expect(stylesSource).toMatch(
      /\.assessment-result-actions \.assessment-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    )
    expect(stylesSource).toMatch(
      /\.assessment-review-actions \.button-link[^{}]*\{[^}]*width:\s*100%/s,
    )
  })

  it('uses real history to distinguish first attempts from retakes and performance summaries', () => {
    expect(overviewSource).toContain('summary.attemptCount > 0')
    expect(overviewSource).toContain("? 'Retake Assessment'")
    expect(overviewSource).toContain(": 'Start Assessment'")
    expect(overviewSource).toContain('summary.latestScore !== null')
    expect(overviewSource).toContain('summary.bestScore !== null')
    expect(overviewSource).toContain('Latest score')
    expect(overviewSource).toContain('Best score')
    expect(overviewSource).toContain('summary.attemptCount')
    expect(overviewSource).toContain('if (summary.history.length === 0) return null')
  })

  it('renders semantic attempt statuses and supported result links without encoding artifacts', () => {
    expect(overviewSource).toContain("? 'Passed'")
    expect(overviewSource).toContain("? 'Needs Improvement'")
    expect(overviewSource).toContain("assessment-status--${item.passed === true ? 'passed'")
    expect(overviewSource).toContain('item.submittedAt !== null')
    expect(overviewSource).toContain('formatAttemptDate(item.submittedAt)')
    expect(overviewSource).toContain('View Results')
    expect(overviewSource).toContain('/results`')
    expect(overviewSource).not.toContain('\uFFFD')
  })

  it('keeps the overview balanced on desktop and fluid on mobile', () => {
    expect(
      hasRule('.assessment-overview__grid', [
        /display:\s*grid/,
        /grid-template-columns:\s*minmax\(0,\s*1\.25fr\)\s+minmax\(18rem,\s*0\.75fr\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-history article', [
        /display:\s*grid/,
        /border-radius:\s*var\(--radius-medium\)/,
        /grid-template-columns:/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-status--passed', [
        /background:\s*var\(--color-success-bg\)/,
        /color:\s*var\(--color-success\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.assessment-status--improvement', [
        /background:\s*var\(--color-warning-bg\)/,
        /color:\s*var\(--color-warning\)/,
      ]),
    ).toBe(true)
    expect(stylesSource).toMatch(
      /@media \(max-width: 48rem\)[\s\S]*?\.assessment-overview__grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
    expect(stylesSource).toMatch(
      /@media \(max-width: 30rem\)[\s\S]*?\.assessment-performance__metrics,[^{}]*\.assessment-history article\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
  })
})
