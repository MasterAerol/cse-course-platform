import { describe, expect, it } from 'vitest'
import { classificationText, formatStatement, normalizeSyllogismChoice } from '../src/worker/domain/syllogisms/syllogism-format'
import { buildRegionModel, classifyConclusion, isEntailed, isImpossible, isPossible, isSatisfiable, isValidEitherOrPair, negateStatement } from '../src/worker/domain/syllogisms/syllogism-model'
import { parseCategoricalStatement, statement } from '../src/worker/domain/syllogisms/syllogism-rules'
import { hasExactlyOneSyllogismAnswer, hasUniqueSyllogismChoices, uniqueEntailedConclusion } from '../src/worker/domain/syllogisms/syllogism-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const s = statement
const slugs = ['universal-affirmative-syllogism', 'universal-negative-syllogism', 'particular-affirmative-syllogism', 'mixed-quantifier-syllogism', 'valid-conclusion-syllogism', 'venn-diagram-syllogism', 'possibility-conclusion-syllogism', 'either-or-syllogism', 'mixed-syllogism'] as const satisfies readonly GeneratorSlug[]

describe('Syllogism controlled statements and region model', () => {
  it('represents and parses the A, E, I, and O categorical forms', () => {
    expect(parseCategoricalStatement('All clerks are employees.')).toEqual(s('all', 'clerks', 'employees'))
    expect(parseCategoricalStatement('No folders are vehicles.')).toEqual(s('no', 'folders', 'vehicles'))
    expect(parseCategoricalStatement('Some students are artists.')).toEqual(s('some', 'students', 'artists'))
    expect(parseCategoricalStatement('Some books are not reports.')).toEqual(s('some-not', 'books', 'reports'))
    expect(formatStatement(s('some-not', 'books', 'reports'))).toBe('Some books are not reports.')
  })

  it('enforces universal inclusion, transitivity, and symmetric disjointness', () => {
    const premises = [s('all', 'clerks', 'employees'), s('all', 'employees', 'supervisors')]
    expect(isEntailed(premises, s('all', 'clerks', 'supervisors'))).toBe(true)
    expect(isEntailed(premises, s('all', 'supervisors', 'clerks'))).toBe(false)
    expect(isEntailed([s('no', 'folders', 'vehicles')], s('no', 'vehicles', 'folders'))).toBe(true)
  })

  it('tracks existential witnesses without importing existence from universals', () => {
    expect(isEntailed([s('all', 'clerks', 'employees')], s('some', 'clerks', 'employees'))).toBe(false)
    expect(isPossible([s('all', 'clerks', 'employees')], s('some', 'clerks', 'employees'))).toBe(true)
    expect(isEntailed([s('some', 'clerks', 'employees'), s('all', 'employees', 'supervisors')], s('some', 'clerks', 'supervisors'))).toBe(true)
    expect(isEntailed([s('some-not', 'books', 'reports'), s('all', 'books', 'folders')], s('some-not', 'folders', 'reports'))).toBe(true)
  })

  it('rejects premise sets whose existential witnesses have no permitted region', () => {
    const contradictory = [s('all', 'clerks', 'employees'), s('no', 'clerks', 'employees'), s('some', 'clerks', 'employees')]
    const model = buildRegionModel(contradictory)
    expect(model.satisfiable).toBe(false)
    expect(model.existentialRequirements[0]?.candidateRegions).toEqual([])
    expect(isSatisfiable(contradictory)).toBe(false)
    expect(isSatisfiable([s('all', 'clerks', 'employees'), s('no', 'clerks', 'employees')])).toBe(true)
  })

  it('distinguishes definite, possible, and impossible conclusions exactly', () => {
    const possiblePremises = [s('all', 'clerks', 'employees'), s('some', 'employees', 'artists')]
    const conclusion = s('some', 'clerks', 'artists')
    expect(classifyConclusion(possiblePremises, conclusion)).toBe('possible')
    expect(isPossible(possiblePremises, conclusion)).toBe(true)
    expect(isEntailed(possiblePremises, conclusion)).toBe(false)
    expect(isImpossible([s('all', 'clerks', 'employees'), s('no', 'employees', 'artists')], conclusion)).toBe(true)
    expect(classifyConclusion([s('some', 'clerks', 'employees'), s('all', 'employees', 'artists')], conclusion)).toBe('definite')
    expect(classificationText('possible')).toContain('may be true')
  })

  it('validates only exclusive and exhaustive either-or pairs that do not follow alone', () => {
    const premises = [s('all', 'clerks', 'employees')]
    const first = s('some', 'clerks', 'artists')
    const second = s('no', 'clerks', 'artists')
    expect(negateStatement(first)).toEqual(second)
    expect(isValidEitherOrPair(premises, first, second)).toBe(true)
    expect(isValidEitherOrPair([s('some', 'clerks', 'artists')], first, second)).toBe(false)
    expect(isValidEitherOrPair(premises, first, s('no', 'employees', 'artists'))).toBe(false)
  })

  it('validates unique logical and visible answers', () => {
    const premises = [s('all', 'clerks', 'employees'), s('all', 'employees', 'supervisors')]
    expect(uniqueEntailedConclusion(premises, [s('all', 'clerks', 'supervisors'), s('all', 'supervisors', 'clerks'), s('some', 'clerks', 'employees'), s('no', 'clerks', 'supervisors')])).toBe(0)
    expect(hasUniqueSyllogismChoices(['A', 'B', 'C', 'D'])).toBe(true)
    expect(hasUniqueSyllogismChoices(['A.', ' a ', 'C', 'D'])).toBe(false)
    expect(hasExactlyOneSyllogismAnswer(['A', 'B', 'C', 'D'], ' b. ')).toBe(true)
    expect(normalizeSyllogismChoice('  Some   A are B. ')).toBe('some a are b')
  })
})

describe('Syllogism generator registry', () => {
  it.each(slugs)('registers %s version 1 for all difficulties', (slug) => {
    const generator = getGenerator(slug, 1)
    expect(generator).not.toBeNull()
    expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error('Missing ' + slug)
      const sampledPrompts = new Set<string>()
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: 'syllogism-' + slug + '-' + index, difficulty }
        let question
        try {
          question = generator.generate(input)
        } catch (error) {
          throw new Error(slug + ' threw for seed ' + index + ': ' + (error instanceof Error ? error.message : String(error)), { cause: error })
        }
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(slug + ' failed seed ' + index + ': ' + (validation.reason ?? 'unknown'))
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => normalizeSyllogismChoice(choice.text))).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('syllogism_') === true && choice.derivation !== null)).toBe(true)
        expect(question.prompt).not.toMatch(/undefined|NaN|common knowledge/iu)
        if (index < 25) sampledPrompts.add(question.prompt.trim().toLowerCase())
      }
      expect(sampledPrompts.size).toBe(25)
    }
  }, 120_000)

  it.each(slugs)('creates five immutable questions without duplicate prompts for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: 'syllogism-attempt-' + slug, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
