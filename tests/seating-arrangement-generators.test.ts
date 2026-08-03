import { describe, expect, it } from 'vitest'
import { evaluateAcrossSolutions, hasUniqueArrangement, normalizeCircular, solveArrangements } from '../src/worker/domain/seating-arrangements/seating-arrangement-solver'
import { clockwiseIndex, counterclockwiseIndex, facingRelativeIndex, moveWithShift, oppositeIndex, peopleBetween, swapPositions } from '../src/worker/domain/seating-arrangements/seating-arrangement-rules'
import { answerScenario, hasUniqueVisibleChoices } from '../src/worker/domain/seating-arrangements/seating-arrangement-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['linear-row-seating', 'left-right-neighbor', 'fixed-gap-seating', 'circular-seating', 'facing-direction-seating', 'rearrangement-swap', 'schedule-slot-arrangement', 'object-shelf-arrangement', 'mixed-seating-arrangement'] as const satisfies readonly GeneratorSlug[]

describe('Seating and arrangement pure solver', () => {
  it('solves fixed, immediate, adjacency, gap, between, end, and schedule constraints', () => {
    const problem = { mode: 'linear' as const, labels: ['A', 'B', 'C', 'D'], constraints: [
      { kind: 'end' as const, label: 'A' }, { kind: 'before' as const, first: 'A', second: 'B', immediate: true },
      { kind: 'gap' as const, first: 'A', second: 'C', between: 1 }, { kind: 'between' as const, middle: 'C', first: 'B', second: 'D' },
      { kind: 'not-adjacent' as const, first: 'A', second: 'D' },
    ] }
    expect(solveArrangements(problem).map(({ order }) => order)).toEqual([['A', 'B', 'C', 'D']])
    expect(hasUniqueArrangement(problem)).toBe(true)
    expect(peopleBetween(0, 3)).toBe(2)
    expect(evaluateAcrossSolutions(problem, (order) => order.indexOf('B') < order.indexOf('D'))).toBe('must')
    expect(evaluateAcrossSolutions(problem, (order) => order[0] === 'D')).toBe('cannot')
  })

  it('normalizes rotations and applies circular wraparound, opposite, and facing rules', () => {
    expect(normalizeCircular(['C', 'D', 'A', 'B'], 'A')).toEqual(['A', 'B', 'C', 'D'])
    expect(clockwiseIndex(3, 1, 4)).toBe(0)
    expect(counterclockwiseIndex(0, 1, 4)).toBe(3)
    expect(oppositeIndex(1, 4)).toBe(3)
    expect(facingRelativeIndex(0, 'left', 'center', 1, 4)).toBe(1)
    expect(facingRelativeIndex(0, 'left', 'outward', 1, 4)).toBe(3)
  })

  it('simulates exact swaps and moves with intervening shifts', () => {
    expect(swapPositions(['A', 'B', 'C', 'D'], 0, 3)).toEqual(['D', 'B', 'C', 'A'])
    expect(moveWithShift(['A', 'B', 'C', 'D'], 3, 1)).toEqual(['A', 'D', 'B', 'C'])
    expect(hasUniqueVisibleChoices(['A', 'B', 'C', 'D'])).toBe(true)
    expect(hasUniqueVisibleChoices(['A', ' a ', 'C', 'D'])).toBe(false)
  })
})

describe('Seating and arrangement generator registry', () => {
  it.each(slugs)('registers %s version 1', (slug) => {
    expect(getGenerator(slug, 1)?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error(`Missing ${slug}`)
      const prompts = new Set<string>()
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: `arrangement-${slug}-${index}`, difficulty }
        const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} failed seed ${index}: ${validation.reason ?? 'unknown'}`)
        expect(answerScenario(question.parameters.problem as never, question.parameters.query as never)).toBe(question.explanation.finalAnswer)
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('arrangement_') === true && choice.derivation !== null)).toBe(true)
        expect(question.prompt).not.toMatch(/undefined|NaN/iu)
        if (index < 25) prompts.add(question.prompt.trim().toLowerCase())
      }
      expect(prompts.size).toBe(25)
    }
  }, 180_000)

  it.each(slugs)('creates five unique immutable questions for %s', (slug) => {
    const signatures = new Set<string>(); const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `arrangement-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature); prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5); expect(prompts.size).toBe(5)
  })
})
