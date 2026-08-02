import {
  addFractions,
  divideFractions,
  fractionIdentity,
  multiplyFractions,
  simplifyFraction,
  subtractFractions,
} from '../fractions/fraction-math'
import type { TravelLeg, TravelRational } from './distance-speed-time.types'

export function travelRational(numerator: number, denominator = 1): TravelRational {
  return simplifyFraction({ numerator, denominator })
}

export function travelIdentity(value: TravelRational): string {
  return fractionIdentity(value)
}

function positive(value: TravelRational, label: string): TravelRational {
  const reduced = simplifyFraction(value)
  if (reduced.numerator <= 0) throw new Error(`${label} must be positive.`)
  return reduced
}

export function distanceFromSpeedTime(speed: TravelRational, time: TravelRational): TravelRational {
  return multiplyFractions(positive(speed, 'Speed'), positive(time, 'Time'))
}

export function speedFromDistanceTime(distance: TravelRational, time: TravelRational): TravelRational {
  return divideFractions(positive(distance, 'Distance'), positive(time, 'Time'))
}

export function timeFromDistanceSpeed(distance: TravelRational, speed: TravelRational): TravelRational {
  return divideFractions(positive(distance, 'Distance'), positive(speed, 'Speed'))
}

export const kilometersToMeters = (value: TravelRational): TravelRational => multiplyFractions(value, travelRational(1000))
export const metersToKilometers = (value: TravelRational): TravelRational => divideFractions(value, travelRational(1000))
export const hoursToMinutes = (value: TravelRational): TravelRational => multiplyFractions(value, travelRational(60))
export const minutesToHours = (value: TravelRational): TravelRational => divideFractions(value, travelRational(60))
export const hoursToSeconds = (value: TravelRational): TravelRational => multiplyFractions(value, travelRational(3600))
export const secondsToHours = (value: TravelRational): TravelRational => divideFractions(value, travelRational(3600))
export const kilometersPerHourToMetersPerSecond = (value: TravelRational): TravelRational => multiplyFractions(value, travelRational(5, 18))
export const metersPerSecondToKilometersPerHour = (value: TravelRational): TravelRational => multiplyFractions(value, travelRational(18, 5))

export function averageSpeed(legs: readonly TravelLeg[], stoppedTime = travelRational(0)): TravelRational {
  if (legs.length === 0) throw new Error('At least one travel leg is required.')
  let totalDistance = travelRational(0)
  let totalTime = stoppedTime
  for (const leg of legs) {
    totalDistance = addFractions(totalDistance, positive(leg.distance, 'Leg distance'))
    totalTime = addFractions(totalTime, positive(leg.time, 'Leg time'))
  }
  return speedFromDistanceTime(totalDistance, positive(totalTime, 'Total time'))
}

export function sameDirectionRelativeSpeed(faster: TravelRational, slower: TravelRational): TravelRational {
  const relative = subtractFractions(positive(faster, 'Faster speed'), positive(slower, 'Slower speed'))
  if (relative.numerator <= 0) throw new Error('Faster speed must exceed slower speed.')
  return relative
}

export function oppositeDirectionRelativeSpeed(first: TravelRational, second: TravelRational): TravelRational {
  return addFractions(positive(first, 'First speed'), positive(second, 'Second speed'))
}

export function headStartDistance(speed: TravelRational, delay: TravelRational): TravelRational {
  return distanceFromSpeedTime(speed, delay)
}

export function catchTimeAfterDeparture(headStart: TravelRational, faster: TravelRational, slower: TravelRational): TravelRational {
  return timeFromDistanceSpeed(positive(headStart, 'Head start'), sameDirectionRelativeSpeed(faster, slower))
}

export function meetingTime(separation: TravelRational, first: TravelRational, second: TravelRational): TravelRational {
  return timeFromDistanceSpeed(positive(separation, 'Separation'), oppositeDirectionRelativeSpeed(first, second))
}
