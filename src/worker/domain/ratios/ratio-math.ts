import type {
  Ratio,
  RatioOrder,
  RatioShares,
  SupportedRatioUnit,
} from './ratio.types'

const unitFactors: Readonly<Record<SupportedRatioUnit, number>> = {
  mm: 1,
  cm: 10,
  m: 1_000,
  km: 1_000_000,
  g: 1,
  kg: 1_000,
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number.`)
  }
}

function assertPositiveInteger(value: number, label: string): void {
  assertFinitePositive(value, label)

  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`)
  }
}

export function greatestCommonDivisor(left: number, right: number): number {
  if (!Number.isInteger(left) || !Number.isInteger(right)) {
    throw new Error('Greatest common divisor inputs must be integers.')
  }

  let first = Math.abs(left)
  let second = Math.abs(right)

  while (second !== 0) {
    const remainder = first % second
    first = second
    second = remainder
  }

  return first
}

export function normalizeRatio(ratio: Ratio): Ratio {
  assertPositiveInteger(ratio.left, 'Left ratio term')
  assertPositiveInteger(ratio.right, 'Right ratio term')

  return { left: ratio.left, right: ratio.right }
}

export function simplifyRatio(ratio: Ratio): Ratio {
  const normalized = normalizeRatio(ratio)
  const divisor = greatestCommonDivisor(normalized.left, normalized.right)

  return {
    left: normalized.left / divisor,
    right: normalized.right / divisor,
  }
}

export function ratioIdentity(ratio: Ratio): string {
  const simplified = simplifyRatio(ratio)

  return `${simplified.left}:${simplified.right}`
}

export function ratiosEqual(left: Ratio, right: Ratio): boolean {
  const normalizedLeft = normalizeRatio(left)
  const normalizedRight = normalizeRatio(right)

  return (
    normalizedLeft.left * normalizedRight.right ===
    normalizedRight.left * normalizedLeft.right
  )
}

export function compareRatios(left: Ratio, right: Ratio): RatioOrder {
  const normalizedLeft = normalizeRatio(left)
  const normalizedRight = normalizeRatio(right)
  const leftProduct = normalizedLeft.left * normalizedRight.right
  const rightProduct = normalizedRight.left * normalizedLeft.right

  if (leftProduct === rightProduct) {
    return 0
  }

  return leftProduct < rightProduct ? -1 : 1
}

export function solveProportion(
  firstNumerator: number,
  firstDenominator: number,
  secondNumerator: number,
): number {
  assertFinitePositive(firstNumerator, 'First numerator')
  assertFinitePositive(firstDenominator, 'First denominator')
  assertFinitePositive(secondNumerator, 'Second numerator')

  return (firstDenominator * secondNumerator) / firstNumerator
}

export function calculateDirectProportion(
  firstInput: number,
  firstOutput: number,
  secondInput: number,
): number {
  assertFinitePositive(firstInput, 'First input')
  assertFinitePositive(firstOutput, 'First output')
  assertFinitePositive(secondInput, 'Second input')

  return (firstOutput * secondInput) / firstInput
}

export function calculateInverseProportion(
  firstInput: number,
  firstOutput: number,
  secondInput: number,
): number {
  assertFinitePositive(firstInput, 'First input')
  assertFinitePositive(firstOutput, 'First output')
  assertFinitePositive(secondInput, 'Second input')

  return (firstInput * firstOutput) / secondInput
}

export function shareInRatio(total: number, ratio: Ratio): RatioShares {
  assertFinitePositive(total, 'Total')
  const normalized = normalizeRatio(ratio)
  const totalParts = normalized.left + normalized.right
  const valuePerPart = total / totalParts

  return {
    left: valuePerPart * normalized.left,
    right: valuePerPart * normalized.right,
  }
}

export function normalizeUnitQuantity(
  value: number,
  from: SupportedRatioUnit,
  to: SupportedRatioUnit,
): number {
  assertFinitePositive(value, 'Quantity')
  const lengthUnits = new Set<SupportedRatioUnit>(['mm', 'cm', 'm', 'km'])
  const massUnits = new Set<SupportedRatioUnit>(['g', 'kg'])

  if (
    (lengthUnits.has(from) && !lengthUnits.has(to)) ||
    (massUnits.has(from) && !massUnits.has(to))
  ) {
    throw new Error('Ratio units must measure the same kind of quantity.')
  }

  return (value * unitFactors[from]) / unitFactors[to]
}
