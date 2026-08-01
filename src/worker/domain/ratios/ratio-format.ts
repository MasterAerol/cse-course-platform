import { simplifyRatio } from './ratio-math'
import type { Ratio } from './ratio.types'

export function formatRatio(ratio: Ratio): string {
  const simplified = simplifyRatio(ratio)

  return `${simplified.left}:${simplified.right}`
}

export function formatRatioRaw(ratio: Ratio): string {
  return `${ratio.left}:${ratio.right}`
}

export function formatControlledNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error('Cannot format a non-finite ratio result.')
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')
}
