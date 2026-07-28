import { simplifyFraction } from './fraction-math'
import type { Fraction, MixedNumber } from './fraction.types'

export function formatFraction(fraction: Fraction): string {
  const simplified = simplifyFraction(fraction)

  if (simplified.denominator === 1) {
    return String(simplified.numerator)
  }

  return `${simplified.numerator}/${simplified.denominator}`
}

export function formatFractionRaw(fraction: Fraction): string {
  if (fraction.denominator === 1) {
    return String(fraction.numerator)
  }

  return `${fraction.numerator}/${fraction.denominator}`
}

export function formatMixedNumber(mixed: MixedNumber): string {
  if (mixed.numerator === 0) {
    return String(mixed.whole)
  }

  if (mixed.whole === 0) {
    return `${mixed.numerator}/${mixed.denominator}`
  }

  return `${mixed.whole} ${mixed.numerator}/${mixed.denominator}`
}
