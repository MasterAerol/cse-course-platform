import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../distractor-models'
import { formatAgeAnswer } from './age-problem-format'

export interface AgeProblemDistractor {
  value: number
  text: string
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  qualityScore: number
}

export function createAgeProblemDistractor(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  unit?: string
  qualityScore?: number
}): AgeProblemDistractor | null {
  if (
    !Number.isInteger(input.value) ||
    !Number.isFinite(input.value) ||
    input.value < 0 ||
    input.value === input.correct
  ) {
    return null
  }
  return {
    value: input.value,
    text: formatAgeAnswer(input.value, input.unit),
    mistakeType: input.mistakeType,
    derivation: { operation: input.operation, inputs: input.inputs },
    qualityScore: input.qualityScore ?? 65,
  }
}

export function chooseAgeProblemDistractors(
  candidates: readonly (AgeProblemDistractor | null)[],
  count = 3,
): AgeProblemDistractor[] {
  const selected: AgeProblemDistractor[] = []
  const values = new Set<number>()
  const texts = new Set<string>()

  for (const candidate of candidates
    .filter((item): item is AgeProblemDistractor => item !== null)
    .sort((left, right) => right.qualityScore - left.qualityScore)) {
    if (values.has(candidate.value) || texts.has(candidate.text)) continue
    selected.push(candidate)
    values.add(candidate.value)
    texts.add(candidate.text)
    if (selected.length === count) return selected
  }

  throw new Error('Fewer than three documented age-problem distractors are available.')
}
