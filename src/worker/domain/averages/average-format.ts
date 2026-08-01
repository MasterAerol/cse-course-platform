import { roundAverage } from './average-math'
import type { AveragePrecision } from './average.types'

export function formatAverage(
  value: number,
  precision: AveragePrecision = 2,
): string {
  const rounded = roundAverage(value, precision)
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(precision).replace(/0+$/u, '').replace(/\.$/u, '')
}

export function formatAverageMoney(
  value: number,
  precision: AveragePrecision = 2,
): string {
  return `\u20b1${formatAverage(value, precision)}`
}
