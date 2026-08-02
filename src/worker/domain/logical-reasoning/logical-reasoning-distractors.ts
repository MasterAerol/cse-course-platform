import type { LogicalChoiceCandidate } from './logical-reasoning.types'
import type { DistractorMistakeType } from '../distractor-models'

export function logicalDistractor(
  text: string,
  mistakeType: DistractorMistakeType,
): LogicalChoiceCandidate {
  return { text, mistakeType }
}

export function selectLogicalDistractors(
  correct: string,
  candidates: readonly LogicalChoiceCandidate[],
): LogicalChoiceCandidate[] {
  const seen = new Set([correct.trim().toLocaleLowerCase()])
  const selected: LogicalChoiceCandidate[] = []
  for (const candidate of candidates) {
    const normalized = candidate.text.trim().toLocaleLowerCase()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      selected.push(candidate)
    }
    if (selected.length === 3) return selected
  }
  throw new Error('Logical question does not contain three unique modeled distractors.')
}
