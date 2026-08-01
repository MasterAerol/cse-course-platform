import {
  chooseUniqueAverageDistractors,
  createAverageDistractor,
  type AverageDistractorCandidate,
} from '../../domain/averages/average-distractors'
import { formatAverage, formatAverageMoney } from '../../domain/averages/average-format'
import {
  arithmeticMean,
  combinedMean,
  meanAfterAdding,
  meanAfterRemoving,
  missingValueForMean,
  requiredValueForTargetMean,
  roundAverage,
  weightedMean,
} from '../../domain/averages/average-math'
import type { AveragePrecision } from '../../domain/averages/average.types'
import type { DistractorMistakeType } from '../../domain/distractor-models'
import { createSeededRandom, type SeededRandom } from '../generator-random'
import type {
  AnswerKind,
  GeneratedChoice,
  GeneratedQuestion,
  GeneratorDifficulty,
  GeneratorSlug,
  GeneratorValidationResult,
  QuestionGenerator,
} from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

type ValidationKind =
  | 'mean'
  | 'missing'
  | 'combined'
  | 'weighted'
  | 'adding'
  | 'removing'
  | 'age'
  | 'target'

interface ChoiceDraft {
  text: string
  value: number
  mistakeType: DistractorMistakeType | null
  derivation: GeneratedChoice['derivation']
  qualityScore: number
}

function randomFor(input: {
  seed: string
  slug: GeneratorSlug
  difficulty: GeneratorDifficulty
}): SeededRandom {
  return createSeededRandom(
    `${input.seed}|${input.slug}|${version}|${input.difficulty}`,
  )
}

function identity(value: number, precision: AveragePrecision): string {
  return roundAverage(value, precision).toFixed(precision)
}

function textFor(input: {
  value: number
  precision: AveragePrecision
  answerKind: AnswerKind
  suffix?: string
}): string {
  if (input.answerKind === 'money') {
    return formatAverageMoney(input.value, input.precision)
  }
  return `${formatAverage(input.value, input.precision)}${input.suffix ?? ''}`
}

function candidate(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  precision: AveragePrecision
  answerKind: AnswerKind
  suffix?: string
  qualityScore?: number
}): AverageDistractorCandidate | null {
  return createAverageDistractor({
    value: input.value,
    correct: input.correct,
    mistakeType: input.mistakeType,
    operation: input.operation,
    inputs: input.inputs,
    precision: input.precision,
    money: input.answerKind === 'money',
    suffix: input.suffix,
    qualityScore: input.qualityScore,
  })
}

function buildQuestion(input: {
  slug: GeneratorSlug
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  correct: number
  candidates: readonly (AverageDistractorCandidate | null)[]
  precision: AveragePrecision
  answerKind: AnswerKind
  suffix?: string
  explanationSteps: string[]
  validationKind: ValidationKind
  parameters: Record<string, unknown>
  canonicalSignature: string
  unit?: string | null
}): GeneratedQuestion {
  const random = randomFor(input)
  const correct = roundAverage(input.correct, input.precision)
  const distractors = chooseUniqueAverageDistractors(input.candidates)
  const choices: ChoiceDraft[] = random.shuffle([
    {
      text: textFor({ ...input, value: correct }),
      value: correct,
      mistakeType: null,
      derivation: null,
      qualityScore: 100,
    },
    ...distractors.map((item) => ({
      text: item.text,
      value: item.value,
      mistakeType: item.mistakeType,
      derivation: item.derivation,
      qualityScore: item.qualityScore,
    })),
  ])
  const correctIdentity = identity(correct, input.precision)

  if (
    new Set(choices.map((choice) => choice.text)).size !== 4 ||
    new Set(choices.map((choice) => identity(choice.value, input.precision))).size !== 4
  ) {
    throw new Error(`Generated ${input.slug} choices are not unique.`)
  }

  return {
    generatorSlug: input.slug,
    generatorVersion: version,
    difficulty: input.difficulty,
    seed: input.seed,
    prompt: input.prompt,
    parameters: {
      ...input.parameters,
      validationKind: input.validationKind,
      precision: input.precision,
      correctIdentity,
      choiceIdentities: choices.map((choice) => identity(choice.value, input.precision)),
    },
    choices: choices.map((choice) => ({
      text: choice.text,
      isCorrect: identity(choice.value, input.precision) === correctIdentity,
      distractorType: choice.mistakeType,
      mistakeType: choice.mistakeType,
      derivation: choice.derivation,
      qualityScore: choice.qualityScore,
      numericValue: choice.value,
    })),
    explanation: {
      title: 'Solution',
      steps: input.explanationSteps,
      finalAnswer: textFor({ ...input, value: correct }),
    },
    metadata: {
      answerKind: input.answerKind,
      unit: input.unit ?? null,
      canonicalSignature: input.canonicalSignature,
    },
  }
}

