export interface InterestRational {
  numerator: number
  denominator: number
}

export type DayCountBasis = 360 | 365
export type InterestAnswerUnit = 'money' | 'percent' | 'years' | 'months' | 'option-a-money' | 'option-b-money'

export interface InterestOption {
  principalCentavos: InterestRational
  annualRate: InterestRational
  timeYears: InterestRational
}

export interface InterestComparison {
  winner: 'A' | 'B'
  differenceCentavos: InterestRational
  firstInterestCentavos: InterestRational
  secondInterestCentavos: InterestRational
}
