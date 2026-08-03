import type { DistractorMistakeType } from '../distractor-models'
import { normalizeSyllogismChoice } from './syllogism-format'
import type { SyllogismDistractor } from './syllogism.types'

export function syllogismDistractor(text: string, mistakeType: DistractorMistakeType): SyllogismDistractor {
  return { text, mistakeType }
}

export function selectSyllogismDistractors(correct: string, candidates: readonly SyllogismDistractor[]): SyllogismDistractor[] {
  const seen = new Set([normalizeSyllogismChoice(correct)])
  const selected: SyllogismDistractor[] = []
  for (const candidate of candidates) {
    const normalized = normalizeSyllogismChoice(candidate.text)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      selected.push(candidate)
    }
    if (selected.length === 3) return selected
  }
  throw new Error('Syllogism question lacks three unique modeled distractors.')
}
