import {
  createSeededRandom,
  type SeededRandom,
} from '../generator-random'
import type {
  AnswerKind,
  GeneratedChoice,
  GeneratedQuestion,
  GeneratorDifficulty,
  GeneratorSlug,
  GeneratorValidationResult,
} from '../generator.types'

export interface PercentageScenario {
  prompt: string
  unit: string | null
  answerKind: AnswerKind
  countable: boolean
}

export interface ChoiceCandidate {
  value: number
  distractorType: string | null
}

export function isFiniteSafeNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value)
}

function roundTo(value: number, decimalPlaces: number): number {
  const multiplier = 10 ** decimalPlaces

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

export function normalizeNumericValue(value: number): number {
  return roundTo(value, 4)
}

export function hasSupportedPrecision(value: number): boolean {
  return Number.isInteger(roundTo(value, 4) * 10_000)
}

export function numericIdentity(value: number): string {
  return normalizeNumericValue(value).toFixed(4)
}

function trimTrailingZeroes(text: string): string {
  return text.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '')
}

function addThousandsSeparators(text: string): string {
  const [integerPart, decimalPart] = text.split('.')
  const formattedInteger = (integerPart ?? '').replace(
    /\B(?=(\d{3})+(?!\d))/gu,
    ',',
  )

  return decimalPart === undefined
    ? formattedInteger
    : `${formattedInteger}.${decimalPart}`
}

export function formatGeneratedNumber(
  value: number,
  answerKind: AnswerKind,
): string {
  const normalized = normalizeNumericValue(value)

  if (answerKind === 'percent') {
    return `${addThousandsSeparators(trimTrailingZeroes(normalized.toFixed(2)))}%`
  }

  if (answerKind === 'money') {
    return `₱${addThousandsSeparators(trimTrailingZeroes(normalized.toFixed(2)))}`
  }

  if (answerKind === 'count') {
    return addThousandsSeparators(String(Math.round(normalized)))
  }

  return addThousandsSeparators(trimTrailingZeroes(normalized.toFixed(4)))
}

export function createBaseRandom(input: {
  seed: string
  generatorSlug: GeneratorSlug
  version: number
  difficulty: GeneratorDifficulty
}): SeededRandom {
  return createSeededRandom(
    `${input.seed}|${input.generatorSlug}|${input.version}|${input.difficulty}`,
  )
}

export function shuffledChoices(input: {
  correctValue: number
  answerKind: AnswerKind
  candidates: readonly ChoiceCandidate[]
  random: SeededRandom
}): GeneratedChoice[] {
  const selected: GeneratedChoice[] = []
  const usedIdentities = new Set<string>()

  function addChoice(candidate: ChoiceCandidate, isCorrect: boolean): void {
    if (!isFiniteSafeNumber(candidate.value) || candidate.value < 0) {
      return
    }

    const normalized = normalizeNumericValue(candidate.value)
    const identity = numericIdentity(normalized)

    if (usedIdentities.has(identity)) {
      return
    }

    usedIdentities.add(identity)
    selected.push({
      text: formatGeneratedNumber(normalized, input.answerKind),
      isCorrect,
      distractorType: candidate.distractorType,
      numericValue: normalized,
    })
  }

  addChoice({ value: input.correctValue, distractorType: null }, true)

  for (const candidate of input.random.shuffle(input.candidates)) {
    if (selected.length >= 4) {
      break
    }

    addChoice(candidate, false)
  }

  let fallbackOffset = 1

  while (selected.length < 4) {
    addChoice(
      {
        value: input.correctValue + fallbackOffset * 3,
        distractorType: 'nearby_value',
      },
      false,
    )
    fallbackOffset += 1
  }

  return input.random.shuffle(selected)
}

export function validateQuestionContract(
  question: GeneratedQuestion,
  expected: {
    slug: GeneratorSlug
    version: number
    recomputedAnswer: number
    answerKind: AnswerKind
    allowedDifficulties: readonly GeneratorDifficulty[]
  },
): GeneratorValidationResult {
  if (question.generatorSlug !== expected.slug) {
    return { valid: false, reason: 'Generator slug mismatch.' }
  }

  if (question.generatorVersion !== expected.version) {
    return { valid: false, reason: 'Generator version mismatch.' }
  }

  if (!expected.allowedDifficulties.includes(question.difficulty)) {
    return { valid: false, reason: 'Unsupported difficulty.' }
  }

  if (question.prompt.trim() === '') {
    return { valid: false, reason: 'Prompt is empty.' }
  }

  if (question.choices.length !== 4) {
    return { valid: false, reason: 'Question does not have four choices.' }
  }

  const correctChoices = question.choices.filter((choice) => choice.isCorrect)

  if (correctChoices.length !== 1) {
    return { valid: false, reason: 'Question must have exactly one correct choice.' }
  }

  const visibleChoiceTexts = new Set(
    question.choices.map((choice) => choice.text),
  )

  if (visibleChoiceTexts.size !== question.choices.length) {
    return { valid: false, reason: 'Choice text is duplicated.' }
  }

  const numericIdentities = new Set(
    question.choices.map((choice) => numericIdentity(choice.numericValue)),
  )

  if (numericIdentities.size !== question.choices.length) {
    return { valid: false, reason: 'Choice numeric value is duplicated.' }
  }

  for (const choice of question.choices) {
    if (!isFiniteSafeNumber(choice.numericValue)) {
      return { valid: false, reason: 'Choice contains NaN or Infinity.' }
    }

    if (!hasSupportedPrecision(choice.numericValue)) {
      return { valid: false, reason: 'Choice precision is unsupported.' }
    }
  }

  const correctChoice = correctChoices[0] as GeneratedChoice
  const expectedAnswer = normalizeNumericValue(expected.recomputedAnswer)

  if (numericIdentity(correctChoice.numericValue) !== numericIdentity(expectedAnswer)) {
    return { valid: false, reason: 'Correct choice does not match recomputed answer.' }
  }

  const expectedFinalAnswer = formatGeneratedNumber(
    expectedAnswer,
    expected.answerKind,
  )

  if (question.explanation.finalAnswer !== expectedFinalAnswer) {
    return { valid: false, reason: 'Explanation final answer does not match.' }
  }

  if (question.explanation.finalAnswer !== correctChoice.text) {
    return { valid: false, reason: 'Explanation final answer is not the correct choice.' }
  }

  if (question.metadata.canonicalSignature.trim() === '') {
    return { valid: false, reason: 'Canonical signature is empty.' }
  }

  return { valid: true, reason: null }
}
