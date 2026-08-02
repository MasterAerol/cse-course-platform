import { letterToPosition } from './letter-series-math'

export function formatLetterSeries(terms: readonly (string | null)[]): string {
  return terms.map((term) => term ?? '?').join(', ')
}

export function normalizeVisibleTerm(term: string): string {
  const normalized = term.trim().toUpperCase()
  if (!/^(?:[A-Z]{1,3}|[A-Z][1-9][0-9]*)$/u.test(normalized)) throw new Error('Letter-series term is malformed.')
  if (/^[A-Z]+$/u.test(normalized)) for (const letter of normalized) letterToPosition(letter)
  return normalized
}

export function termNumericValue(term: string): number {
  const normalized = normalizeVisibleTerm(term)
  let value = 0
  for (const character of normalized) value = value * 37 + character.charCodeAt(0)
  return value
}
