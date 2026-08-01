import { averagesEqual, roundAverage } from './average-math'
import type { AveragePrecision } from './average.types'

export function assertControlledAverage(
  value: number,
  precision: AveragePrecision = 2,
): number {
  if (!Number.isFinite(value)) {
    throw new Error('Average result must be finite.')
  }
  const rounded = roundAverage(value, precision)
  if (!averagesEqual(value, rounded, 1e-9)) {
    throw new Error(`Average result must use at most ${precision} decimal places.`)
  }
  return rounded
}

export function hasUniqueAverageValues(
  values: readonly number[],
  precision: AveragePrecision = 2,
): boolean {
  return new Set(values.map((value) => roundAverage(value, precision).toFixed(precision))).size === values.length
}
