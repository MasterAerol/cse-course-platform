import type { DistractorMistakeType } from '../distractor-models'
import { interestIdentity } from './simple-interest-math'
import type { InterestRational } from './simple-interest.types'

export interface InterestDistractor {
  value: InterestRational
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore: number
}

export const interestDistractor = (value: InterestRational, mistakeType: DistractorMistakeType, operation: string, inputs: number[], qualityScore = 1): InterestDistractor => ({ value, mistakeType, operation, inputs, qualityScore })

export function chooseInterestDistractors(input: { correct: InterestRational; candidates: readonly (InterestDistractor | null)[]; format: (value: InterestRational) => string }): InterestDistractor[] {
  const identities = new Set([interestIdentity(input.correct)]); const visible = new Set([input.format(input.correct)]); const selected: InterestDistractor[] = []
  for (const candidate of input.candidates.filter((item): item is InterestDistractor => item !== null)) {
    const identity = interestIdentity(candidate.value); const text = input.format(candidate.value)
    if (candidate.value.numerator <= 0 || identities.has(identity) || visible.has(text)) continue
    identities.add(identity); visible.add(text); selected.push(candidate)
    if (selected.length === 3) return selected
  }
  throw new Error('Documented simple-interest mistakes did not yield three unique distractors.')
}
