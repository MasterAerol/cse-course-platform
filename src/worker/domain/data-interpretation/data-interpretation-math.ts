export const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
export const arithmeticMean = (values: readonly number[]) => {
  if (values.length === 0) throw new Error('A mean requires at least one value.')
  return sum(values) / values.length
}
export const weightedMean = (values: readonly number[], weights: readonly number[]) => {
  if (values.length === 0 || values.length !== weights.length) throw new Error('Values and weights must have equal nonzero lengths.')
  const weightTotal = sum(weights)
  if (weightTotal === 0) throw new Error('Weight total cannot be zero.')
  return values.reduce((total, value, index) => total + value * (weights[index] ?? 0), 0) / weightTotal
}
export const absoluteDifference = (first: number, second: number) => Math.abs(first - second)
export const percentageShare = (part: number, whole: number) => {
  if (whole === 0) throw new Error('Percentage denominator cannot be zero.')
  return part / whole * 100
}
export const percentChange = (original: number, current: number) => {
  if (original === 0) throw new Error('Original value cannot be zero.')
  return (current - original) / original * 100
}
export const ratioValue = (first: number, second: number) => {
  if (second === 0) throw new Error('Ratio denominator cannot be zero.')
  return first / second
}
export const pieDegrees = (percentage: number) => percentage * 3.6
export const piePercentage = (degrees: number) => degrees / 3.6

export function greatestCommonDivisor(first: number, second: number): number {
  let a = Math.abs(Math.trunc(first)); let b = Math.abs(Math.trunc(second))
  while (b !== 0) { const remainder = a % b; a = b; b = remainder }
  return a
}
export function simplifiedRatio(first: number, second: number): readonly [number, number] {
  const divisor = greatestCommonDivisor(first, second)
  if (divisor === 0) throw new Error('Cannot simplify a zero-to-zero ratio.')
  return [first / divisor, second / divisor]
}
