import { simplifyFraction } from '../fractions/fraction-math'
import type { TravelAnswerUnit, TravelRational } from './distance-speed-time.types'

export function travelToNumber(value: TravelRational): number {
  const reduced = simplifyFraction(value)
  return reduced.numerator / reduced.denominator
}

export function formatTravelNumber(value: TravelRational): string {
  const reduced = simplifyFraction(value)
  if (reduced.denominator === 1) return String(reduced.numerator)
  const whole = Math.trunc(reduced.numerator / reduced.denominator)
  const remainder = Math.abs(reduced.numerator % reduced.denominator)
  return whole === 0 ? `${reduced.numerator}/${reduced.denominator}` : `${whole} ${remainder}/${reduced.denominator}`
}

export function formatTravelAnswer(value: TravelRational, unit: TravelAnswerUnit): string {
  return `${formatTravelNumber(value)} ${unit}`
}
