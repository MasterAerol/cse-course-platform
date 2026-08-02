import type { DistractorMistakeType } from '../distractor-models'
import { normalizedNumericText } from './number-series-format'
import type { SeriesDistractor } from './number-series.types'

export function seriesDistractor(value: number, mistakeType: DistractorMistakeType): SeriesDistractor {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 10_000) throw new Error('Series distractor is outside the readable bounds.')
  return { value, mistakeType }
}

export function selectSeriesDistractors(correct: number, candidates: readonly SeriesDistractor[]): SeriesDistractor[] {
  const seen = new Set([normalizedNumericText(correct)])
  const selected: SeriesDistractor[] = []
  for (const candidate of candidates) {
    const normalized = normalizedNumericText(candidate.value)
    if (!seen.has(normalized)) { seen.add(normalized); selected.push(candidate) }
    if (selected.length === 3) return selected
  }
  throw new Error('Number Series question does not contain three unique modeled distractors.')
}
