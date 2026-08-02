import type { LetterMovementOptions, LetterNumberTerm } from './letter-series.types'

const A_CODE = 'A'.charCodeAt(0)

export function letterToPosition(letter: string): number {
  if (!/^[A-Z]$/u.test(letter)) throw new Error('Letter must be one uppercase character from A to Z.')
  return letter.charCodeAt(0) - A_CODE + 1
}

export function positionToLetter(position: number, options: LetterMovementOptions = {}): string {
  if (!Number.isInteger(position)) throw new Error('Alphabet positions must be integers.')
  if (options.wraparound === true) return String.fromCharCode(A_CODE + (((position - 1) % 26) + 26) % 26)
  if (position < 1 || position > 26) throw new Error('Alphabet position is outside A to Z and wraparound is disabled.')
  return String.fromCharCode(A_CODE + position - 1)
}

export function moveLetter(letter: string, signedStep: number, options: LetterMovementOptions = {}): string {
  if (!Number.isInteger(signedStep)) throw new Error('Letter movement must use an integer step.')
  return positionToLetter(letterToPosition(letter) + signedStep, options)
}

export const moveForward = (letter: string, step: number, options: LetterMovementOptions = {}): string => {
  if (!Number.isInteger(step) || step < 0) throw new Error('Forward movement needs a nonnegative integer step.')
  return moveLetter(letter, step, options)
}

export const moveBackward = (letter: string, step: number, options: LetterMovementOptions = {}): string => {
  if (!Number.isInteger(step) || step < 0) throw new Error('Backward movement needs a nonnegative integer step.')
  return moveLetter(letter, -step, options)
}

export function alphabetGap(from: string, to: string, options: LetterMovementOptions = {}): number {
  const difference = letterToPosition(to) - letterToPosition(from)
  if (options.wraparound !== true) return difference
  return difference < 0 ? difference + 26 : difference
}

export function generateLetterSeries(start: string, gaps: readonly number[], transitions: number, options: LetterMovementOptions = {}): string[] {
  if (gaps.length === 0 || !Number.isInteger(transitions) || transitions < 1) throw new Error('Letter series inputs are incomplete.')
  const terms = [positionToLetter(letterToPosition(start))]
  for (let index = 0; index < transitions; index += 1) {
    const gap = gaps[index % gaps.length]
    if (gap === undefined) throw new Error('Letter gap cycle is incomplete.')
    terms.push(moveLetter(terms[terms.length - 1] ?? start, gap, options))
  }
  return terms
}

export function increasingGapSeries(start: string, firstGap: number, gapChange: number, transitions: number): string[] {
  const terms = [start]
  for (let index = 0; index < transitions; index += 1) terms.push(moveLetter(terms[terms.length - 1] ?? start, firstGap + gapChange * index))
  return terms
}

export function interleaveLetterSeries(odd: readonly string[], even: readonly string[]): string[] {
  if (odd.length !== even.length && odd.length !== even.length + 1) throw new Error('Interleaved letter subseries lengths are inconsistent.')
  const terms: string[] = []
  for (let index = 0; index < odd.length; index += 1) {
    terms.push(positionToLetter(letterToPosition(odd[index] ?? '')))
    if (index < even.length) terms.push(positionToLetter(letterToPosition(even[index] ?? '')))
  }
  return terms
}

export function generateGroupedTerms(starts: readonly string[], step: number, count: number, options: LetterMovementOptions = {}): string[] {
  if (starts.length < 2 || starts.length > 3 || count < 2) throw new Error('Groups must contain two or three letters and at least two terms.')
  return Array.from({ length: count }, (_, index) => starts.map((letter) => moveLetter(letter, step * index, options)).join(''))
}

export function generateLetterNumberTerms(startLetter: string, letterStep: number, startNumber: number, numberStep: number, count: number): LetterNumberTerm[] {
  if (![letterStep, startNumber, numberStep, count].every(Number.isInteger) || count < 2) throw new Error('Letter-number progression inputs are invalid.')
  return Array.from({ length: count }, (_, index) => ({ letter: moveLetter(startLetter, letterStep * index), number: startNumber + numberStep * index }))
}

export function recoverMissingTerm(complete: readonly string[], missingIndex: number, visible: readonly (string | null)[]): string {
  if (!Number.isInteger(missingIndex) || missingIndex < 0 || missingIndex >= complete.length || visible.length !== complete.length || visible[missingIndex] !== null) throw new Error('Missing-term inputs are inconsistent.')
  if (complete.some((term, index) => index !== missingIndex && term !== visible[index])) throw new Error('Visible terms do not match the complete series.')
  const answer = complete[missingIndex]
  if (answer === undefined) throw new Error('Missing term does not exist.')
  return answer
}
