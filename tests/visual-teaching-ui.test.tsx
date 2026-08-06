import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LessonBlockRenderer } from '../src/react-app/components/LessonBlockRenderer'
import { VisualTeachingBoard } from '../src/react-app/components/VisualTeachingBoard'
import { visualTeachingSchema } from '../src/shared/visual-teaching.schema'
import * as authoredVisuals from '../scripts/lib/visual-teaching-content.mjs'

const compactVisual = visualTeachingSchema.parse({
  kind: 'transformation',
  ariaLabel: 'Accessible transformation',
  stages: [
    {
      label: 'Before',
      expression: [
        { text: '20', emphasis: 'highlight' },
        { text: '%', emphasis: 'crossed' },
      ],
      annotation: 'Decimal starts here',
    },
    {
      label: 'After',
      expression: [
        { text: '0.', emphasis: 'circled' },
        { text: '20', emphasis: 'final' },
      ],
      annotation: 'Final decimal',
    },
  ],
  transitions: [
    {
      label: 'Move 2',
      whatChanged: 'The decimal moved two places left.',
      why: 'Percent means divide by 100.',
      source: '20 comes from 20%.',
      arrow: 'curved',
      movement: 'left',
    },
  ],
  memoryTip: {
    title: 'Remember',
    rule: 'Move two places left.',
    reason: 'That is division by 100.',
    examples: ['20% → 0.20'],
  },
})

describe('visual teaching lesson blocks', () => {
  it('renders board annotations, accessible text, visual emphasis, and the mathematical reason', () => {
    const markup = renderToStaticMarkup(
      <VisualTeachingBoard visual={compactVisual} />,
    )

    expect(markup).toContain('data-testid="visual-teaching-board"')
    expect(markup).toContain('aria-label="Accessible transformation"')
    expect(markup).toContain('visual-teaching-board__token--highlight')
    expect(markup).toContain('visual-teaching-board__token--circled')
    expect(markup).toContain('visual-teaching-board__token--crossed')
    expect(markup).toContain('visual-teaching-board__token--final')
    expect(markup).toContain('What changed:')
    expect(markup).toContain('Why:')
    expect(markup).toContain('From:')
    expect(markup).toContain('Why it works:')
    expect(markup).toContain('Move 2')
  })

  it('renders an optional visual inside an existing example block', () => {
    const markup = renderToStaticMarkup(
      <LessonBlockRenderer
        block={{
          id: 1,
          position: 1,
          type: 'example',
          content: {
            title: 'Convert a percent',
            problem: 'Write 20% as a decimal.',
            steps: ['Show the hidden decimal point.', 'Move it left twice.'],
            answer: '0.20',
            visual: compactVisual,
          },
        }}
      />,
    )

    expect(markup).toContain('Convert a percent')
    expect(markup).toContain('visual-teaching-board')
    expect(markup).toContain('<strong>Answer:</strong> 0.20')
  })

  it('enforces one explained transition between every pair of stages', () => {
    const invalid = {
      ...compactVisual,
      transitions: [],
    }

    expect(visualTeachingSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates every authored numerical teaching visual against the shared contract', () => {
    const visuals = Object.entries(authoredVisuals)
      .filter(([name]) => name.endsWith('Visual'))
      .map(([, visual]) => visual)
    expect(visuals).toHaveLength(6)

    for (const visual of visuals) {
      expect(visualTeachingSchema.safeParse(visual).success).toBe(true)
    }
  })

  it('teaches the complete percent conversion and explains why the shortcut works', () => {
    const percentage = visualTeachingSchema.parse(
      authoredVisuals.percentageOfVisual,
    )
    const text = JSON.stringify(percentage)

    expect(percentage.stages.map((stage) => stage.label)).toEqual([
      'Start',
      'Remove percent sign',
      'Decimal starts here',
      'Move 1',
      'Move 2',
      '“of” means multiply',
      'Final answer',
    ])
    expect(text).toContain('20 ÷ 100 = 0.20')
    expect(text).toContain('20% of 80')
    expect(percentage.memoryTip?.examples).toEqual([
      '8% → 0.08',
      '20% → 0.20',
      '45% → 0.45',
      '125% → 1.25',
    ])
  })
})