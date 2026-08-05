import { describe, expect, it } from 'vitest'
import { orderAttemptChoices } from '../src/worker/utils/attempt-choice-order'

const choices = [
  { id: 1, text: 'Correct', position: 1 },
  { id: 2, text: 'Distractor 1', position: 2 },
  { id: 3, text: 'Distractor 2', position: 3 },
  { id: 4, text: 'Distractor 3', position: 4 },
]

describe('attempt choice ordering', () => {
  it('is stable per attempt and distributes the stored first choice', () => {
    const first = orderAttemptChoices(choices, 'attempt-stable', 42)
    const repeated = orderAttemptChoices(choices, 'attempt-stable', 42)

    expect(repeated).toEqual(first)
    expect(first.map((choice) => choice.position)).toEqual([1, 2, 3, 4])
    expect(new Set(first.map((choice) => choice.id))).toEqual(
      new Set(choices.map((choice) => choice.id)),
    )

    const positions = [0, 0, 0, 0]
    for (let index = 0; index < 1_000; index += 1) {
      const ordered = orderAttemptChoices(choices, `attempt-${index}`, 42)
      positions[ordered.findIndex((choice) => choice.id === 1)] += 1
    }

    for (const count of positions) {
      expect(count).toBeGreaterThan(200)
      expect(count).toBeLessThan(300)
    }
  })
})
