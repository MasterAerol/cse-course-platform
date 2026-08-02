import { simplifyFraction } from '../fractions/fraction-math'
import { interestIdentity } from './simple-interest-math'
import type { InterestRational } from './simple-interest.types'

export function isPositiveInterestValue(value: InterestRational): boolean {
  try { return simplifyFraction(value).numerator > 0 } catch { return false }
}

export function isWholeCentavos(value: InterestRational): boolean {
  try { const reduced = simplifyFraction(value); return reduced.numerator % reduced.denominator === 0 } catch { return false }
}

export function hasUniqueInterestValues(values: readonly InterestRational[]): boolean {
  return new Set(values.map(interestIdentity)).size === values.length
}
