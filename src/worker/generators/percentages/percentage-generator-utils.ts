import {
  selectBestDistractors,
} from '../../domain/distractor-quality'
import type {
  DistractorCandidate,
} from '../../domain/distractor-models'
import {
  formatNumericChoice,
  hasSupportedPrecision,
  isFiniteSafeNumber,
  normalizeNumericValue,
  numericIdentity,
} from '../../domain/numeric-choice-validation'
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

type NumericGeneratedAnswerKind = Exclude<AnswerKind, 'fraction'>

export interface PercentageScenario {
  prompt: string
  unit: string | null
  answerKind: NumericGeneratedAnswerKind
  countable: boolean
}

export function formatGeneratedNumber(
  value: number,
  answerKind: NumericGeneratedAnswerKind,
): string {
  return formatNumericChoice(value, answerKind)
}

export {
  normalizeNumericValue,
  numericIdentity,
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
  answerKind: NumericGeneratedAnswerKind
  candidates: readonly DistractorCandidate[]
  random: SeededRandom
}): GeneratedChoice[] {
  const normalizedCorrectValue = normalizeNumericValue(input.correctValue)
  const distractors = selectBestDistractors(input.candidates)
  const selected: GeneratedChoice[] = [
    {
      text: formatGeneratedNumber(normalizedCorrectValue, input.answerKind),
      isCorrect: true,
      distractorType: null,
      mistakeType: null,
      derivation: null,
      qualityScore: 100,
      numericValue: normalizedCorrectValue,
    },
    ...distractors.map((candidate) => ({
      text: candidate.formattedText,
      isCorrect: false,
      distractorType: candidate.mistakeType,
      mistakeType: candidate.mistakeType,
      derivation: candidate.derivation,
      qualityScore: candidate.qualityScore,
      numericValue: candidate.value,
    })),
  ]

  return input.random.shuffle(selected)
}

export function validateQuestionContract(
  question: GeneratedQuestion,
  expected: {
    slug: GeneratorSlug
    version: number
    recomputedAnswer: number
    answerKind: NumericGeneratedAnswerKind
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

    if (
      !choice.isCorrect &&
      (choice.mistakeType === null ||
        choice.derivation === null ||
        choice.qualityScore < 35)
    ) {
      return { valid: false, reason: 'Distractor is missing quality metadata.' }
    }
  }

  const correctChoice = correctChoices[0] as GeneratedChoice
  const expectedAnswer = normalizeNumericValue(expected.recomputedAnswer)

  if (
    numericIdentity(correctChoice.numericValue) !==
    numericIdentity(expectedAnswer)
  ) {
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
