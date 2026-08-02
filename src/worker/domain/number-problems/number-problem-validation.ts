import {
  hasParity,
  hasRemainder,
  isValidDigit,
  uniqueIntegerSolutions,
} from './number-problem-math'
import type { NumberParity } from './number-problem.types'

export function assertIntegerAnswer(value: number): number {
  if (!Number.isInteger(value) || !Number.isFinite(value)) throw new Error('Answer must be a finite integer.')
  return value
}

export function hasUniqueIntegerSolution(input: {
  minimum: number
  maximum: number
  predicate: (value: number) => boolean
}): boolean {
  return uniqueIntegerSolutions(input.minimum, input.maximum, input.predicate).length === 1
}

export function validateDigitPair(tens: number, ones: number, requireReversible = false): boolean {
  return isValidDigit(tens, false) && isValidDigit(ones, !requireReversible) && (!requireReversible || ones !== 0)
}

export function validateParitySequence(values: readonly number[], parity: NumberParity): boolean {
  return values.every((value) => hasParity(value, parity)) && values.every((value, index) =>
    index === 0 || value - (values[index - 1] as number) === 2,
  )
}

export function validateRemainderCondition(value: number, divisor: number, remainder: number): boolean {
  return Number.isInteger(value) && Number.isInteger(divisor) && divisor > 0 &&
    Number.isInteger(remainder) && remainder >= 0 && remainder < divisor &&
    hasRemainder(value, divisor, remainder)
}

