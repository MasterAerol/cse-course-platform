import { describe, expect, it } from 'vitest'
import { parseLessonBlock } from '../src/worker/schemas/lesson-block.schemas'
import {
  percentageOfVisual,
  percentageGuidedTeachingContent,
  percentageExampleContent,
} from '../scripts/lib/visual-teaching-content.mjs'

describe('visual lesson block parsing', () => {
  it('accepts a valid board-style visual on an example block', () => {
    const result = parseLessonBlock({
      id: 20,
      position: 5,
      blockType: 'example',
      contentJson: JSON.stringify({
        title: 'Find 20% of 80',
        problem: 'What is 20% of 80?',
        steps: [
          'Convert 20% to 0.20 by dividing by 100.',
          'Translate “of” as multiplication.',
          'Multiply 0.20 by 80.',
        ],
        answer: '20% of 80 is 16.',
        visual: percentageOfVisual,
      }),
    })

    expect(result.malformed).toBe(false)
    expect(result.block?.type).toBe('example')
    if (result.block?.type !== 'example') throw new Error('Expected an example block.')
    expect(result.block.content.visual?.kind).toBe('decimal-movement')
    expect(result.block.content.visual?.transitions).toHaveLength(6)
  })

  it('accepts a valid illustrated-guided-teaching block', () => {
    const result = parseLessonBlock({
      id: 21,
      position: 5,
      blockType: 'illustrated-guided-teaching',
      contentJson: JSON.stringify(percentageGuidedTeachingContent),
    })

    expect(result.malformed).toBe(false)
    expect(result.block?.type).toBe('illustrated-guided-teaching')
    if (result.block?.type !== 'illustrated-guided-teaching') {
      throw new Error('Expected an illustrated guided teaching block.')
    }
    expect(result.block.content.steps).toHaveLength(6)
    expect(result.block.content.steps.at(0)?.emphasis).toBe('important')
    expect(result.block.content.visual?.kind).toBe('decimal-movement')
  })

  it('accepts the exact serialized publisher payload for guided teaching', () => {
    const serializedPayload = JSON.stringify(percentageGuidedTeachingContent)
    const result = parseLessonBlock({
      id: 25,
      position: 5,
      blockType: 'illustrated-guided-teaching',
      contentJson: serializedPayload,
    })

    expect(result.malformed).toBe(false)
    expect(result.block?.type).toBe('illustrated-guided-teaching')
    if (result.block?.type !== 'illustrated-guided-teaching') {
      throw new Error('Expected a guided teaching block.')
    }
    expect(result.block.content).toEqual(JSON.parse(serializedPayload))
  })

  it('rejects visuals that omit an explained transformation', () => {
    const result = parseLessonBlock({
      id: 22,
      position: 5,
      blockType: 'example',
      contentJson: JSON.stringify({
        title: 'Invalid visual',
        problem: 'This visual is missing transitions.',
        steps: ['Attempt a change.'],
        answer: 'No valid answer.',
        visual: {
          ...percentageOfVisual,
          transitions: [],
        },
      }),
    })

    expect(result).toEqual({ block: null, malformed: true })
  })

  it('rejects guided teaching blocks missing required step definitions', () => {
    const result = parseLessonBlock({
      id: 23,
      position: 5,
      blockType: 'illustrated-guided-teaching',
      contentJson: JSON.stringify({
        ...percentageGuidedTeachingContent,
        steps: [],
      }),
    })

    expect(result).toEqual({ block: null, malformed: true })
  })

  it('rejects malformed guided steps', () => {
    const malformed = {
      ...percentageExampleContent,
      steps: ['Only strings, no guided schema fields.'],
    }

    const result = parseLessonBlock({
      id: 24,
      position: 5,
      blockType: 'illustrated-guided-teaching',
      contentJson: JSON.stringify(malformed),
    })

    expect(result).toEqual({ block: null, malformed: true })
  })
})
