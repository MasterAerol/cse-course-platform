import { compareFractions, simplifyFraction } from '../fractions/fraction-math'
import { WHOLE_JOB, ZERO_WORK, evaluateWorkTimeline, rationalIdentity } from './work-rate-math'
import type { Rational, WorkPhase } from './work-rate.types'

export function isPositiveRational(value: Rational): boolean {
  try {
    return simplifyFraction(value).numerator > 0
  } catch {
    return false
  }
}

export function hasPositiveNetRate(value: Rational): boolean {
  return isPositiveRational(value)
}

export function validateTimeline(phases: readonly WorkPhase[], mustComplete: boolean): boolean {
  try {
    const result = evaluateWorkTimeline(phases)
    return mustComplete
      ? compareFractions(result.completed, WHOLE_JOB) === 0
      : compareFractions(result.completed, ZERO_WORK) >= 0 && compareFractions(result.completed, WHOLE_JOB) <= 0
  } catch {
    return false
  }
}

export function hasUniqueRationalValues(values: readonly Rational[]): boolean {
  return new Set(values.map(rationalIdentity)).size === values.length
}

