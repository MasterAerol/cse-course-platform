export interface Rational {
  numerator: number
  denominator: number
}

export interface WorkPhase {
  rate: Rational
  time: Rational
  label: string
}

export interface WorkTimelineResult {
  completed: Rational
  remaining: Rational
  phaseTotals: readonly Rational[]
}

export type WorkRateAnswerUnit = 'hours' | 'jobs per hour' | 'job per hour'