function numberParam(parameters: Record<string, unknown>, key: string): number {
  const value = parameters[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid numeric generator parameter ${key}.`)
  }
  return value
}

function numberArrayParam(
  parameters: Record<string, unknown>,
  key: string,
): number[] {
  const value = parameters[key]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    throw new Error(`Invalid numeric array generator parameter ${key}.`)
  }
  return value as number[]
}

function recompute(question: GeneratedQuestion): number {
  const kind = question.parameters.validationKind
  if (kind === 'mean') return arithmeticMean(numberArrayParam(question.parameters, 'values'))
  if (kind === 'missing') {
    return missingValueForMean(
      numberParam(question.parameters, 'targetMean'),
      numberParam(question.parameters, 'totalCount'),
      numberArrayParam(question.parameters, 'knownValues'),
    )
  }
  if (kind === 'combined') {
    return combinedMean([
      { mean: numberParam(question.parameters, 'firstMean'), count: numberParam(question.parameters, 'firstCount') },
      { mean: numberParam(question.parameters, 'secondMean'), count: numberParam(question.parameters, 'secondCount') },
    ])
  }
  if (kind === 'weighted') {
    return weightedMean([
      { value: numberParam(question.parameters, 'firstValue'), weight: numberParam(question.parameters, 'firstWeight') },
      { value: numberParam(question.parameters, 'secondValue'), weight: numberParam(question.parameters, 'secondWeight') },
    ])
  }
  if (kind === 'adding' || kind === 'age') {
    return meanAfterAdding(
      numberParam(question.parameters, 'currentMean'),
      numberParam(question.parameters, 'currentCount'),
      numberParam(question.parameters, 'changedValue'),
    )
  }
  if (kind === 'removing') {
    return meanAfterRemoving(
      numberParam(question.parameters, 'currentMean'),
      numberParam(question.parameters, 'currentCount'),
      numberParam(question.parameters, 'changedValue'),
    )
  }
  if (kind === 'target') {
    return requiredValueForTargetMean(
      numberParam(question.parameters, 'currentMean'),
      numberParam(question.parameters, 'currentCount'),
      numberParam(question.parameters, 'targetMean'),
    )
  }
  throw new Error('Unsupported average validation kind.')
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const precision = question.parameters.precision
    if (
      question.generatorVersion !== version ||
      !supportedDifficulties.includes(question.difficulty) ||
      (precision !== 0 && precision !== 1 && precision !== 2) ||
      question.choices.length !== 4
    ) return { valid: false, reason: 'Generator metadata is invalid.' }

    const expected = identity(recompute(question), precision)
    const correct = question.choices.filter((choice) => choice.isCorrect)
    const identities = question.parameters.choiceIdentities
    if (
      correct.length !== 1 ||
      question.parameters.correctIdentity !== expected ||
      !Array.isArray(identities) ||
      new Set(identities).size !== 4 ||
      new Set(question.choices.map((choice) => choice.text)).size !== 4 ||
      correct[0]?.text !== question.explanation.finalAnswer
    ) return { valid: false, reason: 'Answer or choice validation failed.' }

    for (const choice of question.choices) {
      if (!Number.isFinite(choice.numericValue)) {
        return { valid: false, reason: 'A choice is not finite.' }
      }
      if (!choice.isCorrect && (choice.mistakeType === null || choice.derivation === null || choice.qualityScore < 35)) {
        return { valid: false, reason: 'Distractor validation failed.' }
      }
    }
    return { valid: true, reason: null }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Validation failed.' }
  }
}

function symmetricValues(mean: number, count: number, step: number): number[] {
  const deviationsByCount: Record<number, readonly number[]> = {
    3: [-1, 0, 1],
    5: [-2, -1, 0, 1, 2],
    7: [-3, -2, -1, 0, 1, 2, 3],
  }
  const deviations = deviationsByCount[count]
  if (deviations === undefined) throw new Error('Unsupported symmetric value count.')
  return deviations.map((deviation) => mean + deviation * step)
}

function commonCandidates(input: {
  correct: number
  values: readonly number[]
  precision: AveragePrecision
  answerKind: AnswerKind
  suffix?: string
}): (AverageDistractorCandidate | null)[] {
  const total = input.values.reduce((sum, value) => sum + value, 0)
  const firstValue = input.values[0] ?? 0
  const lastValue = input.values[input.values.length - 1] ?? 0
  const median = [...input.values].sort((left, right) => left - right)[Math.floor(input.values.length / 2)] ?? 0
  return [
    candidate({ ...input, value: total, mistakeType: 'used_sum_as_average', operation: 'use total as the mean', inputs: [...input.values] }),
    candidate({ ...input, value: total / Math.max(1, input.values.length - 1), mistakeType: 'used_wrong_average_divisor', operation: 'divide by one fewer value', inputs: [total, input.values.length] }),
    candidate({ ...input, value: (total - firstValue) / Math.max(1, input.values.length - 1), mistakeType: 'omitted_average_value', operation: 'omit the first value', inputs: [...input.values] }),
    candidate({ ...input, value: median, mistakeType: 'used_median_as_mean', operation: 'choose the median', inputs: [...input.values] }),
    candidate({ ...input, value: (total + 1) / input.values.length, mistakeType: 'average_addition_error', operation: 'add total incorrectly', inputs: [total, input.values.length] }),
    candidate({ ...input, value: total / (input.values.length + 1), mistakeType: 'used_wrong_average_divisor', operation: 'divide by one extra value', inputs: [total, input.values.length] }),
    candidate({ ...input, value: (total - lastValue) / Math.max(1, input.values.length - 1), mistakeType: 'omitted_average_value', operation: 'omit the last value', inputs: [...input.values] }),
    candidate({ ...input, value: (total + firstValue) / input.values.length, mistakeType: 'average_addition_error', operation: 'count the first value twice', inputs: [...input.values] }),
    candidate({ ...input, value: total / (input.values.length + 2), mistakeType: 'used_wrong_average_divisor', operation: 'divide by two extra values', inputs: [total, input.values.length] }),
  ]
}

export const findingAverageGenerator: QuestionGenerator = {
  slug: 'finding-average', version, title: 'Finding the Average', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'finding-average' })
    const count = input.difficulty === 'easy' ? random.pick([3, 5]) : random.pick([5, 7])
    const precision: AveragePrecision = input.difficulty === 'easy' ? 0 : random.pick([0, 1])
    const scale = precision === 0 ? 1 : 0.5
    const mean = random.integer(20, input.difficulty === 'hard' ? 90 : 60) + (precision === 1 ? 0.5 : 0)
    const values = random.shuffle(symmetricValues(mean, count, scale * random.integer(2, 5)))
    const money = input.difficulty === 'hard' && random.integer(0, 1) === 1
    const answerKind: AnswerKind = money ? 'money' : 'number'
    const correct = arithmeticMean(values)
    return buildQuestion({
      slug: 'finding-average', difficulty: input.difficulty, seed: input.seed,
      prompt: money ? `Find the average daily earning for ${values.map((value) => formatAverageMoney(value, precision)).join(', ')}.` : `Find the average of ${values.map((value) => formatAverage(value, precision)).join(', ')}.`,
      correct,
      candidates: commonCandidates({ correct, values, precision, answerKind }),
      precision, answerKind,
      explanationSteps: [`Add the values to get ${formatAverage(values.reduce((sum, value) => sum + value, 0), precision)}.`, `Divide by ${count}.`],
      validationKind: 'mean', parameters: { values }, canonicalSignature: `finding-average|${values.join(',')}|${money}`, unit: money ? 'PHP' : null,
    })
  },
  validate: validateQuestion,
}

export const missingValueAverageGenerator: QuestionGenerator = {
  slug: 'missing-value-average', version, title: 'Finding a Missing Value', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'missing-value-average' })
    const targetMean = random.integer(15, 50)
    const full = symmetricValues(targetMean, 5, random.integer(2, 5))
    const missingIndex = random.integer(0, 4)
    const knownValues = full.filter((_, index) => index !== missingIndex)
    const correct = missingValueForMean(targetMean, 5, knownValues)
    const knownTotal = knownValues.reduce((sum, value) => sum + value, 0)
    const base = { correct, precision: 0 as const, answerKind: 'number' as const }
    return buildQuestion({
      slug: 'missing-value-average', difficulty: input.difficulty, seed: input.seed,
      prompt: `Five numbers average ${targetMean}. Four values are ${knownValues.join(', ')}. Find the missing value.`,
      correct,
      candidates: [
        candidate({ ...base, value: targetMean, mistakeType: 'used_average_as_missing_value', operation: 'use target mean directly', inputs: [targetMean] }),
        candidate({ ...base, value: targetMean * 4 - knownTotal, mistakeType: 'used_wrong_average_divisor', operation: 'use the known-value count', inputs: [targetMean, 4, knownTotal] }),
        candidate({ ...base, value: Math.abs(knownTotal - targetMean * 5), mistakeType: 'reversed_required_value_subtraction', operation: 'subtract in reverse order and ignore sign', inputs: [targetMean, 5, knownTotal] }),
        candidate({ ...base, value: targetMean * 5 + knownTotal, mistakeType: 'added_instead_of_subtracted_total', operation: 'add known total', inputs: [targetMean, 5, knownTotal] }),
        candidate({ ...base, value: targetMean * 5 - (knownTotal - (knownValues[0] ?? 0)), mistakeType: 'omitted_average_value', operation: 'omit one known value', inputs: knownValues }),
        candidate({ ...base, value: knownTotal / 4, mistakeType: 'used_average_as_missing_value', operation: 'use the mean of known values', inputs: knownValues }),
        candidate({ ...base, value: targetMean * 5, mistakeType: 'confused_total_with_mean', operation: 'use required total as missing value', inputs: [targetMean, 5] }),
        candidate({ ...base, value: knownTotal, mistakeType: 'confused_total_with_mean', operation: 'use known total as missing value', inputs: knownValues }),
      ],
      precision: 0, answerKind: 'number',
      explanationSteps: [`Required total: ${targetMean} × 5 = ${targetMean * 5}.`, `Known total: ${knownTotal}.`, `Missing value: ${targetMean * 5} - ${knownTotal} = ${correct}.`],
      validationKind: 'missing', parameters: { targetMean, totalCount: 5, knownValues }, canonicalSignature: `missing-value-average|${targetMean}|${knownValues.join(',')}`,
    })
  }, validate: validateQuestion,
}

export const combinedAverageGenerator: QuestionGenerator = {
  slug: 'combined-average', version, title: 'Combined Average', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'combined-average' })
    const firstCount = random.pick([10, 20, 30])
    let secondCount = random.pick([15, 25, 40])
    if (secondCount === firstCount) secondCount += 5
    const firstMean = random.integer(65, 82)
    const secondMean = firstMean + random.integer(4, 10)
    const correct = combinedMean([{ mean: firstMean, count: firstCount }, { mean: secondMean, count: secondCount }])
    const precision: AveragePrecision = Number.isInteger(correct) ? 0 : 2
    const base = { correct, precision, answerKind: 'number' as const }
    return buildQuestion({
      slug: 'combined-average', difficulty: input.difficulty, seed: input.seed,
      prompt: `Group A has ${firstCount} students averaging ${firstMean}. Group B has ${secondCount} students averaging ${secondMean}. Find the combined average.`,
      correct,
      candidates: [
        candidate({ ...base, value: (firstMean + secondMean) / 2, mistakeType: 'simple_average_of_group_means', operation: 'average group means equally', inputs: [firstMean, secondMean] }),
        candidate({ ...base, value: (firstMean * firstCount + secondMean * secondCount) / firstCount, mistakeType: 'used_wrong_average_divisor', operation: 'divide by first group count', inputs: [firstMean, firstCount, secondMean, secondCount] }),
        candidate({ ...base, value: (firstMean * secondCount + secondMean * firstCount) / (firstCount + secondCount), mistakeType: 'used_wrong_group_weight', operation: 'reverse group weights', inputs: [firstMean, firstCount, secondMean, secondCount] }),
        candidate({ ...base, value: (firstMean * firstCount + secondMean * secondCount) / Math.max(firstCount, secondCount), mistakeType: 'used_wrong_average_divisor', operation: 'divide by larger group only', inputs: [firstMean, firstCount, secondMean, secondCount] }),
        candidate({ ...base, value: firstMean + secondMean, mistakeType: 'confused_total_with_mean', operation: 'add group means', inputs: [firstMean, secondMean] }),
      ],
      precision, answerKind: 'number',
      explanationSteps: [`Weighted totals: ${firstMean} × ${firstCount} and ${secondMean} × ${secondCount}.`, `Divide their sum by ${firstCount + secondCount}.`],
      validationKind: 'combined', parameters: { firstMean, firstCount, secondMean, secondCount }, canonicalSignature: `combined-average|${firstMean}|${firstCount}|${secondMean}|${secondCount}`,
    })
  }, validate: validateQuestion,
}

export const weightedAverageGenerator: QuestionGenerator = {
  slug: 'weighted-average', version, title: 'Weighted Average', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'weighted-average' })
    const firstWeight = random.pick([30, 40])
    const secondWeight = 100 - firstWeight
    const firstValue = random.integer(70, 85)
    let secondValue = firstValue + random.integer(5, 12)
    if ((firstValue + secondValue) / 2 === weightedMean([{ value: firstValue, weight: firstWeight }, { value: secondValue, weight: secondWeight }])) secondValue += 1
    const correct = weightedMean([{ value: firstValue, weight: firstWeight }, { value: secondValue, weight: secondWeight }])
    const precision: AveragePrecision = Number.isInteger(correct) ? 0 : 1
    const base = { correct, precision, answerKind: 'number' as const }
    return buildQuestion({
      slug: 'weighted-average', difficulty: input.difficulty, seed: input.seed,
      prompt: `A grade uses ${firstWeight}% from a score of ${firstValue} and ${secondWeight}% from a score of ${secondValue}. Find the weighted average.`,
      correct,
      candidates: [
        candidate({ ...base, value: (firstValue + secondValue) / 2, mistakeType: 'simple_average_of_group_means', operation: 'ignore weights', inputs: [firstValue, secondValue] }),
        candidate({ ...base, value: (firstValue * secondWeight + secondValue * firstWeight) / 100, mistakeType: 'used_wrong_group_weight', operation: 'reverse weights', inputs: [firstValue, firstWeight, secondValue, secondWeight] }),
        candidate({ ...base, value: firstValue * firstWeight / 100, mistakeType: 'omitted_weighted_component', operation: 'use first component only', inputs: [firstValue, firstWeight] }),
        candidate({ ...base, value: (firstValue * firstWeight + secondValue * secondWeight) / 2, mistakeType: 'failed_total_weight_division', operation: 'divide weighted total by group count', inputs: [firstValue, firstWeight, secondValue, secondWeight] }),
        candidate({ ...base, value: firstValue + secondValue, mistakeType: 'confused_total_with_mean', operation: 'add scores', inputs: [firstValue, secondValue] }),
      ],
      precision, answerKind: 'number',
      explanationSteps: [`Compute ${firstValue} × ${firstWeight}% and ${secondValue} × ${secondWeight}%.`, `Add the weighted contributions.`],
      validationKind: 'weighted', parameters: { firstValue, firstWeight, secondValue, secondWeight }, canonicalSignature: `weighted-average|${firstValue}|${firstWeight}|${secondValue}|${secondWeight}`,
    })
  }, validate: validateQuestion,
}

function changedAverageQuestion(input: {
  slug: 'average-after-adding' | 'average-after-removing'
  seed: string
  difficulty: GeneratorDifficulty
}): GeneratedQuestion {
  const random = randomFor(input)
  const precision: AveragePrecision = 0
  if (input.slug === 'average-after-adding') {
    const currentCount = random.integer(4, 8)
    const currentMean = random.integer(15, 35)
    const delta = random.integer(2, 6)
    const changedValue = currentMean + delta * (currentCount + 1)
    const correct = meanAfterAdding(currentMean, currentCount, changedValue)
    const base = { correct, precision, answerKind: 'number' as const }
    return buildQuestion({
      slug: input.slug, difficulty: input.difficulty, seed: input.seed,
      prompt: `The average of ${currentCount} values is ${currentMean}. After adding ${changedValue}, what is the new average?`, correct,
      candidates: [
        candidate({ ...base, value: (currentMean + changedValue) / 2, mistakeType: 'averaged_mean_with_new_value', operation: 'average old mean and new value', inputs: [currentMean, changedValue] }),
        candidate({ ...base, value: (currentMean * currentCount + changedValue) / currentCount, mistakeType: 'divided_by_old_count_after_add', operation: 'divide by old count', inputs: [currentMean, currentCount, changedValue] }),
        candidate({ ...base, value: currentMean + changedValue, mistakeType: 'added_value_to_mean', operation: 'add value to mean', inputs: [currentMean, changedValue] }),
        candidate({ ...base, value: (currentMean * (currentCount + 1) + changedValue) / (currentCount + 1), mistakeType: 'forgot_increase_count', operation: 'treat old mean as having new count', inputs: [currentMean, currentCount, changedValue] }),
        candidate({ ...base, value: (currentMean * currentCount - changedValue) / (currentCount + 1), mistakeType: 'added_instead_of_subtracted_total', operation: 'subtract added value', inputs: [currentMean, currentCount, changedValue] }),
      ], precision, answerKind: 'number',
      explanationSteps: [`Old total: ${currentMean} × ${currentCount} = ${currentMean * currentCount}.`, `Add ${changedValue}, then divide by ${currentCount + 1}.`],
      validationKind: 'adding', parameters: { currentMean, currentCount, changedValue }, canonicalSignature: `${input.slug}|${currentMean}|${currentCount}|${changedValue}`,
    })
  }
  const currentCount = random.integer(5, 9)
  const correct = random.integer(15, 35)
  const changedValue = correct + random.integer(2, 6) * currentCount
  const currentMean = (correct * (currentCount - 1) + changedValue) / currentCount
  const base = { correct, precision, answerKind: 'number' as const }
  return buildQuestion({
    slug: input.slug, difficulty: input.difficulty, seed: input.seed,
    prompt: `The average of ${currentCount} values is ${currentMean}. If ${changedValue} is removed, what is the new average?`, correct,
    candidates: [
      candidate({ ...base, value: (currentMean * currentCount - changedValue) / currentCount, mistakeType: 'divided_by_original_count_after_remove', operation: 'divide by original count', inputs: [currentMean, currentCount, changedValue] }),
      candidate({ ...base, value: currentMean - changedValue, mistakeType: 'subtracted_value_from_mean', operation: 'subtract value directly from mean', inputs: [currentMean, changedValue] }),
      candidate({ ...base, value: (currentMean * (currentCount - 1) - changedValue) / (currentCount - 1), mistakeType: 'forgot_reduce_count', operation: 'use reduced count in old total', inputs: [currentMean, currentCount, changedValue] }),
      candidate({ ...base, value: (currentMean * currentCount + changedValue) / (currentCount - 1), mistakeType: 'added_removed_value', operation: 'add removed value', inputs: [currentMean, currentCount, changedValue] }),
      candidate({ ...base, value: changedValue, mistakeType: 'used_removed_value_as_answer', operation: 'use removed value directly', inputs: [changedValue] }),
    ], precision, answerKind: 'number',
    explanationSteps: [`Old total: ${currentMean} × ${currentCount} = ${currentMean * currentCount}.`, `Subtract ${changedValue}, then divide by ${currentCount - 1}.`],
    validationKind: 'removing', parameters: { currentMean, currentCount, changedValue }, canonicalSignature: `${input.slug}|${currentMean}|${currentCount}|${changedValue}`,
  })
}

export const averageAfterAddingGenerator: QuestionGenerator = {
  slug: 'average-after-adding', version, title: 'Average After Adding a Value', supportedDifficulties,
  generate(input) { return changedAverageQuestion({ ...input, slug: 'average-after-adding' }) }, validate: validateQuestion,
}
export const averageAfterRemovingGenerator: QuestionGenerator = {
  slug: 'average-after-removing', version, title: 'Average After Removing a Value', supportedDifficulties,
  generate(input) { return changedAverageQuestion({ ...input, slug: 'average-after-removing' }) }, validate: validateQuestion,
}

export const averageAgeGenerator: QuestionGenerator = {
  slug: 'average-age', version, title: 'Average Age Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'average-age' })
    const currentCount = random.integer(4, 8)
    const currentMean = random.integer(20, 35)
    const increase = random.integer(1, 3)
    const changedValue = currentMean + increase * (currentCount + 1)
    const correct = meanAfterAdding(currentMean, currentCount, changedValue)
    const base = { correct, precision: 0 as const, answerKind: 'number' as const, suffix: ' years' }
    return buildQuestion({
      slug: 'average-age', difficulty: input.difficulty, seed: input.seed,
      prompt: `${currentCount} employees have an average age of ${currentMean}. A ${changedValue}-year-old employee joins. What is the new average age?`, correct,
      candidates: [
        candidate({ ...base, value: (currentMean + changedValue) / 2, mistakeType: 'averaged_mean_with_new_value', operation: 'average mean and joining age', inputs: [currentMean, changedValue] }),
        candidate({ ...base, value: (currentMean * currentCount + changedValue) / currentCount, mistakeType: 'used_wrong_average_divisor', operation: 'use old employee count', inputs: [currentMean, currentCount, changedValue] }),
        candidate({ ...base, value: currentMean + changedValue, mistakeType: 'confused_total_with_mean', operation: 'add age to mean', inputs: [currentMean, changedValue] }),
        candidate({ ...base, value: currentMean * currentCount + changedValue, mistakeType: 'confused_total_with_mean', operation: 'use total age', inputs: [currentMean, currentCount, changedValue] }),
        candidate({ ...base, value: changedValue, mistakeType: 'used_average_as_missing_value', operation: 'use joining age', inputs: [changedValue] }),
      ], precision: 0, answerKind: 'number', suffix: ' years',
      explanationSteps: [`Original total age: ${currentMean * currentCount}.`, `Add ${changedValue} and divide by ${currentCount + 1}.`],
      validationKind: 'age', parameters: { currentMean, currentCount, changedValue }, canonicalSignature: `average-age|${currentMean}|${currentCount}|${changedValue}`, unit: 'years',
    })
  }, validate: validateQuestion,
}

export const averageScoreSalaryGenerator: QuestionGenerator = {
  slug: 'average-score-salary', version, title: 'Average Score and Salary Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'average-score-salary' })
    const money = input.difficulty === 'hard' && random.integer(0, 1) === 1
    const currentCount = 4
    const currentMean = money ? random.integer(70, 90) * 10 : random.integer(70, 82)
    const targetMean = currentMean + (money ? random.integer(1, 3) * 10 : random.integer(1, 3))
    const correct = requiredValueForTargetMean(currentMean, currentCount, targetMean)
    const answerKind: AnswerKind = money ? 'money' : 'number'
    const base = { correct, precision: 0 as const, answerKind }
    return buildQuestion({
      slug: 'average-score-salary', difficulty: input.difficulty, seed: input.seed,
      prompt: money ? `A worker averages ${formatAverageMoney(currentMean, 0)} over ${currentCount} days. What fifth-day earning is needed to average ${formatAverageMoney(targetMean, 0)}?` : `A team averages ${currentMean} after ${currentCount} games. What fifth score is needed to average ${targetMean}?`, correct,
      candidates: [
        candidate({ ...base, value: targetMean, mistakeType: 'target_mean_as_required_value', operation: 'use target mean as required value', inputs: [targetMean] }),
        candidate({ ...base, value: targetMean * currentCount - currentMean * currentCount, mistakeType: 'used_wrong_average_divisor', operation: 'forget the new observation count', inputs: [targetMean, currentMean, currentCount] }),
        candidate({ ...base, value: targetMean * (currentCount + 1), mistakeType: 'forgot_previous_total', operation: 'use target total', inputs: [targetMean, currentCount] }),
        candidate({ ...base, value: (currentMean + targetMean) / 2, mistakeType: 'averaged_current_and_target_means', operation: 'average current and target means', inputs: [currentMean, targetMean] }),
        candidate({ ...base, value: currentMean * currentCount - targetMean * (currentCount + 1), mistakeType: 'reversed_required_value_subtraction', operation: 'subtract target total in reverse', inputs: [currentMean, currentCount, targetMean] }),
      ], precision: 0, answerKind,
      explanationSteps: [`Target total: ${formatAverage(targetMean * (currentCount + 1), 0)}.`, `Current total: ${formatAverage(currentMean * currentCount, 0)}.`, `Subtract to get the required value.`],
      validationKind: 'target', parameters: { currentMean, currentCount, targetMean }, canonicalSignature: `average-score-salary|${currentMean}|${targetMean}|${money}`, unit: money ? 'PHP' : null,
    })
  }, validate: validateQuestion,
}

export const averageGenerators = [
  findingAverageGenerator,
  missingValueAverageGenerator,
  combinedAverageGenerator,
  weightedAverageGenerator,
  averageAfterAddingGenerator,
  averageAfterRemovingGenerator,
  averageAgeGenerator,
  averageScoreSalaryGenerator,
] as const satisfies readonly QuestionGenerator[]
