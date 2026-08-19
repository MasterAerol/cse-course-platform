import { describe, expect, it } from 'vitest'

import attemptSource from '../src/react-app/pages/SubjectAssessmentAttemptPage.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedDesignSystemSource: unknown =
  globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__

if (typeof injectedDesignSystemSource !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}

const stylesSource = injectedDesignSystemSource

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

describe('Subject Assessment attempt UI', () => {
  it('keeps the established one-question workflow and persistence calls', () => {
    expect(attemptSource).toContain(
      'const question = data.questions[currentQuestionIndex] ?? null',
    )
    expect(attemptSource).toContain('saveSubjectAssessmentChoice(')
    expect(attemptSource).toContain('submitSubjectAssessment(')
    expect(attemptSource).toContain("type=\"radio\"")
    expect(attemptSource).toContain('Previous')
    expect(attemptSource).toContain('Next')
    expect(attemptSource).toContain('window.confirm(')
  })

  it('presents compact question progress and accessible navigation states', () => {
    expect(attemptSource).toContain('Question {currentQuestionNumber} of {data.totalCount}')
    expect(attemptSource).toContain('className="assessment-progress"')
    expect(attemptSource).toContain('<progress')
    expect(attemptSource).toContain('aria-label={`Assessment progress: question')
    expect(attemptSource).toContain('aria-label="Assessment question navigation"')
    expect(attemptSource).toContain("aria-current={isCurrent ? 'step' : undefined}")
    expect(attemptSource).toContain("isAnswered ? 'answered' : 'unanswered'")
  })

  it('makes answer selection and question hierarchy explicit', () => {
    expect(attemptSource).toContain('assessment-question-card')
    expect(attemptSource).toContain('assessment-question-kicker')
    expect(attemptSource).toContain('assessment-question-prompt')
    expect(attemptSource).toContain('assessment-choice-label')
    expect(attemptSource).toContain('String.fromCharCode(65 + choiceIndex)')
    expect(attemptSource).toContain('assessment-choice-selected')
    expect(attemptSource).toContain('checked={')
    expect(attemptSource).toContain('disabled={submitting}')

    expect(stylesSource).toMatch(
      /\.quiz-choice:has\(input:checked\)\s*\{(?=[^}]*background(?:-color)?:\s*var\(--selected-surface\))(?=[^}]*border-color:\s*var\(--selected-border\))[^}]*\}/s,
    )
    expect(stylesSource).toMatch(
      /--selected-surface:\s*var\(--brand-selection\)/,
    )
    expect(stylesSource).toMatch(/--selected-border:\s*var\(--brand-blue\)/)

    expect(stylesSource).toMatch(
      /\.quiz-choice:has\(input:focus-visible\)\s*\{(?=[^}]*outline:)(?=[^}]*outline-offset:)[^}]*\}/s,
    )
    expect(stylesSource).toMatch(
      /\.quiz-choice:has\(input:disabled\)\s*\{(?=[^}]*background:\s*var\(--color-locked-bg\))(?=[^}]*cursor:\s*not-allowed)[^}]*\}/s,
    )
  })

  it('keeps the shared subject page responsive and bounded', () => {
    expect(attemptSource).not.toContain('numerical-ability-subject-assessment')

    const pageLayoutRules = cssRuleBodies(stylesSource, '.assessment-attempt-page')
    expect(
      pageLayoutRules.some((body) =>
        hasDeclarations(body, [
          /width:\s*100%/,
          /max-width:\s*var\(--layout-assessment-max\)/,
          /min-width:\s*0/,
          /margin-inline:\s*auto/,
        ]),
      ),
    ).toBe(true)

    const assessmentMax = stylesSource.match(
      /--layout-assessment-max:\s*([\d.]+)rem/,
    )
    expect(assessmentMax).not.toBeNull()
    expect(Number.parseFloat(assessmentMax?.[1] ?? '0')).toBeLessThanOrEqual(75)

    const centeredChildDeclarations = [
      /width:\s*100%/,
      /max-width:\s*72rem/,
      /min-width:\s*0/,
      /margin-inline:\s*auto/,
    ]
    for (const selector of [
      '.assessment-attempt-page > .topbar',
      '.assessment-attempt-page .subject-assessment-workspace',
    ]) {
      expect(
        cssRuleBodies(stylesSource, selector).some((body) =>
          hasDeclarations(body, centeredChildDeclarations),
        ),
      ).toBe(true)
    }

    expect(
      cssRuleBodies(
        stylesSource,
        '.assessment-attempt-page .assessment-question-nav',
      ).some((body) =>
        hasDeclarations(body, [
          /width:\s*100%/,
          /max-width:\s*100%/,
          /min-width:\s*0/,
          /overflow-x:\s*auto/,
        ]),
      ),
    ).toBe(true)

    const mobileAssessmentRules = atRuleBodies(
      stylesSource,
      '@media (max-width: 48rem)',
    ).flatMap((body) => cssRuleBodies(body, '.assessment-attempt-page'))
    expect(
      mobileAssessmentRules.some((body) =>
        hasDeclarations(body, [/width:\s*100%/, /max-width:\s*100%/]),
      ),
    ).toBe(true)
    expect(stylesSource).toContain('@media (max-width: 48rem)')
    expect(stylesSource).toContain('@media (max-width: 30rem)')
    expect(stylesSource).toContain('min-height: 3.25rem')
  })
})
