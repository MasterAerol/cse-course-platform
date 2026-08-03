import type { CodingTransformation } from './coding-decoding.types'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function normalizeCodeWord(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{1,8}$/u.test(normalized)) throw new Error('Coding words must contain one to eight uppercase letters.')
  return normalized
}

export function alphabetPosition(letter: string): number {
  const index = alphabet.indexOf(letter.toUpperCase())
  if (index < 0) throw new Error('Expected an alphabet letter.')
  return index + 1
}

export function fromAlphabetPosition(position: number): string {
  if (!Number.isInteger(position) || position < 1 || position > 26) throw new Error('Alphabet position must be between 1 and 26.')
  return alphabet[position - 1] ?? 'A'
}

export function shiftLetter(letter: string, amount: number): string {
  if (!Number.isInteger(amount)) throw new Error('Letter shift must be an integer.')
  return fromAlphabetPosition(((alphabetPosition(letter) - 1 + amount) % 26 + 26) % 26 + 1)
}

export function shiftWord(word: string, amount: number): string { return [...normalizeCodeWord(word)].map((letter) => shiftLetter(letter, amount)).join('') }
export function reverseAlphabetWord(word: string): string { return [...normalizeCodeWord(word)].map((letter) => fromAlphabetPosition(27 - alphabetPosition(letter))).join('') }
export function reverseWord(word: string): string { return [...normalizeCodeWord(word)].reverse().join('') }
export function letterPositions(word: string): number[] { return [...normalizeCodeWord(word)].map(alphabetPosition) }
export function formatPositions(word: string): string { return letterPositions(word).join('-') }

export function validateOneToOneMap(entries: readonly (readonly [string, string])[]): ReadonlyMap<string, string> {
  if (entries.length < 2) throw new Error('A coding map needs at least two entries.')
  const map = new Map<string, string>()
  const values = new Set<string>()
  for (const [source, target] of entries) {
    if (!/^[A-Z]+$/u.test(source) || target.trim().length === 0 || map.has(source) || values.has(target)) throw new Error('Coding maps must be one-to-one mappings.')
    map.set(source, target); values.add(target)
  }
  return map
}

export function mapCode(value: string, map: ReadonlyMap<string, string>): string {
  const answer = map.get(value)
  if (answer === undefined) throw new Error('The requested code is not defined.')
  return answer
}

export function invertMap(map: ReadonlyMap<string, string>): ReadonlyMap<string, string> { return validateOneToOneMap([...map.entries()].map(([left, right]) => [right, left])) }

export function applyTransformations(word: string, transformations: readonly CodingTransformation[]): string {
  return transformations.reduce((current, transformation) => {
    if (transformation.kind === 'shift') return shiftWord(current, transformation.amount ?? 0)
    if (transformation.kind === 'reverse-alphabet') return reverseAlphabetWord(current)
    return reverseWord(current)
  }, normalizeCodeWord(word))
}

export function reverseTransformations(transformations: readonly CodingTransformation[]): CodingTransformation[] {
  return [...transformations].reverse().map((transformation) => transformation.kind === 'shift' ? { ...transformation, amount: -(transformation.amount ?? 0) } : transformation)
}

export function evaluateCodedOperation(left: number, symbol: '+' | '-' | '×' | '÷', right: number): number {
  if (!Number.isInteger(left) || !Number.isInteger(right) || right < 0 || left < 0) throw new Error('Coded operations require nonnegative integers.')
  if (symbol === '+') return left + right
  if (symbol === '-') return left - right
  if (symbol === '×') return left * right
  if (right === 0 || left % right !== 0) throw new Error('Coded division must have an exact nonzero divisor.')
  return left / right
}
