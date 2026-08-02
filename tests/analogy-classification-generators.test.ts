import { describe, expect, it } from 'vitest'

import { formatAnalogy, repeatSymbol } from '../src/worker/domain/analogy-classification/analogy-classification-format'
import { applyNumericRule, findOddOneOut, relationshipMatches, reversePair } from '../src/worker/domain/analogy-classification/analogy-classification-rules'
import { hasUniqueVisibleAnalogyChoices, validateNumericAnalogy, validateUniqueOutlier } from '../src/worker/domain/analogy-classification/analogy-classification-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = [
  'synonym-antonym-analogy', 'part-whole-analogy', 'function-purpose-analogy', 'cause-effect-analogy', 'degree-intensity-analogy', 'symbol-number-analogy', 'odd-one-out', 'category-classification', 'mixed-analogy-classification',
] as const satisfies readonly GeneratorSlug[]

describe('analogy and classification rules', () => {
  it('preserves pair direction and requires matching relation and grammar', () => {
    expect(reversePair(['wheel', 'car'])).toEqual(['car', 'wheel'])
    expect(relationshipMatches(
      { left: 'rapid', right: 'fast', relationship: 'synonym', role: 'adjective', difficulty: 'easy', category: 'speed' },
      { left: 'silent', right: 'quiet', relationship: 'synonym', role: 'adjective', difficulty: 'easy', category: 'sound' },
    )).toBe(true)
    expect(relationshipMatches(
      { left: 'rapid', right: 'fast', relationship: 'synonym', role: 'adjective', difficulty: 'easy', category: 'speed' },
      { left: 'begin', right: 'start', relationship: 'synonym', role: 'verb', difficulty: 'easy', category: 'sequence' },
    )).toBe(false)
  })

  it('validates exact bounded numeric and symbol transformations', () => {
    expect(applyNumericRule(7, { operation: 'multiply', constant: 3 })).toBe(21)
    expect(applyNumericRule(8, { operation: 'square', constant: 2 })).toBe(64)
    expect(() => applyNumericRule(7, { operation: 'divide', constant: 2 })).toThrow('integer result')
    expect(validateNumericAnalogy(5, 15, 7, 21, { operation: 'multiply', constant: 3 })).toBe(true)
    expect(validateNumericAnalogy(5, 15, 7, 14, { operation: 'multiply', constant: 3 })).toBe(false)
    expect(repeatSymbol('■', 2)).toBe('■■')
    expect(formatAnalogy('bird', 'nest', 'bee')).toBe('bird : nest :: bee : ?')
  })

  it('accepts exactly one objective outlier and rejects ambiguity', () => {
    const writingTools = new Set(['pen', 'pencil', 'marker'])
    expect(findOddOneOut(['pen', 'notebook', 'marker', 'pencil'], writingTools)).toBe('notebook')
    expect(validateUniqueOutlier(['pen', 'notebook', 'marker', 'pencil'], writingTools)).toBe(true)
    expect(validateUniqueOutlier(['pen', 'notebook', 'spoon', 'pencil'], writingTools)).toBe(false)
    expect(hasUniqueVisibleAnalogyChoices(['Pen', ' pencil ', 'MARKER', 'notebook'])).toBe(true)
    expect(hasUniqueVisibleAnalogyChoices(['Pen', ' pen ', 'marker', 'notebook'])).toBe(false)
  })
})

describe('analogy and classification generator registry', () => {
  it.each(slugs)('registers %s version 1 for all difficulties', (slug) => {
    const generator = getGenerator(slug, 1)
    expect(generator).not.toBeNull()
    expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('stress-validates 1,000 deterministic questions per generator', () => {
    const forbidden = ['celebrity', 'brand', 'political', 'regional slang']
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error(`Missing ${slug}`)
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: `analogy-stress-${slug}-${index}`, difficulty }
        let question
        try { question = generator.generate(input) } catch (error) { throw new Error(`${slug} failed at seed ${index}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
        expect(generator.generate(input)).toEqual(question)
        expect(generator.validate(question)).toEqual({ valid: true, reason: null })
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(forbidden.some((term) => question.prompt.toLowerCase().includes(term))).toBe(false)
      }
    }
  }, 120_000)

  it.each(slugs)('creates a five-question attempt without duplicate prompts for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const question = generateValidatedQuestion({ attemptSeed: `analogy-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty: position < 3 ? 'easy' : position < 5 ? 'medium' : 'hard', position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
