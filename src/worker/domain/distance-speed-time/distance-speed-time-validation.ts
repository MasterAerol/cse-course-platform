import { simplifyFraction } from '../fractions/fraction-math'
import { travelIdentity } from './distance-speed-time-math'
import type { TravelRational } from './distance-speed-time.types'

export function isPositiveTravelValue(value: TravelRational): boolean {
  try { return simplifyFraction(value).numerator > 0 } catch { return false }
}

export function hasUniqueTravelValues(values: readonly TravelRational[]): boolean {
  return new Set(values.map(travelIdentity)).size === values.length
}
