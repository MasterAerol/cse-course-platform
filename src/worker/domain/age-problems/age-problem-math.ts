import type {
  AgePair,
  AgeRatio,
  IntegerLinearEquation,
} from './age-problem.types'

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite integer.`)
  }
}

function greatestCommonDivisor(left: number, right: number): number {
  let first = Math.abs(left)
  let second = Math.abs(right)

  while (second !== 0) {
    ;[first, second] = [second, first % second]
  }

  return first
}

export function representPresentAge(age: number): number {
  assertInteger(age, 'Present age')
  if (age < 0) throw new Error('Present age cannot be negative.')
  return age
}

export function ageInPast(presentAge: number, yearsAgo: number): number {
  representPresentAge(presentAge)
  assertInteger(yearsAgo, 'Years ago')
  if (yearsAgo < 0) throw new Error('Years ago cannot be negative.')
  const result = presentAge - yearsAgo
  if (result < 0) throw new Error('The referenced past age cannot be negative.')
  return result
}

export function ageInFuture(presentAge: number, yearsFromNow: number): number {
  representPresentAge(presentAge)
  assertInteger(yearsFromNow, 'Years from now')
  if (yearsFromNow < 0) throw new Error('Years from now cannot be negative.')
  return presentAge + yearsFromNow
}

export function ageDifference(older: number, younger: number): number {
  representPresentAge(older)
  representPresentAge(younger)
  if (older <= younger) throw new Error('The older age must exceed the younger age.')
  return older - younger
}

export function ageSum(ages: readonly number[]): number {
  if (ages.length === 0) throw new Error('At least one age is required.')
  return ages.reduce((sum, age) => sum + representPresentAge(age), 0)
}

export function reduceAgeRatio(older: number, younger: number): AgeRatio {
  representPresentAge(older)
  representPresentAge(younger)
  if (younger === 0 || older <= younger) {
    throw new Error('A ratio requires positive ages in older-to-younger order.')
  }
  const divisor = greatestCommonDivisor(older, younger)
  return { olderPart: older / divisor, youngerPart: younger / divisor }
}

export function solveTwoPersonAgeSystem(
  first: IntegerLinearEquation,
  second: IntegerLinearEquation,
): AgePair | null {
  const determinant =
    first.olderCoefficient * second.youngerCoefficient -
    second.olderCoefficient * first.youngerCoefficient
  if (determinant === 0) return null

  const older =
    (first.constant * second.youngerCoefficient -
      second.constant * first.youngerCoefficient) /
    determinant
  const younger =
    (first.olderCoefficient * second.constant -
      second.olderCoefficient * first.constant) /
    determinant

  if (!Number.isInteger(older) || !Number.isInteger(younger)) return null
  if (older <= younger || younger < 0) return null
  return { older, younger }
}

export function solveElapsedTimeForRatio(input: {
  older: number
  younger: number
  ratio: AgeRatio
  direction: 'past' | 'future'
}): number | null {
  ageDifference(input.older, input.younger)
  const { olderPart, youngerPart } = input.ratio
  assertInteger(olderPart, 'Older ratio part')
  assertInteger(youngerPart, 'Younger ratio part')
  if (olderPart <= youngerPart || youngerPart <= 0) return null

  const direction = input.direction === 'future' ? 1 : -1
  const numerator =
    olderPart * input.younger - youngerPart * input.older
  const denominator = direction * (youngerPart - olderPart)
  if (denominator === 0 || numerator % denominator !== 0) return null

  const years = numerator / denominator
  if (years < 0) return null
  if (
    input.direction === 'past' &&
    (input.older - years < 0 || input.younger - years < 0)
  ) {
    return null
  }
  return years
}

export function uniqueIntegerAgeSolutions(input: {
  minimum: number
  maximum: number
  predicate: (age: number) => boolean
}): number[] {
  assertInteger(input.minimum, 'Minimum age')
  assertInteger(input.maximum, 'Maximum age')
  if (input.minimum > input.maximum) {
    throw new Error('Minimum age cannot exceed maximum age.')
  }

  const matches: number[] = []
  for (let age = input.minimum; age <= input.maximum; age += 1) {
    if (input.predicate(age)) matches.push(age)
  }
  return matches
}
