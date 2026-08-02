import { simplifyFraction } from '../fractions/fraction-math'
import { annualRateToPercent } from './simple-interest-math'
import type { InterestAnswerUnit, InterestRational } from './simple-interest.types'

export function interestToNumber(value: InterestRational): number {
  const reduced = simplifyFraction(value)
  return reduced.numerator / reduced.denominator
}

export function formatMoneyFromCentavos(value: InterestRational): string {
  const reduced = simplifyFraction(value)
  const centavos = reduced.numerator / reduced.denominator
  if (!Number.isInteger(centavos)) throw new Error('Money must resolve to whole centavos before formatting.')
  const pesos = centavos / 100
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: centavos % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`
}

function formatPlain(value: InterestRational): string {
  const reduced = simplifyFraction(value)
  if (reduced.denominator === 1) return String(reduced.numerator)
  const decimal = reduced.numerator / reduced.denominator
  return Number.isInteger(decimal * 100) ? decimal.toFixed(2).replace(/\.00$/u, '') : `${reduced.numerator}/${reduced.denominator}`
}

export function formatInterestAnswer(value: InterestRational, unit: InterestAnswerUnit): string {
  if (unit === 'money') return formatMoneyFromCentavos(value)
  if (unit === 'option-a-money') return `Option A by ${formatMoneyFromCentavos(value)}`
  if (unit === 'option-b-money') return `Option B by ${formatMoneyFromCentavos(value)}`
  if (unit === 'percent') return `${formatPlain(annualRateToPercent(value))}% per year`
  return `${formatPlain(value)} ${unit}`
}
