import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../distractor-models'
import { formatRatio } from './ratio-format'
import { ratioIdentity, simplifyRatio } from './ratio-math'
import type { Ratio } from './ratio.types'

export interface RatioDistractorCandidate {
  ratio: Ratio
  text: string
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  qualityScore: number
}

export function createRatioDistractor(input: {
  ratio: Ratio
  correct: Ratio
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore?: number
}): RatioDistractorCandidate | null {
  const ratio = simplifyRatio(input.ratio)

  if (ratioIdentity(ratio) === ratioIdentity(input.correct)) {
    return null
  }

  return {
    ratio,
    text: formatRatio(ratio),
    mistakeType: input.mistakeType,
    derivation: {
      operation: input.operation,
      inputs: input.inputs,
    },
    qualityScore: input.qualityScore ?? 60,
  }
}

export function chooseUniqueRatioDistractors(input: {
  correct: Ratio
  candidates: readonly (RatioDistractorCandidate | null)[]
  count?: number
}): RatioDistractorCandidate[] {
  const count = input.count ?? 3
  const used = new Set([ratioIdentity(input.correct)])
  const selected: RatioDistractorCandidate[] = []

  const candidates = input.candidates.filter(
    (candidate): candidate is RatioDistractorCandidate => candidate !== null,
  )

  for (const candidate of candidates.sort(
    (left, right) => right.qualityScore - left.qualityScore,
  )) {
    const identity = ratioIdentity(candidate.ratio)

    if (used.has(identity)) {
      continue
    }

    used.add(identity)
    selected.push(candidate)

    if (selected.length === count) {
      return selected
    }
  }

  throw new Error('Fewer than three documented ratio distractors are available.')
}
