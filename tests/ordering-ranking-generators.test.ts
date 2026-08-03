import { describe, expect, it } from 'vitest'
import { normalizeRankingAnswer, ordinal, rankingNumericValue } from '../src/worker/domain/ordering-ranking/ordering-ranking-format'
import { middlePositions, movePosition, oppositeRank, overtake, overtakenBy, peopleBetween, rankFromPeopleAfter, rankFromPeopleBefore, swapPositions, totalFromTwoRanks, updateQueue } from '../src/worker/domain/ordering-ranking/ordering-ranking-math'
import { compareUniquely, hasComparisonCycle, hasExactlyOneRankingAnswer, hasUniqueRankingChoices, uniqueTotalOrder } from '../src/worker/domain/ordering-ranking/ordering-ranking-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['left-right-ranking', 'total-from-two-ranks', 'rearranged-position', 'comparative-ordering', 'before-after-order', 'middle-position', 'multi-rank-comparison', 'queue-line-ranking', 'mixed-ordering-ranking'] as const satisfies readonly GeneratorSlug[]

describe('Ordering and Ranking pure utilities', () => {
  it('computes opposite, total, count, movement, swap, and middle formulas', () => {
    expect(oppositeRank(30, 8)).toBe(23)
    expect(totalFromTwoRanks(8, 12)).toBe(19)
    expect(rankFromPeopleBefore(7)).toBe(8)
    expect(rankFromPeopleAfter(20, 4)).toBe(16)
    expect(movePosition(9, 3, 'right', 20)).toBe(12)
    expect(overtake(9, 3, 20)).toBe(6)
    expect(overtakenBy(9, 3, 20)).toBe(12)
    expect(swapPositions(4, 11, 20)).toEqual([11, 4])
    expect(middlePositions(11)).toEqual([6])
    expect(middlePositions(12)).toEqual([6, 7])
    expect(peopleBetween(5, 11)).toBe(5)
  })
  it('updates queue ranks only for changes ahead of the named person', () => {
    expect(updateQueue({ total: 20, rankFromFront: 8 }, { kind: 'leave-front', count: 3 })).toEqual({ total: 17, rankFromFront: 5 })
    expect(updateQueue({ total: 20, rankFromFront: 8 }, { kind: 'join-ahead', count: 3 })).toEqual({ total: 23, rankFromFront: 11 })
    expect(updateQueue({ total: 20, rankFromFront: 8 }, { kind: 'leave-behind', count: 3 })).toEqual({ total: 17, rankFromFront: 8 })
    expect(updateQueue({ total: 20, rankFromFront: 8 }, { kind: 'join-back', count: 3 })).toEqual({ total: 23, rankFromFront: 8 })
  })
  it('derives only unambiguous acyclic comparison orders', () => {
    const nodes = ['A', 'B', 'C']
    const edges = [{ higher: 'A', lower: 'B' }, { higher: 'B', lower: 'C' }]
    expect(uniqueTotalOrder(nodes, edges)).toEqual(['A', 'B', 'C'])
    expect(compareUniquely(nodes, edges, 'A', 'C')).toBe('higher')
    expect(hasComparisonCycle(nodes, [...edges, { higher: 'C', lower: 'A' }])).toBe(true)
    expect(uniqueTotalOrder(nodes, [{ higher: 'A', lower: 'B' }])).toBeNull()
  })
  it('normalizes answers and rejects duplicate visible choices', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(23)).toBe('23rd')
    expect(normalizeRankingAnswer('  Ana   and Ben ')).toBe('ANA AND BEN')
    expect(rankingNumericValue('Ana')).toBe(rankingNumericValue(' ana '))
    expect(hasUniqueRankingChoices(['1', '2', '3', '4'])).toBe(true)
    expect(hasUniqueRankingChoices(['1', ' 1 ', '3', '4'])).toBe(false)
    expect(hasExactlyOneRankingAnswer(['A', 'B', 'C', 'D'], 'c')).toBe(true)
  })
})

describe('Ordering and Ranking generator registry', () => {
  it.each(slugs)('registers %s version 1 for all difficulties', (slug) => {
    const generator = getGenerator(slug, 1)
    expect(generator).not.toBeNull()
    expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })
  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error('Missing ' + slug)
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: 'ordering-ranking-' + slug + '-' + index, difficulty }
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
        expect(new Set(question.choices.map((choice) => normalizeRankingAnswer(choice.text))).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(question.prompt).not.toMatch(/undefined|NaN/u)
      }
    }
  }, 120_000)
  it.each(slugs)('produces five unique immutable generated snapshots for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: 'ordering-attempt-' + slug, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
