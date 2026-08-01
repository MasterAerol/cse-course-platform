import { normalizeRatio, ratioIdentity } from './ratio-math'
import type { Ratio } from './ratio.types'

export function assertValidRatio(ratio: Ratio): Ratio {
  return normalizeRatio(ratio)
}

export function hasUniqueRatioValues(ratios: readonly Ratio[]): boolean {
  return new Set(ratios.map(ratioIdentity)).size === ratios.length
}

export function assertControlledResult(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Ratio result must be finite and positive.')
  }

  if (Math.abs(value * 100 - Math.round(value * 100)) > Number.EPSILON) {
    throw new Error('Ratio result must use at most two decimal places.')
  }

  return value
}
