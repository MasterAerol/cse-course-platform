import type { Fraction, FractionOrder, MixedNumber } from './fraction.types'

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`)
  }
}

export function greatestCommonDivisor(a: number, b: number): number {
  assertInteger(a, 'First value')
  assertInteger(b, 'Second value')

  let first = Math.abs(a)
  let second = Math.abs(b)

  while (second !== 0) {
    const remainder = first % second
    first = second
    second = remainder
  }

  return first
}

export function leastCommonMultiple(a: number, b: number): number {
  assertInteger(a, 'First value')
  assertInteger(b, 'Second value')

  if (a === 0 || b === 0) {
    return 0
  }

  return Math.abs((a / greatestCommonDivisor(a, b)) * b)
}

export function normalizeFraction(fraction: Fraction): Fraction {
  assertInteger(fraction.numerator, 'Numerator')
  assertInteger(fraction.denominator, 'Denominator')

  if (fraction.denominator === 0) {
    throw new Error('Fraction denominator cannot be zero.')
  }

  if (fraction.numerator === 0) {
    return { numerator: 0, denominator: 1 }
  }

  const sign = fraction.denominator < 0 ? -1 : 1

  return {
    numerator: fraction.numerator * sign,
    denominator: Math.abs(fraction.denominator),
  }
}

export function simplifyFraction(fraction: Fraction): Fraction {
  const normalized = normalizeFraction(fraction)
  const divisor = greatestCommonDivisor(
    normalized.numerator,
    normalized.denominator,
  )

  if (divisor === 0) {
    return normalized
  }

  return {
    numerator: normalized.numerator / divisor,
    denominator: normalized.denominator / divisor,
  }
}

export function fractionIdentity(fraction: Fraction): string {
  const simplified = simplifyFraction(fraction)

  return `${simplified.numerator}/${simplified.denominator}`
}

export function fractionsEqual(left: Fraction, right: Fraction): boolean {
  return fractionIdentity(left) === fractionIdentity(right)
}

export function compareFractions(left: Fraction, right: Fraction): FractionOrder {
  const normalizedLeft = normalizeFraction(left)
  const normalizedRight = normalizeFraction(right)
  const leftValue = normalizedLeft.numerator * normalizedRight.denominator
  const rightValue = normalizedRight.numerator * normalizedLeft.denominator

  if (leftValue === rightValue) {
    return 0
  }

  return leftValue < rightValue ? -1 : 1
}

export function addFractions(left: Fraction, right: Fraction): Fraction {
  const normalizedLeft = normalizeFraction(left)
  const normalizedRight = normalizeFraction(right)

  return simplifyFraction({
    numerator:
      normalizedLeft.numerator * normalizedRight.denominator +
      normalizedRight.numerator * normalizedLeft.denominator,
    denominator: normalizedLeft.denominator * normalizedRight.denominator,
  })
}

export function subtractFractions(left: Fraction, right: Fraction): Fraction {
  const normalizedLeft = normalizeFraction(left)
  const normalizedRight = normalizeFraction(right)

  return simplifyFraction({
    numerator:
      normalizedLeft.numerator * normalizedRight.denominator -
      normalizedRight.numerator * normalizedLeft.denominator,
    denominator: normalizedLeft.denominator * normalizedRight.denominator,
  })
}

export function multiplyFractions(left: Fraction, right: Fraction): Fraction {
  const normalizedLeft = normalizeFraction(left)
  const normalizedRight = normalizeFraction(right)

  return simplifyFraction({
    numerator: normalizedLeft.numerator * normalizedRight.numerator,
    denominator: normalizedLeft.denominator * normalizedRight.denominator,
  })
}

export function divideFractions(left: Fraction, right: Fraction): Fraction {
  const normalizedRight = normalizeFraction(right)

  if (normalizedRight.numerator === 0) {
    throw new Error('Cannot divide by a zero fraction.')
  }

  return multiplyFractions(left, {
    numerator: normalizedRight.denominator,
    denominator: normalizedRight.numerator,
  })
}

export function improperToMixed(fraction: Fraction): MixedNumber {
  const normalized = simplifyFraction(fraction)
  const sign = normalized.numerator < 0 ? -1 : 1
  const absoluteNumerator = Math.abs(normalized.numerator)

  return {
    whole: Math.trunc(absoluteNumerator / normalized.denominator) * sign,
    numerator: absoluteNumerator % normalized.denominator,
    denominator: normalized.denominator,
  }
}

export function mixedToImproper(mixed: MixedNumber): Fraction {
  assertInteger(mixed.whole, 'Whole number')
  assertInteger(mixed.numerator, 'Mixed numerator')
  assertInteger(mixed.denominator, 'Mixed denominator')

  if (mixed.denominator === 0) {
    throw new Error('Mixed number denominator cannot be zero.')
  }

  const sign = mixed.whole < 0 ? -1 : 1

  return simplifyFraction({
    numerator:
      mixed.whole * mixed.denominator + sign * Math.abs(mixed.numerator),
    denominator: mixed.denominator,
  })
}
