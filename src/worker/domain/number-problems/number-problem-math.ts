import type {
  IntegerPair,
  LinearEquation,
  NumberParity,
  Rational,
} from './number-problem.types'

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer.`)
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left)
  let b = Math.abs(right)
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

export function consecutiveSequence(
  start: number,
  count: number,
  step = 1,
): number[] {
  assertInteger(start, 'Start')
  if (!Number.isInteger(count) || count <= 0) throw new Error('Count must be a positive integer.')
  if (!Number.isInteger(step) || step <= 0) throw new Error('Step must be a positive integer.')
  return Array.from({ length: count }, (_, index) => start + index * step)
}

export function hasParity(value: number, parity: NumberParity): boolean {
  assertInteger(value, 'Value')
  return Math.abs(value % 2) === (parity === 'odd' ? 1 : 0)
}

export function isConsecutiveParitySequence(
  values: readonly number[],
  parity: NumberParity,
): boolean {
  return values.length > 0 && values.every((value, index) =>
    hasParity(value, parity) && (index === 0 || value === (values[index - 1] as number) + 2),
  )
}

export function solveLinearPair(
  first: LinearEquation,
  second: LinearEquation,
): IntegerPair | null {
  const determinant = first.xCoefficient * second.yCoefficient - second.xCoefficient * first.yCoefficient
  if (determinant === 0) return null
  const x = (first.constant * second.yCoefficient - second.constant * first.yCoefficient) / determinant
  const y = (first.xCoefficient * second.constant - second.xCoefficient * first.constant) / determinant
  return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null
}

export function constructTwoDigitNumber(tens: number, ones: number): number {
  if (!isValidDigit(tens, false) || !isValidDigit(ones, true)) {
    throw new Error('Invalid two-digit number digits.')
  }
  return tens * 10 + ones
}

export function reverseTwoDigitNumber(value: number): number {
  if (!Number.isInteger(value) || value < 10 || value > 99 || value % 10 === 0) {
    throw new Error('A reversible two-digit number cannot have a leading-zero reverse.')
  }
  return (value % 10) * 10 + Math.floor(value / 10)
}

export function isValidDigit(value: number, allowZero: boolean): boolean {
  return Number.isInteger(value) && value >= (allowZero ? 0 : 1) && value <= 9
}

export function quotientAndRemainder(
  value: number,
  divisor: number,
): { quotient: number; remainder: number } {
  assertInteger(value, 'Value')
  if (!Number.isInteger(divisor) || divisor <= 0) throw new Error('Divisor must be a positive integer.')
  const remainder = ((value % divisor) + divisor) % divisor
  return { quotient: (value - remainder) / divisor, remainder }
}

export function hasRemainder(value: number, divisor: number, remainder: number): boolean {
  if (!Number.isInteger(remainder) || remainder < 0 || remainder >= divisor) return false
  return quotientAndRemainder(value, divisor).remainder === remainder
}

export function smallestPositiveWithRemainders(
  conditions: readonly { divisor: number; remainder: number }[],
  maximum = 10_000,
): number | null {
  if (conditions.length === 0) throw new Error('At least one remainder condition is required.')
  for (const condition of conditions) {
    if (!Number.isInteger(condition.divisor) || condition.divisor <= 0 ||
      !Number.isInteger(condition.remainder) || condition.remainder < 0 || condition.remainder >= condition.divisor) {
      throw new Error('Every remainder must be an integer from zero to divisor minus one.')
    }
  }
  for (let value = 1; value <= maximum; value += 1) {
    if (conditions.every((condition) => hasRemainder(value, condition.divisor, condition.remainder))) return value
  }
  return null
}

export function rational(numerator: number, denominator: number): Rational {
  assertInteger(numerator, 'Numerator')
  assertInteger(denominator, 'Denominator')
  if (denominator === 0) throw new Error('Denominator cannot be zero.')
  const sign = denominator < 0 ? -1 : 1
  const divisor = gcd(numerator, denominator)
  return { numerator: sign * numerator / divisor, denominator: Math.abs(denominator) / divisor }
}

export function multiplyRational(value: Rational, whole: number): Rational {
  assertInteger(whole, 'Whole')
  return rational(value.numerator * whole, value.denominator)
}

export function divideByRational(whole: number, value: Rational): Rational {
  assertInteger(whole, 'Whole')
  if (value.numerator === 0) throw new Error('Cannot divide by zero.')
  return rational(whole * value.denominator, value.numerator)
}

export function rationalToInteger(value: Rational): number | null {
  return value.denominator === 1 ? value.numerator : null
}

export function uniqueIntegerSolutions(
  minimum: number,
  maximum: number,
  predicate: (value: number) => boolean,
): number[] {
  assertInteger(minimum, 'Minimum')
  assertInteger(maximum, 'Maximum')
  if (minimum > maximum) throw new Error('Minimum cannot exceed maximum.')
  const values: number[] = []
  for (let value = minimum; value <= maximum; value += 1) if (predicate(value)) values.push(value)
  return values
}

