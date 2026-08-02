import { describe, expect, it } from 'vitest'

import { formatLetterSeries } from '../src/worker/domain/letter-series/letter-series-format'
import { alphabetGap, generateGroupedTerms, generateLetterNumberTerms, generateLetterSeries, increasingGapSeries, interleaveLetterSeries, letterToPosition, moveBackward, moveForward, positionToLetter, recoverMissingTerm } from '../src/worker/domain/letter-series/letter-series-math'
import { detectCompetingLetterPatterns, hasExactlyOneVisibleAnswer, hasUniqueVisibleChoices, isUnambiguousLetterSeries, validateAlternatingCycle } from '../src/worker/domain/letter-series/letter-series-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['forward-letter-series', 'backward-letter-series', 'skipping-letter-series', 'alternating-letter-series', 'increasing-gap-letter-series', 'grouped-letter-series', 'letter-number-series', 'missing-term-letter-series', 'mixed-letter-series'] as const satisfies readonly GeneratorSlug[]

describe('Letter Series pure utilities', () => {
  it('converts strict uppercase alphabet positions', () => {
    expect(letterToPosition('A')).toBe(1); expect(letterToPosition('Z')).toBe(26)
    expect(positionToLetter(1)).toBe('A'); expect(positionToLetter(26)).toBe('Z')
    expect(() => letterToPosition('a')).toThrow('uppercase'); expect(() => positionToLetter(27)).toThrow('wraparound is disabled')
  })

  it('moves forward and backward without implicit wraparound', () => {
    expect(moveForward('C', 4)).toBe('G'); expect(moveBackward('M', 3)).toBe('J'); expect(alphabetGap('B', 'F')).toBe(4)
    expect(() => moveForward('Z', 1)).toThrow('wraparound is disabled')
  })

  it('centralizes explicit forward and backward wraparound', () => {
    expect(moveForward('Z', 1, { wraparound: true })).toBe('A')
    expect(moveBackward('A', 1, { wraparound: true })).toBe('Z')
    expect(positionToLetter(53, { wraparound: true })).toBe('A')
  })

  it('builds fixed skips, alternating gaps, and changing gaps exactly', () => {
    expect(generateLetterSeries('A', [2], 4)).toEqual(['A', 'C', 'E', 'G', 'I'])
    const alternating = generateLetterSeries('A', [2, 3], 6)
    expect(alternating).toEqual(['A', 'C', 'F', 'H', 'K', 'M', 'P'])
    expect(validateAlternatingCycle(alternating, [2, 3])).toBe(true)
    expect(increasingGapSeries('A', 1, 1, 4)).toEqual(['A', 'B', 'D', 'G', 'K'])
    expect(increasingGapSeries('Z', -1, -1, 4)).toEqual(['Z', 'Y', 'W', 'T', 'P'])
  })

  it('builds interleaved, grouped, and letter-number terms', () => {
    expect(interleaveLetterSeries(['A', 'C', 'E', 'G'], ['Z', 'X', 'V'])).toEqual(['A', 'Z', 'C', 'X', 'E', 'V', 'G'])
    expect(generateGroupedTerms(['A', 'B'], 3, 4)).toEqual(['AB', 'DE', 'GH', 'JK'])
    expect(generateLetterNumberTerms('A', 2, 2, 2, 4)).toEqual([{ letter: 'A', number: 2 }, { letter: 'C', number: 4 }, { letter: 'E', number: 6 }, { letter: 'G', number: 8 }])
  })

  it('recovers missing terms and formats blanks', () => {
    const complete = ['A', 'D', 'G', 'J', 'M']
    expect(recoverMissingTerm(complete, 2, ['A', 'D', null, 'J', 'M'])).toBe('G')
    expect(formatLetterSeries(['A', 'D', null, 'J'])).toBe('A, D, ?, J')
    expect(() => recoverMissingTerm(complete, 2, ['A', 'E', null, 'J', 'M'])).toThrow('do not match')
  })

  it('detects competing patterns and visible-choice duplication', () => {
    expect(isUnambiguousLetterSeries(['A', 'C', 'E', 'G', 'I'], 'constant', 'K')).toBe(true)
    expect(detectCompetingLetterPatterns(['A', 'B', 'C', 'D', 'E', 'F'], 'interleaved', 'H')).toContainEqual({ family: 'constant', nextTerm: 'G' })
    expect(hasUniqueVisibleChoices(['A', 'B', 'C', 'D'])).toBe(true); expect(hasUniqueVisibleChoices(['A', 'A', 'C', 'D'])).toBe(false)
    expect(hasExactlyOneVisibleAnswer(['A', 'B', 'C', 'D'], 'C')).toBe(true)
  })
})

describe('Letter Series generator registry', () => {
  it.each(slugs)('registers %s version 1 for every difficulty', (slug) => {
    const generator = getGenerator(slug, 1); expect(generator).not.toBeNull(); expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('covers beginning, middle, second-to-last, and end blanks across multiple rule families', () => {
    const generator = getGenerator('missing-term-letter-series', 1); if (generator === null) throw new Error('Missing missing-term-letter-series')
    const positions = new Set<number>(); const families = new Set<string>()
    for (let index = 0; index < 300; index += 1) {
      const question = generator.generate({ seed: `missing-coverage-${index}`, difficulty: (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy' })
      const visible = question.parameters.visibleSeries; if (!Array.isArray(visible)) throw new Error('Missing visible series')
      positions.add(visible.findIndex((term) => term === null)); families.add(String(question.parameters.intendedFamily))
    }
    expect(positions.has(0)).toBe(true); expect([...positions].some((position) => position > 0 && position < 4)).toBe(true); expect(positions.has(4)).toBe(true); expect(positions.has(5)).toBe(true)
    expect(families).toEqual(new Set(['constant', 'alternating', 'increasing-gap', 'grouped', 'letter-number']))
  })

  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1); if (generator === null) throw new Error(`Missing ${slug}`)
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: `letter-series-stress-${slug}-${index}`, difficulty }
        let question
        try { question = generator.generate(input) } catch (error) { throw new Error(`${slug} failed at seed ${index}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} failed validation at seed ${index}: ${validation.reason ?? 'unknown'}`)
        expect(question.choices).toHaveLength(4); expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4); expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(question.prompt).not.toMatch(/undefined|NaN/u)
        if (question.parameters.wraparound === true) { expect(question.prompt).toContain('Wraparound'); expect(question.explanation.steps.join(' ')).toMatch(/continue from [AZ]/u) }
      }
    }
  }, 120_000)

  it.each(slugs)('creates five unique prompts and immutable deterministic snapshots for %s', (slug) => {
    const signatures = new Set<string>(); const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `letter-series-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature); prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5); expect(prompts.size).toBe(5)
  })
})
