import { alphabetGap, letterToPosition, moveLetter } from './letter-series-math'
import { normalizeVisibleTerm } from './letter-series-format'
import type { LetterCompetingPattern, LetterSeriesRuleFamily } from './letter-series.types'

export const hasUniqueVisibleChoices = (choices: readonly string[]): boolean => choices.length === 4 && new Set(choices.map(normalizeVisibleTerm)).size === 4
export const hasExactlyOneVisibleAnswer = (choices: readonly string[], correct: string): boolean => choices.map(normalizeVisibleTerm).filter((choice) => choice === normalizeVisibleTerm(correct)).length === 1

export function validateAlternatingCycle(terms: readonly string[], cycle: readonly number[]): boolean {
  if (terms.length < cycle.length * 2 + 1 || cycle.length < 2) return false
  return terms.slice(1).every((term, index) => alphabetGap(terms[index] ?? '', term) === cycle[index % cycle.length])
}

function constantNext(terms: readonly string[]): string | null {
  if (terms.length < 4 || terms.some((term) => !/^[A-Z]$/u.test(term))) return null
  const gaps = terms.slice(1).map((term, index) => alphabetGap(terms[index] ?? '', term))
  return gaps.every((gap) => gap === gaps[0]) ? moveLetter(terms[terms.length - 1] ?? '', gaps[0] ?? 0) : null
}

function alternatingNext(terms: readonly string[]): string | null {
  if (terms.length < 5 || terms.some((term) => !/^[A-Z]$/u.test(term))) return null
  const gaps = terms.slice(1).map((term, index) => alphabetGap(terms[index] ?? '', term))
  if (!gaps.every((gap, index) => gap === gaps[index % 2])) return null
  return moveLetter(terms[terms.length - 1] ?? '', gaps[gaps.length % 2] ?? 0)
}

function increasingNext(terms: readonly string[]): string | null {
  if (terms.length < 5 || terms.some((term) => !/^[A-Z]$/u.test(term))) return null
  const gaps = terms.slice(1).map((term, index) => alphabetGap(terms[index] ?? '', term))
  const changes = gaps.slice(1).map((gap, index) => gap - (gaps[index] ?? 0))
  return changes.length > 1 && changes.every((change) => change === changes[0]) ? moveLetter(terms[terms.length - 1] ?? '', (gaps[gaps.length - 1] ?? 0) + (changes[0] ?? 0)) : null
}

function interleavedNext(terms: readonly string[]): string | null {
  if (terms.length < 6 || terms.some((term) => !/^[A-Z]$/u.test(term))) return null
  const branch = terms.length % 2 === 0 ? terms.filter((_, index) => index % 2 === 0) : terms.filter((_, index) => index % 2 === 1)
  const step = alphabetGap(branch[0] ?? '', branch[1] ?? '')
  return branch.slice(1).every((term, index) => alphabetGap(branch[index] ?? '', term) === step) ? moveLetter(branch[branch.length - 1] ?? '', step) : null
}

export function detectCompetingLetterPatterns(terms: readonly string[], intended: LetterSeriesRuleFamily, intendedNext: string): LetterCompetingPattern[] {
  const candidates: readonly [LetterSeriesRuleFamily, string | null][] = [['constant', constantNext(terms)], ['alternating', alternatingNext(terms)], ['increasing-gap', increasingNext(terms)], ['interleaved', interleavedNext(terms)]]
  return candidates.filter((entry): entry is [LetterSeriesRuleFamily, string] => entry[1] !== null && entry[0] !== intended && entry[1] !== intendedNext).map(([family, nextTerm]) => ({ family, nextTerm }))
}

export function isUnambiguousLetterSeries(terms: readonly string[], intended: LetterSeriesRuleFamily, intendedNext: string): boolean {
  return terms.length >= 5 && detectCompetingLetterPatterns(terms, intended, intendedNext).length === 0
}

export function validateLetterTerms(terms: readonly string[]): boolean {
  try { return terms.length >= 4 && terms.every((term) => { const normalized = normalizeVisibleTerm(term); if (/^[A-Z]+$/u.test(normalized)) for (const letter of normalized) letterToPosition(letter); return true }) } catch { return false }
}
