import { describe, expect, it } from 'vitest'

import { getGenerator, generateValidatedQuestion } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'
import { contrapositive, followDeductionChain, negateQuantifier } from '../src/worker/domain/logical-reasoning/logical-reasoning-rules'

const slugs = [
  'statement-classification',
  'fact-opinion-conclusion',
  'valid-conclusion',
  'assumption-identification',
  'conditional-reasoning',
  'necessary-sufficient-condition',
  'negation-contradiction',
  'basic-deduction',
  'logical-equivalence',
  'mixed-logical-reasoning',
] as const satisfies readonly GeneratorSlug[]

describe('logical reasoning rules', () => {
  it('computes contrapositives, quantifier negations, and deduction chains', () => {
    expect(contrapositive({ antecedent: 'A', consequent: 'B' })).toEqual({ antecedent: 'not B', consequent: 'not A' })
    expect(negateQuantifier({ quantifier: 'all', subject: 'clerks', predicate: 'trained' })).toBe('At least one clerks is not trained.')
    expect(followDeductionChain('A', [{ from: 'B', to: 'C' }, { from: 'A', to: 'B' }])).toEqual(['A', 'B', 'C'])
  })
})

describe('logical reasoning generator registry', () => {
  it.each(slugs)('registers %s version 1 for every difficulty', (slug) => {
    const generator = getGenerator(slug, 1)
    expect(generator).not.toBeNull()
    expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error(`Missing ${slug}`)
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: `stress-${slug}-${index}`, difficulty }
        const first = generator.generate(input)
        const second = generator.generate(input)
        expect(second).toEqual(first)
        expect(generator.validate(first)).toEqual({ valid: true, reason: null })
        expect(first.choices).toHaveLength(4)
        expect(new Set(first.choices.map((choice) => choice.text)).size).toBe(4)
        expect(first.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(first.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(first.prompt.toLowerCase()).not.toContain('common knowledge')
      }
    }
  }, 120_000)

  it.each(slugs)('can create a five-question attempt without duplicate prompts for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const question = generateValidatedQuestion({ attemptSeed: `attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty: position < 3 ? 'easy' : position < 5 ? 'medium' : 'hard', position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
