import type { DistractorMistakeType } from '../distractor-models'
import { normalizeVisibleTerm } from './letter-series-format'
import type { LetterSeriesDistractor } from './letter-series.types'

export function letterDistractor(text: string, mistakeType: DistractorMistakeType): LetterSeriesDistractor {
  return { text: normalizeVisibleTerm(text), mistakeType }
}

export function selectLetterDistractors(correct: string, candidates: readonly LetterSeriesDistractor[]): LetterSeriesDistractor[] {
  const seen = new Set([normalizeVisibleTerm(correct)])
  const selected: LetterSeriesDistractor[] = []
  for (const candidate of candidates) {
    const normalized = normalizeVisibleTerm(candidate.text)
    if (!seen.has(normalized)) { seen.add(normalized); selected.push({ ...candidate, text: normalized }) }
    if (selected.length === 3) return selected
  }
  throw new Error('Letter Series question does not contain three unique modeled distractors.')
}
