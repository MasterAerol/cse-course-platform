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
    const wordingVariant = random.pick(['direct', 'money', 'employees'] as const)
    const answerKind = wordingVariant === 'money' ? 'money' : 'count'
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
    const choices = shuffledChoices({
      correctValue: base,
      answerKind,
      random,
      candidates: [
        { value: percentageAmount, distractorType: 'used_percentage_amount' },
        { value: percentageAmount * (ratePercent / 100), distractorType: 'multiplied_by_rate' },
        { value: percentageAmount / ratePercent, distractorType: 'divided_by_percent_number' },
        { value: base / 10, distractorType: 'decimal_shift' },
        { value: base * 10, distractorType: 'decimal_shift' },
        { value: base - percentageAmount, distractorType: 'subtracted_part' },
      ],
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
        parameters.wordingVariant === 'money' ? 'money' : 'count',
    })
  },
}
