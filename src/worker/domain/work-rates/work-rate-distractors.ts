import type { DistractorMistakeType } from '../distractor-models'
import { rationalIdentity } from './work-rate-math'
import type { Rational } from './work-rate.types'

export interface WorkRateDistractor {
  value: Rational
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore: number
}

export function chooseWorkRateDistractors(input: {
  correct: Rational
  candidates: readonly (WorkRateDistractor | null)[]
  format: (value: Rational) => string
}): WorkRateDistractor[] {
  const correctIdentity = rationalIdentity(input.correct)
  const identities = new Set([correctIdentity])
  const visible = new Set([input.format(input.correct)])
  const selected: WorkRateDistractor[] = []
  for (const candidate of input.candidates.filter((item): item is WorkRateDistractor => item !== null)) {
    const identity = rationalIdentity(candidate.value)
    const text = input.format(candidate.value)
    if (candidate.value.numerator <= 0 || identities.has(identity) || visible.has(text)) continue
    identities.add(identity)
    visible.add(text)
    selected.push(candidate)
    if (selected.length === 3) return selected
  }
  throw new Error('Documented mistake models did not yield three unique distractors.')
}

export function workRateDistractor(
  value: Rational,
  mistakeType: DistractorMistakeType,
  operation: string,
  inputs: number[],
  qualityScore = 1,
): WorkRateDistractor {
  return { value, mistakeType, operation, inputs, qualityScore }
}
