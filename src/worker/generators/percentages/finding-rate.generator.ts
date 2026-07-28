import type {
  GeneratorDifficulty,
  QuestionGenerator,
} from '../generator.types'
import {
  createBaseRandom,
  formatGeneratedNumber,
  normalizeNumericValue,
  shuffledChoices,
  validateQuestionContract,
} from './percentage-generator-utils'

interface FindingRateParameters extends Record<string, unknown> {
  percentageAmount: number
  base: number
  ratePercent: number
  wordingVariant: string
  unit: string | null
}

const slug = 'finding-rate'
const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

function ratePool(difficulty: GeneratorDifficulty): readonly number[] {
  if (difficulty === 'easy') {
    return [10, 20, 25, 50, 75]
  }

  if (difficulty === 'medium') {
    return [12, 15, 18, 30, 40]
  }

  return [12.5, 37.5, 62.5]
}

function cleanBase(difficulty: GeneratorDifficulty, index: number): number {
  if (difficulty === 'easy') {
    return (index + 6) * 20
  }

  if (difficulty === 'medium') {
    return (index + 5) * 100
  }

  return (index + 12) * 8
}

export const findingRateGenerator: QuestionGenerator = {
  slug,
  version,
  title: 'Finding the Rate',
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
    const wordingVariant = random.pick(['direct', 'attendance', 'money'] as const)
    const amountKind = wordingVariant === 'money' ? 'money' : 'count'
    const unit =
      wordingVariant === 'money'
        ? 'Philippine pesos'
        : wordingVariant === 'attendance'
          ? 'people'
          : null
    const amountText = formatGeneratedNumber(percentageAmount, amountKind)
    const baseText = formatGeneratedNumber(base, amountKind)
    const prompt =
      wordingVariant === 'money'
        ? `${amountText} is what percent of ${baseText}?`
        : wordingVariant === 'attendance'
          ? `${amountText} people out of ${baseText} attended. What percent attended?`
          : `${amountText} is what percent of ${baseText}?`
    const choices = shuffledChoices({
      correctValue: ratePercent,
      answerKind: 'percent',
      random,
      candidates: [
        { value: (base / percentageAmount) * 100, distractorType: 'reversed_ratio' },
        { value: percentageAmount / base, distractorType: 'forgot_to_multiply_by_100' },
        { value: ratePercent / 10, distractorType: 'decimal_shift' },
        { value: ratePercent * 10, distractorType: 'decimal_shift' },
        { value: base - percentageAmount, distractorType: 'subtracted_values' },
        { value: ratePercent + 10, distractorType: 'nearby_percent' },
      ],
    })
    const finalAnswer = formatGeneratedNumber(ratePercent, 'percent')

    return {
      generatorSlug: slug,
      generatorVersion: version,
      difficulty,
      seed,
      prompt,
      parameters: {
        percentageAmount,
        base,
        ratePercent,
        wordingVariant,
        unit,
      },
      choices,
      explanation: {
        title: 'Solution',
        steps: [
          `Divide ${amountText} by ${baseText}.`,
          `Multiply the quotient by 100 to convert it to a percent.`,
          `The answer is ${finalAnswer}.`,
        ],
        finalAnswer,
      },
      metadata: {
        answerKind: 'percent',
        unit,
        canonicalSignature: `${slug}|${percentageAmount}|${base}`,
      },
    }
  },
  validate: (question) => {
    const parameters = question.parameters as FindingRateParameters

    return validateQuestionContract(question, {
      slug,
      version,
      allowedDifficulties: supportedDifficulties,
      recomputedAnswer:
        (parameters.percentageAmount / parameters.base) * 100,
      answerKind: 'percent',
    })
  },
}
