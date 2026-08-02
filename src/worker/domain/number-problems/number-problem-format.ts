import type { Rational } from './number-problem.types'

export function formatIntegerList(values: readonly number[]): string {
  if (values.length === 0) return ''
  if (values.length === 1) return String(values[0])
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`
}

export function formatRational(value: Rational): string {
  return value.denominator === 1 ? String(value.numerator) : `${value.numerator}/${value.denominator}`
}

export function formatIntegerAnswer(value: number, suffix = ''): string {
  if (!Number.isInteger(value)) throw new Error('A number-problem answer must be an integer.')
  return `${value}${suffix}`
}

