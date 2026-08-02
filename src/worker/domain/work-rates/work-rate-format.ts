import { simplifyFraction } from '../fractions/fraction-math'
import type { Rational, WorkRateAnswerUnit } from './work-rate.types'

export function rationalToNumber(value: Rational): number {
  const reduced = simplifyFraction(value)
  return reduced.numerator / reduced.denominator
}

export function formatRational(value: Rational): string {
  const reduced = simplifyFraction(value)
  if (reduced.denominator === 1) return String(reduced.numerator)
  if (Math.abs(reduced.numerator) > reduced.denominator) {
    const whole = Math.trunc(reduced.numerator / reduced.denominator)
    const remainder = Math.abs(reduced.numerator % reduced.denominator)
    return remainder === 0 ? String(whole) : `${whole} ${remainder}/${reduced.denominator}`
  }
  return `${reduced.numerator}/${reduced.denominator}`
}

export function formatWorkRateAnswer(value: Rational, unit: WorkRateAnswerUnit): string {
  return `${formatRational(value)} ${unit}`
}

export function formatHours(value: Rational): string {
  const reduced = simplifyFraction(value)
  if (reduced.denominator === 1) return `${reduced.numerator} hours`
  const minutesNumerator = reduced.numerator * 60
  if (minutesNumerator % reduced.denominator === 0) {
    const totalMinutes = minutesNumerator / reduced.denominator
    const hours = Math.trunc(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} minutes`
    return minutes === 0 ? `${hours} hours` : `${hours} hours ${minutes} minutes`
  }
  return `${formatRational(reduced)} hours`
}

