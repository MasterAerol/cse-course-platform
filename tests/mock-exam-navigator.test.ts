import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { QuestionRangeNavigator } from '../src/react-app/components/QuestionRangeNavigator'

const questions = Array.from({ length: 150 }, (_, index) => ({
  publicId: `question-${index + 1}`,
  position: index + 1,
  selectedChoicePublicId: index === 0 ? 'choice-1' : null,
  markedForReview: index === 1,
}))

describe('full mock question navigator', () => {
  it('renders six 25-question ranges with only the selected range expanded', () => {
    const html = renderToStaticMarkup(
      createElement(QuestionRangeNavigator, {
        totalQuestions: 150,
        questions,
        currentIndex: 0,
        expandedRangeIndex: 0,
        onRangeExpand: vi.fn(),
        onQuestionSelect: vi.fn(),
        navigatorIdPrefix: 'qa-navigator',
      }),
    )

    expect(html.match(/class="question-range"/g)).toHaveLength(6)
    expect(html.match(/class="question-range__content"/g)).toHaveLength(1)
    expect(html).toContain('Questions 1-25')
    expect(html).toContain('Questions 126-150')
    expect(html).toContain('Question 1, current, answered')
    expect(html).toContain('Question 2, unanswered, marked for review')
  })

})