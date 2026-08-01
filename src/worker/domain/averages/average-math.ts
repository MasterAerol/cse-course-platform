import type {
  AverageGroup,
  AveragePrecision,
  WeightedValue,
} from './average.types'

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`)
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`)
  }
}

export function sumValues(values: readonly number[]): number {
  return values.reduce((total, value, index) => {
    assertFinite(value, `Value ${index + 1}`)
    return total + value
  }, 0)
}

export function arithmeticMean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('At least one value is required to calculate a mean.')
  }

  return sumValues(values) / values.length
}

export function weightedMean(values: readonly WeightedValue[]): number {
  if (values.length === 0) {
    throw new Error('At least one weighted value is required.')
  }

  let weightedTotal = 0
  let totalWeight = 0

  for (const [index, item] of values.entries()) {
    assertFinite(item.value, `Weighted value ${index + 1}`)
    if (!Number.isFinite(item.weight) || item.weight <= 0) {
      throw new Error(`Weight ${index + 1} must be finite and positive.`)
    }
    weightedTotal += item.value * item.weight
    totalWeight += item.weight
  }

  return weightedTotal / totalWeight
}

export function combinedMean(groups: readonly AverageGroup[]): number {
  if (groups.length === 0) {
    throw new Error('At least one group is required.')
  }

  return weightedMean(groups.map((group, index) => {
    assertFinite(group.mean, `Group mean ${index + 1}`)
    assertPositiveInteger(group.count, `Group count ${index + 1}`)
    return { value: group.mean, weight: group.count }
  }))
}

export function missingValueForMean(
  targetMean: number,
  totalCount: number,
  knownValues: readonly number[],
): number {
  assertFinite(targetMean, 'Target mean')
  assertPositiveInteger(totalCount, 'Total count')
  if (knownValues.length !== totalCount - 1) {
    throw new Error('Known values must contain exactly one fewer item than the total count.')
  }

  return targetMean * totalCount - sumValues(knownValues)
}

export function meanAfterAdding(
  currentMean: number,
  currentCount: number,
  addedValue: number,
): number {
  assertFinite(currentMean, 'Current mean')
  assertPositiveInteger(currentCount, 'Current count')
  assertFinite(addedValue, 'Added value')

  return (currentMean * currentCount + addedValue) / (currentCount + 1)
}

export function meanAfterRemoving(
  currentMean: number,
  currentCount: number,
  removedValue: number,
): number {
  assertFinite(currentMean, 'Current mean')
  assertPositiveInteger(currentCount, 'Current count')
  assertFinite(removedValue, 'Removed value')
  if (currentCount < 2) {
    throw new Error('At least two values are required before removing one.')
  }

  return (currentMean * currentCount - removedValue) / (currentCount - 1)
}

export function requiredValueForTargetMean(
  currentMean: number,
  currentCount: number,
  targetMean: number,
): number {
  assertFinite(currentMean, 'Current mean')
  assertPositiveInteger(currentCount, 'Current count')
  assertFinite(targetMean, 'Target mean')

  return targetMean * (currentCount + 1) - currentMean * currentCount
}

export function roundAverage(
  value: number,
  precision: AveragePrecision,
): number {
  assertFinite(value, 'Average')
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function averagesEqual(
  left: number,
  right: number,
  tolerance = 1e-9,
): boolean {
  assertFinite(left, 'Left average')
  assertFinite(right, 'Right average')
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error('Tolerance must be finite and nonnegative.')
  }
  return Math.abs(left - right) <= tolerance
}
