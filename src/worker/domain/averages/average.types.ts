export interface WeightedValue {
  value: number
  weight: number
}

export interface AverageGroup {
  mean: number
  count: number
}

export type AveragePrecision = 0 | 1 | 2
