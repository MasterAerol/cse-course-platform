import type { GeneratorDifficulty, GeneratorSlug } from './generator.types'

export interface SeededRandom {
  next: () => number
  integer: (minInclusive: number, maxInclusive: number) => number
  pick: <T>(items: readonly T[]) => T
  shuffle: <T>(items: readonly T[]) => T[]
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function hashSeed(seed: string): [number, number, number, number] {
  let first = 1_779_033_703
  let second = 3_144_134_277
  let third = 1_013_904_242
  let fourth = 2_773_480_762

  for (let index = 0; index < seed.length; index += 1) {
    const value = seed.charCodeAt(index)

    first = second ^ Math.imul(first ^ value, 597_399_067)
    second = third ^ Math.imul(second ^ value, 2_869_860_233)
    third = fourth ^ Math.imul(third ^ value, 951_274_213)
    fourth = first ^ Math.imul(fourth ^ value, 2_716_044_179)
  }

  first = Math.imul(third ^ (first >>> 18), 597_399_067)
  second = Math.imul(fourth ^ (second >>> 22), 2_869_860_233)
  third = Math.imul(first ^ (third >>> 17), 951_274_213)
  fourth = Math.imul(second ^ (fourth >>> 19), 2_716_044_179)

  return [
    (first ^ second ^ third ^ fourth) >>> 0,
    (second ^ first) >>> 0,
    (third ^ first) >>> 0,
    (fourth ^ first) >>> 0,
  ]
}

export function createAttemptSeed(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  return base64UrlEncode(bytes)
}

export function deriveQuestionSeed(input: {
  attemptSeed: string
  generatorSlug: GeneratorSlug
  generatorVersion: number
  difficulty: GeneratorDifficulty
  position: number
  retry: number
}): string {
  return [
    input.attemptSeed,
    input.generatorSlug,
    String(input.generatorVersion),
    input.difficulty,
    String(input.position),
    String(input.retry),
  ].join('|')
}

export function createSeededRandom(seed: string): SeededRandom {
  let [first, second, third, fourth] = hashSeed(seed)

  function next(): number {
    first >>>= 0
    second >>>= 0
    third >>>= 0
    fourth >>>= 0

    const result = (first + second) | 0

    first = second ^ (second >>> 9)
    second = (third + (third << 3)) | 0
    third = (third << 21) | (third >>> 11)
    fourth = (fourth + 1) | 0
    const nextResult = (result + fourth) | 0
    third = (third + nextResult) | 0

    return (nextResult >>> 0) / 4_294_967_296
  }

  function integer(minInclusive: number, maxInclusive: number): number {
    return Math.floor(next() * (maxInclusive - minInclusive + 1)) + minInclusive
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array.')
    }

    return items[integer(0, items.length - 1)] as T
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items]

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = integer(0, index)
      const current = shuffled[index] as T
      shuffled[index] = shuffled[swapIndex] as T
      shuffled[swapIndex] = current
    }

    return shuffled
  }

  return { next, integer, pick, shuffle }
}
