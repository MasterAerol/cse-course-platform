import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../distractor-models'
import { formatFraction } from './fraction-format'
import { fractionIdentity, simplifyFraction } from './fraction-math'
import type { Fraction } from './fraction.types'

export interface FractionDistractorCandidate {
  fraction: Fraction
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  qualityScore: number
  text?: string
}

export function createFractionDistractorCandidate(input: {
  fraction: Fraction
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore?: number
  text?: string
}): FractionDistractorCandidate | null {
  try {
    const simplified = simplifyFraction(input.fraction)

    return {
      fraction: simplified,
      mistakeType: input.mistakeType,
      derivation: {
        operation: input.operation,
        inputs: input.inputs,
      },
      qualityScore: input.qualityScore ?? 70,
      text: input.text,
    }
  } catch {
    return null
  }
}

export function chooseUniqueFractionDistractors(input: {
  correct: Fraction
  candidates: readonly FractionDistractorCandidate[]
  count: number
}): FractionDistractorCandidate[] {
  const used = new Set([fractionIdentity(input.correct)])
  const selected: FractionDistractorCandidate[] = []

  for (const candidate of [...input.candidates].sort(
    (left, right) => right.qualityScore - left.qualityScore,
  )) {
    const identity = fractionIdentity(candidate.fraction)
    const text = candidate.text ?? formatFraction(candidate.fraction)

    if (used.has(identity) || selected.some((item) => item.text === text)) {
      continue
    }

    selected.push(candidate)
    used.add(identity)

    if (selected.length === input.count) {
      return selected
    }
  }

  throw new Error('Not enough unique fraction distractors were available.')
}
