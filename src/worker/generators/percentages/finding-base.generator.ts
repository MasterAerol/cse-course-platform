import type {
  GeneratorDifficulty,
  QuestionGenerator,
} from '../generator.types'
import {
  createDistractorCandidate,
} from '../../domain/distractor-quality'
import type {
  NumericChoiceValidationContext,
} from '../../domain/distractor-models'
import {
  createBaseRandom,
  formatGeneratedNumber,
  normalizeNumericValue,
  shuffledChoices,
  validateQuestionContract,
} from './percentage-generator-utils'

interface FindingBaseParameters extends Record<string, unknown> {
  percentageAmount: number
  ratePercent: number
  base: number
  wordingVariant: string
  unit: string | null
}

const slug = 'finding-base'
const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

function ratePool(difficulty: GeneratorDifficulty): readonly number[] {
  if (difficulty === 'easy') {
    return [10, 20, 25, 50, 75]
  }

  if (difficulty === 'medium') {
    return [15, 18, 30, 35, 45]
  }

  return [12.5, 37.5, 62.5]
}

function cleanBase(difficulty: GeneratorDifficulty, index: number): number {
  if (difficulty === 'easy') {
    return (index + 5) * 20
  }

  if (difficulty === 'medium') {
    return (index + 4) * 100
  }

  return (index + 10) * 8
}

export const findingBaseGenerator: QuestionGenerator = {
  slug,
  version,
  title: 'Finding the Base',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const random = createBaseRandom({
      seed,
      generatorSlug: slug,
      version,
      difficulty,
    })
    const ratePercent = random.pick(ratePool(difficulty))
    const base = cleanBase(difficulty, random.integer(0, 24))
    const percentageAmount = normalizeNumericValue((ratePercent / 100) * base)
    let wordingVariant = random.pick(['direct', 'money', 'employees'] as const)

    if (wordingVariant === 'employees' && !Number.isInteger(ratePercent)) {
      wordingVariant = 'direct'
    }

    const answerKind =
      wordingVariant === 'money'
        ? 'money'
        : wordingVariant === 'employees'
          ? 'count'
          : 'number'
    const unit =
      wordingVariant === 'money'
        ? 'Philippine pesos'
        : wordingVariant === 'employees'
          ? 'employees'
          : null
    const amountText = formatGeneratedNumber(
      percentageAmount,
      wordingVariant === 'money' ? 'money' : 'count',
    )
    const prompt =
      wordingVariant === 'money'
        ? `${amountText} is ${formatGeneratedNumber(ratePercent, 'percent')} of what original amount?`
        : wordingVariant === 'employees'
          ? `A group's ${amountText} present employees represent ${formatGeneratedNumber(ratePercent, 'percent')} of the workforce. How many employees are in the workforce?`
          : `${amountText} is ${formatGeneratedNumber(ratePercent, 'percent')} of what number?`
    const decimalRate = ratePercent / 100
    const context: NumericChoiceValidationContext = {
      kind: answerKind,
      correctValue: base,
      countable: answerKind === 'count',
    }
    const candidates = [
      createDistractorCandidate({
        value: percentageAmount * decimalRate,
        mistakeType: 'multiplied_instead_of_divided',
        derivation: { operation: 'percentageAmount * decimalRate', inputs: [percentageAmount, decimalRate] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount / ratePercent,
        mistakeType: 'divided_by_percent_number',
        derivation: { operation: 'percentageAmount / ratePercent', inputs: [percentageAmount, ratePercent] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount / (decimalRate * 10),
        mistakeType: 'decimal_shift_rate_low',
        derivation: { operation: 'percentageAmount / (decimalRate * 10)', inputs: [percentageAmount, decimalRate] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount / (decimalRate / 10),
        mistakeType: 'decimal_shift_rate_high',
        derivation: { operation: 'percentageAmount / (decimalRate / 10)', inputs: [percentageAmount, decimalRate] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount,
        mistakeType: 'used_percentage_amount_as_base',
        derivation: { operation: 'percentageAmount', inputs: [percentageAmount] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount - ratePercent,
        mistakeType: 'subtracted_rate_number',
        derivation: { operation: 'percentageAmount - ratePercent', inputs: [percentageAmount, ratePercent] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount + ratePercent,
        mistakeType: 'added_rate_number',
        derivation: { operation: 'percentageAmount + ratePercent', inputs: [percentageAmount, ratePercent] },
        context,
      }),
      createDistractorCandidate({
        value: percentageAmount * ratePercent,
        mistakeType: 'treated_rate_as_whole_multiplier',
        derivation: { operation: 'percentageAmount * ratePercent', inputs: [percentageAmount, ratePercent] },
        context,
      }),
    ].filter((candidate) => candidate !== null)
    const choices = shuffledChoices({
      correctValue: base,
      answerKind,
      random,
      candidates,
    })
    const finalAnswer = formatGeneratedNumber(base, answerKind)

    return {
      generatorSlug: slug,
      generatorVersion: version,
      difficulty,
      seed,
      prompt,
      parameters: {
        percentageAmount,
        ratePercent,
        base,
        wordingVariant,
        unit,
      },
      choices,
      explanation: {
        title: 'Solution',
        steps: [
          `Convert ${formatGeneratedNumber(ratePercent, 'percent')} to decimal form: ${formatGeneratedNumber(ratePercent / 100, 'number')}.`,
          `Divide ${amountText} by ${formatGeneratedNumber(ratePercent / 100, 'number')}.`,
          `The answer is ${finalAnswer}.`,
        ],
        finalAnswer,
      },
      metadata: {
        answerKind,
        unit,
        canonicalSignature: `${slug}|${percentageAmount}|${ratePercent}`,
      },
    }
  },
  validate: (question) => {
    const parameters = question.parameters as FindingBaseParameters

    return validateQuestionContract(question, {
      slug,
      version,
      allowedDifficulties: supportedDifficulties,
      recomputedAnswer:
        parameters.percentageAmount /
        (parameters.ratePercent / 100),
      answerKind:
        parameters.wordingVariant === 'money'
          ? 'money'
          : parameters.wordingVariant === 'employees'
            ? 'count'
            : 'number',
    })
  },
}
