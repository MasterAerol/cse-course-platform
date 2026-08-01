import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../distractor-models'
import { formatAverage, formatAverageMoney } from './average-format'
import { roundAverage } from './average-math'
import type { AveragePrecision } from './average.types'

export interface AverageDistractorCandidate {
  value: number
  text: string
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  qualityScore: number
}

export function createAverageDistractor(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  precision?: AveragePrecision
  money?: boolean
  suffix?: string
  qualityScore?: number
}): AverageDistractorCandidate | null {
  const precision = input.precision ?? 2
  const value = roundAverage(input.value, precision)
  const correct = roundAverage(input.correct, precision)
  if (!Number.isFinite(value) || value < 0 || value === correct) return null
  const text = input.money
    ? formatAverageMoney(value, precision)
    : `${formatAverage(value, precision)}${input.suffix ?? ''}`
  return {
    value,
    text,
    mistakeType: input.mistakeType,
    derivation: { operation: input.operation, inputs: input.inputs },
    qualityScore: input.qualityScore ?? 60,
  }
}

export function chooseUniqueAverageDistractors(
  candidates: readonly (AverageDistractorCandidate | null)[],
  count = 3,
): AverageDistractorCandidate[] {
  const selected: AverageDistractorCandidate[] = []
  const texts = new Set<string>()
  const values = new Set<string>()
  for (const candidate of candidates
    .filter((item): item is AverageDistractorCandidate => item !== null)
    .sort((left, right) => right.qualityScore - left.qualityScore)) {
    const identity = candidate.value.toFixed(2)
    if (texts.has(candidate.text) || values.has(identity)) continue
    texts.add(candidate.text)
    values.add(identity)
    selected.push(candidate)
    if (selected.length === count) return selected
  }
  throw new Error('Fewer than three documented average distractors are available.')
}
