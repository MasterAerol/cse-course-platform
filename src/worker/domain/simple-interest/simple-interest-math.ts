import {
  addFractions,
  compareFractions,
  divideFractions,
  fractionIdentity,
  multiplyFractions,
  simplifyFraction,
  subtractFractions,
} from '../fractions/fraction-math'
import type { DayCountBasis, InterestComparison, InterestOption, InterestRational } from './simple-interest.types'

export function interestRational(numerator: number, denominator = 1): InterestRational {
  return simplifyFraction({ numerator, denominator })
}

export function interestIdentity(value: InterestRational): string {
  return fractionIdentity(value)
}

function positive(value: InterestRational, label: string): InterestRational {
  const reduced = simplifyFraction(value)
  if (reduced.numerator <= 0) throw new Error(`${label} must be positive.`)
  return reduced
}

export function percentToAnnualRate(percentBasisPoints: number): InterestRational {
  if (!Number.isInteger(percentBasisPoints) || percentBasisPoints <= 0) throw new Error('Percent basis points must be a positive integer.')
  return interestRational(percentBasisPoints, 10_000)
}

export function annualRateToPercent(rate: InterestRational): InterestRational {
  return multiplyFractions(positive(rate, 'Annual rate'), interestRational(100))
}

export function monthsToYears(months: number): InterestRational {
  if (!Number.isInteger(months) || months <= 0) throw new Error('Months must be a positive integer.')
  return interestRational(months, 12)
}

export function daysToYears(days: number, basis: DayCountBasis): InterestRational {
  if (!Number.isInteger(days) || days <= 0) throw new Error('Days must be a positive integer.')
  if (basis !== 360 && basis !== 365) throw new Error('Day-count basis must be 360 or 365.')
  return interestRational(days, basis)
}

export function simpleInterest(principalCentavos: InterestRational, annualRate: InterestRational, timeYears: InterestRational): InterestRational {
  return multiplyFractions(multiplyFractions(positive(principalCentavos, 'Principal'), positive(annualRate, 'Annual rate')), positive(timeYears, 'Time'))
}

export function principalFromInterest(interestCentavos: InterestRational, annualRate: InterestRational, timeYears: InterestRational): InterestRational {
  return divideFractions(positive(interestCentavos, 'Interest'), multiplyFractions(positive(annualRate, 'Annual rate'), positive(timeYears, 'Time')))
}

export function annualRateFromInterest(interestCentavos: InterestRational, principalCentavos: InterestRational, timeYears: InterestRational): InterestRational {
  return divideFractions(positive(interestCentavos, 'Interest'), multiplyFractions(positive(principalCentavos, 'Principal'), positive(timeYears, 'Time')))
}

export function timeFromInterest(interestCentavos: InterestRational, principalCentavos: InterestRational, annualRate: InterestRational): InterestRational {
  return divideFractions(positive(interestCentavos, 'Interest'), multiplyFractions(positive(principalCentavos, 'Principal'), positive(annualRate, 'Annual rate')))
}

export function maturityValue(principalCentavos: InterestRational, interestCentavos: InterestRational): InterestRational {
  return addFractions(positive(principalCentavos, 'Principal'), positive(interestCentavos, 'Interest'))
}

export function interestFromMaturity(maturityCentavos: InterestRational, principalCentavos: InterestRational): InterestRational {
  const interest = subtractFractions(positive(maturityCentavos, 'Maturity value'), positive(principalCentavos, 'Principal'))
  if (interest.numerator <= 0) throw new Error('Maturity value must exceed principal.')
  return interest
}

export function roundMoneyCentavos(value: InterestRational): number {
  const reduced = simplifyFraction(value)
  return Math.round(reduced.numerator / reduced.denominator)
}

export function compareInterestOptions(first: InterestOption, second: InterestOption): InterestComparison {
  const firstInterestCentavos = simpleInterest(first.principalCentavos, first.annualRate, first.timeYears)
  const secondInterestCentavos = simpleInterest(second.principalCentavos, second.annualRate, second.timeYears)
  const comparison = compareFractions(firstInterestCentavos, secondInterestCentavos)
  if (comparison === 0) throw new Error('Interest options must not tie.')
  return {
    winner: comparison > 0 ? 'A' : 'B',
    differenceCentavos: comparison > 0 ? subtractFractions(firstInterestCentavos, secondInterestCentavos) : subtractFractions(secondInterestCentavos, firstInterestCentavos),
    firstInterestCentavos,
    secondInterestCentavos,
  }
}
