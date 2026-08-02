export interface TravelRational {
  numerator: number
  denominator: number
}

export type DistanceUnit = 'kilometers' | 'meters'
export type TimeUnit = 'hours' | 'minutes' | 'seconds'
export type SpeedUnit = 'km/h' | 'm/s'
export type TravelAnswerUnit = DistanceUnit | TimeUnit | SpeedUnit

export interface TravelLeg {
  distance: TravelRational
  time: TravelRational
}
