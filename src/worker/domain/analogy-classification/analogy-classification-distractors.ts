import type { AnalogyDistractor } from './analogy-classification.types'
import type { DistractorMistakeType } from '../distractor-models'
import { normalizeAnalogyText } from './analogy-classification-format'

export function analogyDistractor(text: string, mistakeType: DistractorMistakeType, numericValue?: number): AnalogyDistractor {
  return { text, mistakeType, ...(numericValue === undefined ? {} : { numericValue }) }
}

export function selectAnalogyDistractors(correct: string, candidates: readonly AnalogyDistractor[]): AnalogyDistractor[] {
  const seen = new Set([normalizeAnalogyText(correct)])
  const selected: AnalogyDistractor[] = []
  for (const candidate of candidates) {
    const normalized = normalizeAnalogyText(candidate.text)
    if (!seen.has(normalized)) { seen.add(normalized); selected.push(candidate) }
    if (selected.length === 3) return selected
  }
  throw new Error('Analogy question does not contain three unique modeled distractors.')
}
