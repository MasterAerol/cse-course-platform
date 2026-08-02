import { describe, expect, it } from 'vitest'

import { arithmeticProgression, differenceTable, geometricProgression, interleaveSeries, operationCycle, powerProgression, recoverMissingTerm, recursiveProgression } from '../src/worker/domain/number-series/number-series-math'
import { detectCompetingPatterns, hasExactlyOneNumericAnswer, hasUniqueNumericChoices, isUnambiguousSeries } from '../src/worker/domain/number-series/number-series-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = [
  'addition-subtraction-series',
  'multiplication-division-series',
  'alternating-operation-series',
  'increasing-difference-series',
  'squares-cubes-powers-series',
  'fibonacci-recursive-series',
  'interleaved-two-pattern-series',
  'missing-term-series',
  'mixed-number-series',
] as const satisfies readonly GeneratorSlug[]

describe('Number Series pure utilities', () => {
  it('generates arithmetic and geometric progressions exactly', () => {
    expect(arithmeticProgression(4, 3, 5)).toEqual([4, 7, 10, 13, 16])
    expect(geometricProgression(3, 2, 5)).toEqual([3, 6, 12, 24, 48])
  })

  it('applies repeating operation cycles and difference tables', () => {
    expect(operationCycle(2, [{ kind: 'add', value: 3 }, { kind: 'multiply', value: 2 }], 4)).toEqual([2, 5, 10, 13, 26])
    expect(differenceTable([2, 5, 9, 14, 20])[1]).toEqual([3, 4, 5, 6])
    expect(differenceTable([2, 5, 9, 14, 20])[2]).toEqual([1, 1, 1])
  })

  it('generates powers, recursion, and interleaved series', () => {
    expect(powerProgression(1, 2, 0, 5)).toEqual([1, 4, 9, 16, 25])
    expect(powerProgression(1, 3, 0, 4)).toEqual([1, 8, 27, 64])
    expect(recursiveProgression(1, 1, 0, 6)).toEqual([1, 1, 2, 3, 5, 8])
    expect(interleaveSeries([2, 4, 6, 8], [10, 20, 30])).toEqual([2, 10, 4, 20, 6, 30, 8])
  })

  it('recovers a missing term only when all visible terms agree', () => {
    const complete = [4, 9, 14, 19, 24]
    expect(recoverMissingTerm(complete, 2, [4, 9, null, 19, 24])).toBe(14)
    expect(() => recoverMissingTerm(complete, 2, [4, 8, null, 19, 24])).toThrow('do not match')
  })

  it('detects ambiguity and competing patterns that imply a different answer', () => {
    expect(isUnambiguousSeries([4, 7, 10, 13, 16], 'arithmetic', 19)).toBe(true)
    expect(detectCompetingPatterns([1, 4, 9, 16, 25], 'power', 36)).toEqual([])
    expect(detectCompetingPatterns([1, 2, 3, 4, 5, 6], 'recursive', 11)).toContainEqual({ family: 'arithmetic', nextValue: 7 })
  })

  it('rejects duplicate formatted choices and multiple correct answers', () => {
    expect(hasUniqueNumericChoices([4, 5, 6, 7])).toBe(true)
    expect(hasUniqueNumericChoices([4, 4, 6, 7])).toBe(false)
    expect(hasExactlyOneNumericAnswer([4, 5, 6, 7], 6)).toBe(true)
    expect(hasExactlyOneNumericAnswer([6, 5, 6, 7], 6)).toBe(false)
  })
})

describe('Number Series generator registry', () => {
  it.each(slugs)('registers %s version 1 for all difficulties', (slug) => {
    const generator = getGenerator(slug, 1)
    expect(generator).not.toBeNull()
    expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('keeps hard alternating-difference explanations arithmetically consistent', () => {
    const generator = getGenerator('addition-subtraction-series', 1)
    if (generator === null) throw new Error('Missing addition-subtraction-series')
    for (let index = 0; index < 100; index += 1) {
      const question = generator.generate({ seed: `hard-explanation-${index}`, difficulty: 'hard' })
      const complete = question.parameters.completeSeries
      if (!Array.isArray(complete) || !complete.every((value): value is number => typeof value === 'number')) throw new Error('Missing complete series')
      const previous = complete[complete.length - 2]
      const correct = complete[complete.length - 1]
      expect(question.explanation.steps.at(-1)).toBe(`${previous} − ${Math.abs((correct ?? 0) - (previous ?? 0))} = ${correct}.`)
    }
  })

  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error(`Missing ${slug}`)
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: `number-series-stress-${slug}-${index}`, difficulty }
        let question
        try { question = generator.generate(input) } catch (error) { throw new Error(`${slug} failed at seed ${index}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} validation failed at seed ${index}: ${validation.reason ?? 'unknown reason'}`)
        expect(validation).toEqual({ valid: true, reason: null })
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(question.choices.every((choice) => Number.isFinite(choice.numericValue) && Math.abs(choice.numericValue) <= 10_000)).toBe(true)
        expect(question.prompt).not.toMatch(/NaN|Infinity/u)
      }
    }
  }, 120_000)

  it.each(slugs)('creates a five-question attempt without duplicate prompts for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `number-series-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
