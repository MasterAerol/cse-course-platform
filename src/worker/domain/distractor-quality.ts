import type {
  DistractorCandidate,
  DistractorDerivation,
  DistractorMistakeType,
  NumericChoiceValidationContext,
} from './distractor-models'
import {
  formatNumericChoice,
  isValidNumericChoice,
  normalizeNumericValue,
  numericIdentity,
} from './numeric-choice-validation'

const commonMistakeBonus: Partial<Record<DistractorMistakeType, number>> = {
  used_rate_number_directly: 16,
  used_base_as_answer: 14,
  divided_base_by_percent_number: 13,
  used_percentage_amount_as_base: 16,
  divided_by_percent_number: 14,
  forgot_times_100: 16,
  reversed_ratio: 12,
  difference_over_base: 14,
  discount_amount_only: 16,
  added_discount: 14,
  markup_amount_only: 16,
  subtracted_markup: 14,
  stopped_after_first_step: 16,
  applied_rate_to_original_whole: 15,
}

function scaleScore(value: number, correctValue: number): number {
  const correct = Math.max(Math.abs(correctValue), 1)
  const ratio = Math.abs(value - correctValue) / correct

  if (ratio <= 0.15) {
    return 18
  }

  if (ratio <= 0.5) {
    return 14
  }

  if (ratio <= 1.5) {
    return 9
  }

  if (ratio <= 4) {
    return 3
  }

  return -18
}

export function createDistractorCandidate(input: {
  value: number
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  context: NumericChoiceValidationContext
}): DistractorCandidate | null {
  const value = normalizeNumericValue(input.value)

  if (
    numericIdentity(value) === numericIdentity(input.context.correctValue) ||
    !isValidNumericChoice({
      value,
      kind: input.context.kind,
      countable: input.context.countable,
    })
  ) {
    return null
  }

  const qualityScore =
    50 +
    (commonMistakeBonus[input.mistakeType] ?? 8) +
    scaleScore(value, input.context.correctValue)

  if (qualityScore < 35) {
    return null
  }

  return {
    value,
    formattedText: formatNumericChoice(value, input.context.kind),
    mistakeType: input.mistakeType,
    derivation: input.derivation,
    qualityScore,
  }
}

export function selectBestDistractors(
  candidates: readonly DistractorCandidate[],
  count = 3,
): DistractorCandidate[] {
  const selected: DistractorCandidate[] = []
  const usedText = new Set<string>()
  const usedNumeric = new Set<string>()

  for (const candidate of [...candidates].sort(
    (left, right) => right.qualityScore - left.qualityScore,
  )) {
    const numeric = numericIdentity(candidate.value)

    if (usedText.has(candidate.formattedText) || usedNumeric.has(numeric)) {
      continue
    }

    selected.push(candidate)
    usedText.add(candidate.formattedText)
    usedNumeric.add(numeric)

    if (selected.length === count) {
      return selected
    }
  }

  throw new Error('Fewer than three quality distractors are available.')
}
