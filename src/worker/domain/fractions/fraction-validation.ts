import {
  compareFractions,
  fractionIdentity,
  normalizeFraction,
} from './fraction-math'
import type { Fraction } from './fraction.types'

export function assertValidFraction(fraction: Fraction): Fraction {
  return normalizeFraction(fraction)
}

export function assertPositiveFraction(fraction: Fraction): Fraction {
  const normalized = normalizeFraction(fraction)

  if (compareFractions(normalized, { numerator: 0, denominator: 1 }) <= 0) {
    throw new Error('Fraction must be positive.')
  }

  return normalized
}

export function hasUniqueRationalValues(fractions: readonly Fraction[]): boolean {
  return new Set(fractions.map(fractionIdentity)).size === fractions.length
}
