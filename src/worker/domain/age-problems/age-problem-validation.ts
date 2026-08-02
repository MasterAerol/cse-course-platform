import {
  ageDifference,
  ageInFuture,
  ageInPast,
  reduceAgeRatio,
  uniqueIntegerAgeSolutions,
} from './age-problem-math'
import type { AgeRange, AgeRole } from './age-problem.types'

const ranges: Record<AgeRole, AgeRange> = {
  child: { minimum: 5, maximum: 20 },
  adult: { minimum: 18, maximum: 70 },
  parent: { minimum: 25, maximum: 70 },
  general: { minimum: 5, maximum: 80 },
}

export function isRealisticAge(age: number, role: AgeRole): boolean {
  const range = ranges[role]
  return Number.isInteger(age) && Number.isFinite(age) &&
    age >= range.minimum && age <= range.maximum
}

export function hasConstantAgeDifference(input: {
  older: number
  younger: number
  years: number
  direction: 'past' | 'future'
}): boolean {
  try {
    const present = ageDifference(input.older, input.younger)
    const shiftedOlder = input.direction === 'future'
      ? ageInFuture(input.older, input.years)
      : ageInPast(input.older, input.years)
    const shiftedYounger = input.direction === 'future'
      ? ageInFuture(input.younger, input.years)
      : ageInPast(input.younger, input.years)
    return ageDifference(shiftedOlder, shiftedYounger) === present
  } catch {
    return false
  }
}

export function ratioMatchesAtTime(input: {
  older: number
  younger: number
  years: number
  direction: 'present' | 'past' | 'future'
  olderPart: number
  youngerPart: number
}): boolean {
  try {
    const older = input.direction === 'past'
      ? ageInPast(input.older, input.years)
      : input.direction === 'future'
        ? ageInFuture(input.older, input.years)
        : input.older
    const younger = input.direction === 'past'
      ? ageInPast(input.younger, input.years)
      : input.direction === 'future'
        ? ageInFuture(input.younger, input.years)
        : input.younger
    const ratio = reduceAgeRatio(older, younger)
    return ratio.olderPart === input.olderPart &&
      ratio.youngerPart === input.youngerPart
  } catch {
    return false
  }
}

export function hasUniqueAgeSolution(input: {
  minimum: number
  maximum: number
  predicate: (age: number) => boolean
}): boolean {
  return uniqueIntegerAgeSolutions(input).length === 1
}

export function validateParentChildAges(parent: number, child: number): boolean {
  return isRealisticAge(parent, 'parent') && isRealisticAge(child, 'child') &&
    parent > child && parent - child >= 18 && parent - child <= 45
}
