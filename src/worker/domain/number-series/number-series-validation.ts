import { assertSeriesValue, differenceTable } from './number-series-math'
import { normalizedNumericText } from './number-series-format'
import type { CompetingPattern, SeriesRuleFamily } from './number-series.types'

export function hasUniqueNumericChoices(values: readonly number[]): boolean {
  return values.length === 4 && new Set(values.map(normalizedNumericText)).size === 4
}

export function hasExactlyOneNumericAnswer(values: readonly number[], correct: number): boolean {
  return values.filter((value) => value === correct).length === 1
}

export function verifyAllTerms(actual: readonly number[], expected: readonly number[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index] && Number.isSafeInteger(value) && Math.abs(value) <= 10_000)
}

function constantDifferenceNext(values: readonly number[]): number | null {
  const differences = differenceTable(values)[1] ?? []
  return differences.length > 0 && differences.every((value) => value === differences[0]) ? assertSeriesValue((values[values.length - 1] ?? 0) + (differences[0] ?? 0)) : null
}

function constantRatioNext(values: readonly number[]): number | null {
  if (values.some((value) => value === 0)) return null
  const ratio = (values[1] ?? 0) / (values[0] ?? 1)
  return Number.isInteger(ratio) && values.slice(1).every((value, index) => value === (values[index] ?? 0) * ratio) ? assertSeriesValue((values[values.length - 1] ?? 0) * ratio) : null
}

function secondDifferenceNext(values: readonly number[]): number | null {
  const table = differenceTable(values)
  const first = table[1] ?? []
  const second = table[2] ?? []
  return second.length >= 2 && second.every((value) => value === second[0]) ? assertSeriesValue((values[values.length - 1] ?? 0) + (first[first.length - 1] ?? 0) + (second[0] ?? 0)) : null
}

function recursiveNext(values: readonly number[]): number | null {
  if (values.length < 5) return null
  const adjustment = (values[2] ?? 0) - (values[1] ?? 0) - (values[0] ?? 0)
  return values.slice(2).every((value, index) => value === (values[index + 1] ?? 0) + (values[index] ?? 0) + adjustment) ? assertSeriesValue((values[values.length - 1] ?? 0) + (values[values.length - 2] ?? 0) + adjustment) : null
}

function interleavedNext(values: readonly number[]): number | null {
  if (values.length < 6) return null
  const odd = values.filter((_, index) => index % 2 === 0)
  const even = values.filter((_, index) => index % 2 === 1)
  const target = values.length % 2 === 0 ? odd : even
  if (target.length < 3) return null
  const difference = (target[1] ?? 0) - (target[0] ?? 0)
  return target.slice(1).every((value, index) => value - (target[index] ?? 0) === difference) ? assertSeriesValue((target[target.length - 1] ?? 0) + difference) : null
}

export function detectCompetingPatterns(values: readonly number[], intended: SeriesRuleFamily, intendedNext: number): CompetingPattern[] {
  const candidates: readonly [SeriesRuleFamily, number | null][] = [
    ['arithmetic', constantDifferenceNext(values)],
    ['geometric', constantRatioNext(values)],
    ['increasing-difference', secondDifferenceNext(values)],
    ['recursive', recursiveNext(values)],
    ['interleaved', interleavedNext(values)],
  ]
  return candidates.filter((entry): entry is [SeriesRuleFamily, number] => entry[1] !== null && entry[0] !== intended && entry[1] !== intendedNext).map(([family, nextValue]) => ({ family, nextValue }))
}

export function isUnambiguousSeries(values: readonly number[], intended: SeriesRuleFamily, intendedNext: number): boolean {
  return values.length >= 5 && detectCompetingPatterns(values, intended, intendedNext).length === 0
}
