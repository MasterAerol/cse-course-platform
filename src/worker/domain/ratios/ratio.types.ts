export interface Ratio {
  left: number
  right: number
}

export type RatioOrder = -1 | 0 | 1

export interface RatioShares {
  left: number
  right: number
}

export type SupportedRatioUnit = 'mm' | 'cm' | 'm' | 'km' | 'g' | 'kg'
