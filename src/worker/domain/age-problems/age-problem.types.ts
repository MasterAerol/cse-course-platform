export type AgeTimeline = 'present' | 'past' | 'future'

export type AgeRole = 'child' | 'adult' | 'parent' | 'general'

export interface AgePair {
  older: number
  younger: number
}

export interface AgeRatio {
  olderPart: number
  youngerPart: number
}

export interface IntegerLinearEquation {
  olderCoefficient: number
  youngerCoefficient: number
  constant: number
}

export interface AgeRange {
  minimum: number
  maximum: number
}
