import type { DistractorDerivation, DistractorMistakeType } from '../distractor-models'
import { formatIntegerAnswer } from './number-problem-format'

export interface NumberProblemDistractor {
  value: number
  text: string
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  qualityScore: number
}

export function createNumberProblemDistractor(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  suffix?: string
  qualityScore?: number
}): NumberProblemDistractor | null {
  if (!Number.isInteger(input.value) || !Number.isFinite(input.value) || input.value === input.correct) return null
  return {
    value: input.value,
    text: formatIntegerAnswer(input.value, input.suffix),
    mistakeType: input.mistakeType,
    derivation: { operation: input.operation, inputs: input.inputs },
    qualityScore: input.qualityScore ?? 60,
  }
}

export function chooseNumberProblemDistractors(
  candidates: readonly (NumberProblemDistractor | null)[],
  count = 3,
): NumberProblemDistractor[] {
  const selected: NumberProblemDistractor[] = []
  const identities = new Set<string>()
  for (const candidate of candidates.filter((item): item is NumberProblemDistractor => item !== null)
    .sort((left, right) => right.qualityScore - left.qualityScore)) {
    const identity = `${candidate.value}|${candidate.text}`
    if (identities.has(identity) || selected.some((item) => item.value === candidate.value || item.text === candidate.text)) continue
    identities.add(identity)
    selected.push(candidate)
    if (selected.length === count) return selected
  }
  throw new Error('Fewer than three documented number-problem distractors are available.')
}
