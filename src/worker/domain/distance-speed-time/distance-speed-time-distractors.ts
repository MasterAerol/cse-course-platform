import type { DistractorMistakeType } from '../distractor-models'
import { travelIdentity } from './distance-speed-time-math'
import type { TravelRational } from './distance-speed-time.types'

export interface TravelDistractor {
  value: TravelRational
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore: number
}

export const travelDistractor = (value: TravelRational, mistakeType: DistractorMistakeType, operation: string, inputs: number[], qualityScore = 1): TravelDistractor => ({ value, mistakeType, operation, inputs, qualityScore })

export function chooseTravelDistractors(input: { correct: TravelRational; candidates: readonly TravelDistractor[]; format: (value: TravelRational) => string }): TravelDistractor[] {
  const identities = new Set([travelIdentity(input.correct)])
  const visible = new Set([input.format(input.correct)])
  const selected: TravelDistractor[] = []
  for (const candidate of input.candidates) {
    const identity = travelIdentity(candidate.value); const text = input.format(candidate.value)
    if (candidate.value.numerator <= 0 || identities.has(identity) || visible.has(text)) continue
    identities.add(identity); visible.add(text); selected.push(candidate)
    if (selected.length === 3) return selected
  }
  throw new Error('Documented travel mistake models did not yield three unique distractors.')
}
