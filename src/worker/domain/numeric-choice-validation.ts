import type { NumericChoiceKind } from './distractor-models'

export function isFiniteSafeNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value)
}

export function roundTo(value: number, decimalPlaces: number): number {
  const multiplier = 10 ** decimalPlaces

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

export function normalizeNumericValue(value: number): number {
  return roundTo(value, 4)
}

export function numericIdentity(value: number): string {
  return normalizeNumericValue(value).toFixed(4)
}

export function hasSupportedPrecision(value: number): boolean {
  return Number.isInteger(roundTo(value, 4) * 10_000)
}

function trimTrailingZeroes(text: string): string {
  return text.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '')
}

function addThousandsSeparators(text: string): string {
  const [integerPart, decimalPart] = text.split('.')
  const formattedInteger = (integerPart ?? '').replace(
    /\B(?=(\d{3})+(?!\d))/gu,
    ',',
  )

  return decimalPart === undefined
    ? formattedInteger
    : `${formattedInteger}.${decimalPart}`
}

export function formatNumericChoice(
  value: number,
  kind: NumericChoiceKind,
): string {
  const normalized = normalizeNumericValue(value)

  if (kind === 'percent') {
    return `${addThousandsSeparators(trimTrailingZeroes(normalized.toFixed(2)))}%`
  }

  if (kind === 'money') {
    return `₱${addThousandsSeparators(trimTrailingZeroes(normalized.toFixed(2)))}`
  }

  if (kind === 'count') {
    return addThousandsSeparators(String(Math.round(normalized)))
  }

  return addThousandsSeparators(trimTrailingZeroes(normalized.toFixed(4)))
}

export function isValidNumericChoice(input: {
  value: number
  kind: NumericChoiceKind
  countable: boolean
}): boolean {
  if (!isFiniteSafeNumber(input.value) || input.value < 0) {
    return false
  }

  if (!hasSupportedPrecision(input.value)) {
    return false
  }

  if (input.countable && !Number.isInteger(normalizeNumericValue(input.value))) {
    return false
  }

  if (input.kind === 'percent' && normalizeNumericValue(input.value) > 500) {
    return false
  }

  return true
}
