import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { SubjectAssessmentCard } from '../src/react-app/components/SubjectAssessmentCard'
import type { SubjectAssessmentCardSummary } from '../src/react-app/components/subject-assessment-card.types'

const notStarted: SubjectAssessmentCardSummary = {
  assessment: {
    title: 'Numerical Ability Subject Assessment',
    slug: 'numerical-ability-subject-assessment',
    description: null,
    questionCount: 50,
    passingScore: 70,
  },
  availability: { available: true, reason: null },
  state: 'not_started',
  inProgressAttemptPublicId: null,
  bestScore: null,
  history: [],
}

function renderCard(summary: SubjectAssessmentCardSummary): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(SubjectAssessmentCard, { summary }),
    ),
  )
}

describe('SubjectAssessmentCard', () => {
  it('renders a published assessment when attempt count is zero', () => {
    const html = renderCard(notStarted)
    expect(html).toContain('Numerical Ability Subject Assessment')
    expect(html).toContain('50 questions')
    expect(html).toContain('70% passing score')
    expect(html).toContain('Not Started')
    expect(html).toContain('Start Assessment')
  })

  it.each([
    ['in_progress', 'Resume'],
    ['needs_improvement', 'Retake'],
    ['passed', 'Review'],
  ] as const)('renders %s as %s', (state, action) => {
    const html = renderCard({
      ...notStarted,
      state,
      inProgressAttemptPublicId:
        state === 'in_progress' ? 'attempt-public-id' : null,
    })
    expect(html).toContain(action)
  })
})
