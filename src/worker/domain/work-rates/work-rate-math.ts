import {
  addFractions,
  compareFractions,
  divideFractions,
  fractionIdentity,
  multiplyFractions,
  simplifyFraction,
  subtractFractions,
} from '../fractions/fraction-math'
import type { Rational, WorkPhase, WorkTimelineResult } from './work-rate.types'

export const WHOLE_JOB: Rational = { numerator: 1, denominator: 1 }
export const ZERO_WORK: Rational = { numerator: 0, denominator: 1 }

function requirePositive(value: Rational, label: string): Rational {
  const reduced = simplifyFraction(value)
  if (reduced.numerator <= 0) throw new Error(`${label} must be positive.`)
  return reduced
}

export function rational(numerator: number, denominator = 1): Rational {
  return simplifyFraction({ numerator, denominator })
}

export function rationalIdentity(value: Rational): string {
  return fractionIdentity(value)
}

export function rateFromWorkAndTime(work: Rational, time: Rational): Rational {
  requirePositive(work, 'Work')
  requirePositive(time, 'Time')
  return divideFractions(work, time)
}

export function workFromRateAndTime(rate: Rational, time: Rational): Rational {
  return multiplyFractions(requirePositive(rate, 'Rate'), requirePositive(time, 'Time'))
}

export function timeFromWorkAndRate(work: Rational, rate: Rational): Rational {
  requirePositive(work, 'Work')
  requirePositive(rate, 'Rate')
  return divideFractions(work, rate)
}

export function individualRate(completionTime: Rational): Rational {
  return rateFromWorkAndTime(WHOLE_JOB, completionTime)
}

export function combinedRates(rates: readonly Rational[]): Rational {
  if (rates.length === 0) throw new Error('At least one rate is required.')
  return rates.reduce(
    (total, rate) => addFractions(total, requirePositive(rate, 'Individual rate')),
    ZERO_WORK,
  )
}

export function opposingNetRate(
  fillingRates: readonly Rational[],
  drainingRates: readonly Rational[],
): Rational {
  const filling = combinedRates(fillingRates)
  const draining = drainingRates.length === 0 ? ZERO_WORK : combinedRates(drainingRates)
  const net = subtractFractions(filling, draining)
  if (net.numerator <= 0) throw new Error('Net completion rate must be positive.')
  return net
}

export function remainingWork(completed: Rational): Rational {
  const reduced = simplifyFraction(completed)
  if (compareFractions(reduced, ZERO_WORK) < 0 || compareFractions(reduced, WHOLE_JOB) > 0) {
    throw new Error('Completed work must stay between zero and one whole job.')
  }
  return subtractFractions(WHOLE_JOB, reduced)
}

export function evaluateWorkTimeline(phases: readonly WorkPhase[]): WorkTimelineResult {
  if (phases.length === 0) throw new Error('At least one work phase is required.')
  let completed = ZERO_WORK
  const phaseTotals: Rational[] = []
  for (const [index, phase] of phases.entries()) {
    const phaseWork = workFromRateAndTime(phase.rate, phase.time)
    completed = addFractions(completed, phaseWork)
    if (index < phases.length - 1 && compareFractions(completed, WHOLE_JOB) >= 0) {
      throw new Error('A pre-completion phase cannot finish or exceed the job.')
    }
    if (compareFractions(completed, WHOLE_JOB) > 0) {
      throw new Error('A work timeline cannot exceed one whole job.')
    }
    phaseTotals.push(phaseWork)
  }
  return { completed, remaining: remainingWork(completed), phaseTotals }
}

export function solveUnknownRate(totalRate: Rational, knownRates: readonly Rational[]): Rational {
  const known = combinedRates(knownRates)
  const unknown = subtractFractions(requirePositive(totalRate, 'Total rate'), known)
  if (unknown.numerator <= 0) throw new Error('The inferred unknown rate must be positive.')
  return unknown
}

export function efficiencyRate(baseRate: Rational, efficientParts: number, baseParts: number): Rational {
  if (!Number.isInteger(efficientParts) || !Number.isInteger(baseParts) || efficientParts <= 0 || baseParts <= 0) {
    throw new Error('Efficiency ratio parts must be positive integers.')
  }
  return multiplyFractions(requirePositive(baseRate, 'Base rate'), rational(efficientParts, baseParts))
}

