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

interface FindingPercentageParameters extends Record<string, unknown> {
  ratePercent: number
  base: number
  percentage: number
  wordingVariant: string
  unit: string | null
}

const slug = 'finding-percentage'
const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

function ratePool(difficulty: GeneratorDifficulty): readonly number[] {
  if (difficulty === 'easy') {
    return [10, 20, 25, 50, 75]
  }

  if (difficulty === 'medium') {
    return [12, 15, 18, 35, 40]
  }

  return [12.5, 37.5, 62.5]
}

function baseForDifficulty(difficulty: GeneratorDifficulty, index: number): number {
  if (difficulty === 'easy') {
    return (index + 4) * 20
  }

  if (difficulty === 'medium') {
    return (index + 3) * 100
  }

  return (index + 8) * 8
}

export const findingPercentageGenerator: QuestionGenerator = {
  slug,
  version,
  title: 'Finding the Percentage',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const random = createBaseRandom({
      seed,
      generatorSlug: slug,
      version,
      difficulty,
    })
    const ratePercent = random.pick(ratePool(difficulty))
    const base = baseForDifficulty(difficulty, random.integer(0, 22))
    const percentage = normalizeNumericValue((ratePercent / 100) * base)
    const wordingVariant = random.pick(['direct', 'items-sold', 'class-present'] as const)
    const answerKind = wordingVariant === 'direct' ? 'number' : 'count'
    const unit =
      wordingVariant === 'items-sold'
        ? 'items'
        : wordingVariant === 'class-present'
          ? 'students'
          : null
    const prompt =
      wordingVariant === 'items-sold'
        ? `A store sold ${formatGeneratedNumber(ratePercent, 'percent')} of ${formatGeneratedNumber(base, 'count')} items. How many items were sold?`
        : wordingVariant === 'class-present'
          ? `A class has ${formatGeneratedNumber(base, 'count')} students. ${formatGeneratedNumber(ratePercent, 'percent')} are present. How many students are present?`
          : `What is ${formatGeneratedNumber(ratePercent, 'percent')} of ${formatGeneratedNumber(base, 'number')}?`
    const choices = shuffledChoices({
      correctValue: percentage,
      answerKind,
      random,
      candidates: [
        { value: base, distractorType: 'used_whole_base' },
        { value: ratePercent, distractorType: 'used_rate_number' },
        { value: percentage * 10, distractorType: 'decimal_shift' },
        { value: percentage / 10, distractorType: 'decimal_shift' },
        { value: base / (ratePercent / 100), distractorType: 'divided_instead_of_multiplied' },
        { value: percentage + ratePercent, distractorType: 'added_rate' },
      ],
    })
    const finalAnswer = formatGeneratedNumber(percentage, answerKind)

    return {
      generatorSlug: slug,
      generatorVersion: version,
      difficulty,
      seed,
      prompt,
      parameters: {
        ratePercent,
        base,
        percentage,
        wordingVariant,
        unit,
      },
      choices,
      explanation: {
        title: 'Solution',
        steps: [
          `Convert ${formatGeneratedNumber(ratePercent, 'percent')} to decimal form: ${formatGeneratedNumber(ratePercent / 100, 'number')}.`,
          `Multiply ${formatGeneratedNumber(ratePercent / 100, 'number')} by ${formatGeneratedNumber(base, answerKind)}.`,
          `The answer is ${finalAnswer}.`,
        ],
        finalAnswer,
      },
      metadata: {
        answerKind,
        unit,
        canonicalSignature: `${slug}|${ratePercent}|${base}`,
      },
    }
  },
  validate: (question) => {
    const parameters = question.parameters as FindingPercentageParameters

    return validateQuestionContract(question, {
      slug,
      version,
      allowedDifficulties: supportedDifficulties,
      recomputedAnswer:
        (parameters.ratePercent / 100) * parameters.base,
      answerKind:
        parameters.wordingVariant === 'direct' ? 'number' : 'count',
    })
  },
}
