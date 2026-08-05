import {
  chooseAgeProblemDistractors,
  createAgeProblemDistractor,
  type AgeProblemDistractor,
} from '../../domain/age-problems/age-problem-distractors'
import { formatAgeAnswer } from '../../domain/age-problems/age-problem-format'
import {
  ageDifference,
  ageInFuture,
  ageInPast,
  ageSum,
  solveElapsedTimeForRatio,
  solveTwoPersonAgeSystem,
} from '../../domain/age-problems/age-problem-math'
import {
  hasConstantAgeDifference,
  isRealisticAge,
  ratioMatchesAtTime,
  validateParentChildAges,
} from '../../domain/age-problems/age-problem-validation'
import type {
  DistractorMistakeType,
} from '../../domain/distractor-models'
import { createSeededRandom, type SeededRandom } from '../generator-random'
import type {
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
  | 'known-pair'
  | 'pair-sum-difference'
  | 'referenced-ratio-difference'
  | 'timeline-sum'
  | 'ratio-condition'
  | 'group-spacing'
  | 'elapsed-ratio'
  | 'difference-invariant'

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

function candidate(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  unit?: string
  qualityScore?: number
}): AgeProblemDistractor | null {
  return createAgeProblemDistractor(input)
}

function numericParameter(
  parameters: Record<string, unknown>,
  key: string,
): number {
  const value = parameters[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid age-problem numeric parameter ${key}.`)
  }
  return value
}

function stringParameter(
  parameters: Record<string, unknown>,
  key: string,
): string {
  const value = parameters[key]
  if (typeof value !== 'string') {
    throw new Error(`Invalid age-problem string parameter ${key}.`)
  }
  return value
}

function numericArrayParameter(
  parameters: Record<string, unknown>,
  key: string,
): number[] {
  const value = parameters[key]
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'number' || !Number.isFinite(item))
  ) {
    throw new Error(`Invalid age-problem numeric array parameter ${key}.`)
  }
  return value as number[]
}

export function recomputeAgeProblemAnswer(
  question: GeneratedQuestion,
): number {
  const parameters = question.parameters
  const kind = parameters.validationKind

  if (kind === 'known-pair') {
    const older = numericParameter(parameters, 'knownOlder')
    const difference = numericParameter(parameters, 'difference')
    return stringParameter(parameters, 'requested') === 'older'
      ? older
      : older - difference
  }

  if (kind === 'pair-sum-difference') {
    const solved = solveTwoPersonAgeSystem(
      {
        olderCoefficient: 1,
        youngerCoefficient: 1,
        constant: numericParameter(parameters, 'sum'),
      },
      {
        olderCoefficient: 1,
        youngerCoefficient: -1,
        constant: numericParameter(parameters, 'difference'),
      },
    )
    if (solved === null) throw new Error('Age pair has no unique integer solution.')
    return stringParameter(parameters, 'requested') === 'older'
      ? solved.older
      : solved.younger
  }

  if (kind === 'referenced-ratio-difference') {
    const direction = stringParameter(parameters, 'direction')
    const years = numericParameter(parameters, 'years')
    const olderPart = numericParameter(parameters, 'olderPart')
    const youngerPart = numericParameter(parameters, 'youngerPart')
    const timelineConstant = direction === 'future'
      ? (olderPart - youngerPart) * years
      : (youngerPart - olderPart) * years
    const solved = solveTwoPersonAgeSystem(
      {
        olderCoefficient: 1,
        youngerCoefficient: -1,
        constant: numericParameter(parameters, 'difference'),
      },
      {
        olderCoefficient: youngerPart,
        youngerCoefficient: -olderPart,
        constant: timelineConstant,
      },
    )
    if (solved === null) throw new Error('Timeline ratio has no unique integer solution.')
    const requested = stringParameter(parameters, 'requested')
    if (requested === 'older') return solved.older
    if (requested === 'younger') return solved.younger
    if (requested === 'referencedOlder') {
      return direction === 'future'
        ? ageInFuture(solved.older, years)
        : ageInPast(solved.older, years)
    }
    return direction === 'future'
      ? ageInFuture(solved.younger, years)
      : ageInPast(solved.younger, years)
  }

  if (kind === 'timeline-sum') {
    const referenceSum = numericParameter(parameters, 'referenceSum')
    const count = numericParameter(parameters, 'count')
    const years = numericParameter(parameters, 'years')
    const direction = stringParameter(parameters, 'direction')
    return direction === 'future'
      ? referenceSum - count * years
      : referenceSum + count * years
  }

  if (kind === 'ratio-condition') {
    const olderPart = numericParameter(parameters, 'olderPart')
    const youngerPart = numericParameter(parameters, 'youngerPart')
    const conditionValue = numericParameter(parameters, 'conditionValue')
    const divisor = stringParameter(parameters, 'condition') === 'sum'
      ? olderPart + youngerPart
      : olderPart - youngerPart
    if (conditionValue % divisor !== 0) {
      throw new Error('Age ratio condition does not have an integer factor.')
    }
    const factor = conditionValue / divisor
    return stringParameter(parameters, 'requested') === 'older'
      ? olderPart * factor
      : youngerPart * factor
  }

  if (kind === 'group-spacing') {
    const count = numericParameter(parameters, 'count')
    const step = numericParameter(parameters, 'step')
    const total = numericParameter(parameters, 'total')
    const offsetTotal = step * count * (count - 1) / 2
    const youngest = (total - offsetTotal) / count
    if (!Number.isInteger(youngest)) {
      throw new Error('Sibling ages do not have an integer solution.')
    }
    const requested = stringParameter(parameters, 'requested')
    if (requested === 'youngest') return youngest
    if (requested === 'middle') return youngest + step
    return youngest + step * (count - 1)
  }

  if (kind === 'elapsed-ratio') {
    const direction = stringParameter(parameters, 'direction')
    if (direction !== 'past' && direction !== 'future') {
      throw new Error('Elapsed-time direction is invalid.')
    }
    const years = solveElapsedTimeForRatio({
      older: numericParameter(parameters, 'older'),
      younger: numericParameter(parameters, 'younger'),
      ratio: {
        olderPart: numericParameter(parameters, 'olderPart'),
        youngerPart: numericParameter(parameters, 'youngerPart'),
      },
      direction,
    })
    if (years === null) throw new Error('Elapsed time is not a valid integer.')
    return years
  }

  if (kind === 'difference-invariant') {
    return numericParameter(parameters, 'older') -
      numericParameter(parameters, 'younger')
  }

  throw new Error('Unsupported age-problem validation kind.')
}

function buildQuestion(input: {
  slug: GeneratorSlug
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  correct: number
  candidates: readonly (AgeProblemDistractor | null)[]
  explanationSteps: string[]
  validationKind: ValidationKind
  parameters: Record<string, unknown>
  canonicalSignature: string
  unit?: string
}): GeneratedQuestion {
  if (!Number.isInteger(input.correct) || input.correct < 0) {
    throw new Error('Age-problem answers must be nonnegative integers.')
  }
  const unit = input.unit ?? 'years'
  const distractors = chooseAgeProblemDistractors(input.candidates)
  const random = randomFor(input)
  const choices: ChoiceDraft[] = random.shuffle([
    {
      text: formatAgeAnswer(input.correct, unit),
      value: input.correct,
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
  if (
    new Set(choices.map((choice) => choice.value)).size !== 4 ||
    new Set(choices.map((choice) => choice.text)).size !== 4
  ) {
    throw new Error('Age-problem choices must be visibly and numerically unique.')
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
      answerUnit: unit,
      correctIdentity: String(input.correct),
      choiceIdentities: choices.map((choice) => String(choice.value)),
    },
    choices: choices.map((choice) => ({
      text: choice.text,
      isCorrect: choice.value === input.correct,
      distractorType: choice.mistakeType,
      mistakeType: choice.mistakeType,
      derivation: choice.derivation,
      qualityScore: choice.qualityScore,
      numericValue: choice.value,
    })),
    explanation: {
      title: 'Solution',
      steps: input.explanationSteps,
      finalAnswer: formatAgeAnswer(input.correct, unit),
    },
    metadata: {
      answerKind: 'count',
      unit,
      canonicalSignature: input.canonicalSignature,
    },
  }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    if (
      question.generatorVersion !== version ||
      !supportedDifficulties.includes(question.difficulty) ||
      question.choices.length !== 4 ||
      question.prompt.trim().length < 20
    ) {
      return { valid: false, reason: 'Generator metadata is invalid.' }
    }

    const expected = recomputeAgeProblemAnswer(question)
    const correctChoices = question.choices.filter((choice) => choice.isCorrect)
    const identities = question.parameters.choiceIdentities
    const presentAges = numericArrayParameter(question.parameters, 'presentAges')
    const pastAges = question.parameters.pastAges === undefined
      ? []
      : numericArrayParameter(question.parameters, 'pastAges')

    if (
      presentAges.some((age) => !isRealisticAge(age, 'general')) ||
      pastAges.some((age) => !Number.isInteger(age) || age < 0) ||
      correctChoices.length !== 1 ||
      correctChoices[0]?.numericValue !== expected ||
      correctChoices[0]?.text !== question.explanation.finalAnswer ||
      question.parameters.correctIdentity !== String(expected) ||
      !Array.isArray(identities) ||
      new Set(identities).size !== 4 ||
      new Set(question.choices.map((choice) => choice.text)).size !== 4
    ) {
      return { valid: false, reason: 'Age answer, timeline, or choice validation failed.' }
    }

    if (
      question.parameters.validationKind !== 'timeline-sum' &&
      question.parameters.years !== undefined &&
      presentAges.length >= 2
    ) {
      const direction = question.parameters.direction
      if (
        (direction === 'past' || direction === 'future') &&
        !hasConstantAgeDifference({
          older: presentAges[0] as number,
          younger: presentAges[1] as number,
          years: numericParameter(question.parameters, 'years'),
          direction,
        })
      ) {
        return { valid: false, reason: 'Age difference changed across the timeline.' }
      }
    }

    if (question.parameters.olderPart !== undefined && question.parameters.years !== undefined) {
      const direction = question.parameters.direction
      if (
        direction !== 'present' && direction !== 'past' && direction !== 'future'
      ) {
        return { valid: false, reason: 'Ratio timeline is invalid.' }
      }
      if (
        presentAges.length >= 2 &&
        !ratioMatchesAtTime({
          older: presentAges[0] as number,
          younger: presentAges[1] as number,
          years: numericParameter(question.parameters, 'years'),
          direction,
          olderPart: numericParameter(question.parameters, 'olderPart'),
          youngerPart: numericParameter(question.parameters, 'youngerPart'),
        })
      ) {
        return { valid: false, reason: 'Age ratio does not hold at the stated time.' }
      }
    }

    if (
      question.parameters.parentChild === true &&
      !validateParentChildAges(
        presentAges[0] as number,
        presentAges[1] as number,
      )
    ) {
      return { valid: false, reason: 'Parent and child ages are implausible.' }
    }

    for (const choice of question.choices) {
      if (
        !Number.isFinite(choice.numericValue) ||
        !Number.isInteger(choice.numericValue) ||
        choice.numericValue < 0
      ) {
        return { valid: false, reason: 'An age choice is not a nonnegative integer.' }
      }
      if (
        !choice.isCorrect &&
        (choice.mistakeType === null ||
          choice.derivation === null ||
          choice.qualityScore < 35)
      ) {
        return { valid: false, reason: 'An age distractor is undocumented.' }
      }
    }

    return { valid: true, reason: null }
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : 'Age validation failed.',
    }
  }
}

function pairCandidates(input: {
  correct: number
  older: number
  younger: number
  years?: number
}): readonly (AgeProblemDistractor | null)[] {
  const years = input.years ?? 0
  return [
    candidate({ value: input.correct === input.older ? input.younger : input.older, correct: input.correct, mistakeType: 'returned_wrong_person_age', operation: 'return the other person age', inputs: [input.older, input.younger] }),
    candidate({ value: input.older + input.younger, correct: input.correct, mistakeType: 'used_age_total_as_one_age', operation: 'use combined age as one age', inputs: [input.older, input.younger] }),
    candidate({ value: input.older - input.younger, correct: input.correct, mistakeType: 'reversed_older_younger_age', operation: 'use age difference as requested age', inputs: [input.older, input.younger] }),
    candidate({ value: input.correct + years, correct: input.correct, mistakeType: 'returned_future_instead_of_present_age', operation: 'return referenced future age', inputs: [input.correct, years] }),
    candidate({ value: input.correct - years, correct: input.correct, mistakeType: 'returned_past_instead_of_present_age', operation: 'return referenced past age', inputs: [input.correct, years] }),
    candidate({ value: Math.trunc((input.older + input.younger) / 2), correct: input.correct, mistakeType: 'divided_age_difference_without_total', operation: 'average the two ages', inputs: [input.older, input.younger] }),
    candidate({ value: input.younger + (input.older - input.younger) * 2, correct: input.correct, mistakeType: 'used_wrong_age_multiplier', operation: 'apply age gap twice', inputs: [input.older, input.younger] }),
  ]
}

export const presentAgeEquationsGenerator: QuestionGenerator = {
  slug: 'present-age-equations',
  version,
  title: 'Present Age Equations',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'present-age-equations' })
    const younger = random.integer(8, input.difficulty === 'hard' ? 35 : 26)
    const difference = random.integer(4, 18)
    const older = younger + difference
    const requested = random.pick(['older', 'younger'] as const)
    const correct = requested === 'older' ? older : younger
    const easy = input.difficulty === 'easy'
    return buildQuestion({
      slug: 'present-age-equations', difficulty: input.difficulty, seed: input.seed,
      prompt: easy
        ? `An employee is ${older} years old and is ${difference} years older than a colleague. How old is the younger colleague?`
        : `Two people have a total age of ${older + younger} years. The older person is ${difference} years older. Find the ${requested} person's present age.`,
      correct: easy ? younger : correct,
      candidates: pairCandidates({ correct: easy ? younger : correct, older, younger }),
      explanationSteps: easy
        ? [`Subtract the constant age difference: ${older} - ${difference} = ${younger}.`, `The younger colleague is ${younger} years old.`]
        : [`Let O and Y be the present ages: O + Y = ${older + younger} and O - Y = ${difference}.`, `Adding gives 2O = ${2 * older}, so O = ${older}; then Y = ${younger}.`, `The requested present age is ${correct}.`],
      validationKind: easy ? 'known-pair' : 'pair-sum-difference',
      parameters: easy
        ? { knownOlder: older, difference, requested: 'younger', presentAges: [older, younger] }
        : { sum: older + younger, difference, requested, presentAges: [older, younger] },
      canonicalSignature: `present-age-equations|${easy ? 'known' : 'system'}|${older}|${younger}|${requested}`,
    })
  },
  validate: validateQuestion,
}

function referencedRatioQuestion(input: {
  seed: string
  difficulty: GeneratorDifficulty
  slug: 'past-age-problems' | 'future-age-problems'
}): GeneratedQuestion {
  const random = randomFor(input)
  const direction = input.slug === 'past-age-problems' ? 'past' : 'future'
  const years = random.integer(2, input.difficulty === 'hard' ? 9 : 7)
  const olderPart = random.pick([2, 3])
  const youngerPart = 1
  const referencedYounger = direction === 'past'
    ? random.integer(6, 18)
    : random.integer(14, 26)
  const referencedOlder = olderPart * referencedYounger
  const older = direction === 'past'
    ? referencedOlder + years
    : referencedOlder - years
  const younger = direction === 'past'
    ? referencedYounger + years
    : referencedYounger - years
  const difference = ageDifference(older, younger)
  const requested = random.pick(['older', 'younger'] as const)
  const correct = requested === 'older' ? older : younger
  return buildQuestion({
    slug: input.slug, difficulty: input.difficulty, seed: input.seed,
    prompt: `${years} years ${direction === 'past' ? 'ago' : 'from now'}, the older person ${direction === 'past' ? 'was' : 'will be'} ${olderPart} times the younger person's age. Their present age difference is ${difference} years. Find the ${requested} person's present age.`,
    correct,
    candidates: [
      ...pairCandidates({ correct, older, younger, years }),
      candidate({ value: requested === 'older' ? referencedOlder : referencedYounger, correct, mistakeType: 'returned_referenced_instead_of_present_value', operation: 'return age at referenced time', inputs: [correct, years] }),
      candidate({ value: olderPart * younger, correct, mistakeType: 'used_ratio_at_wrong_time', operation: 'apply ratio to present younger age', inputs: [olderPart, younger] }),
      candidate({ value: correct + (direction === 'past' ? years : -years), correct, mistakeType: direction === 'past' ? 'adjusted_only_one_past_age' : 'adjusted_only_one_future_age', operation: 'adjust only requested person', inputs: [correct, years] }),
    ],
    explanationSteps: [`Let O and Y be present ages, with O - Y = ${difference}.`, `${years} years ${direction === 'past' ? 'ago' : 'from now'}: ${direction === 'past' ? `O - ${years} = ${olderPart}(Y - ${years})` : `O + ${years} = ${olderPart}(Y + ${years})`}.`, `Solving gives O = ${older} and Y = ${younger}; the requested present age is ${correct}.`],
    validationKind: 'referenced-ratio-difference',
    parameters: { direction, years, olderPart, youngerPart, difference, requested, presentAges: [older, younger], pastAges: direction === 'past' ? [referencedOlder, referencedYounger] : [] },
    canonicalSignature: `${input.slug}|${years}|${olderPart}|${referencedYounger}|${requested}`,
  })
}

export const pastAgeProblemsGenerator: QuestionGenerator = {
  slug: 'past-age-problems', version, title: 'Past Age Problems', supportedDifficulties,
  generate(input) { return referencedRatioQuestion({ ...input, slug: 'past-age-problems' }) },
  validate: validateQuestion,
}

export const futureAgeProblemsGenerator: QuestionGenerator = {
  slug: 'future-age-problems', version, title: 'Future Age Problems', supportedDifficulties,
  generate(input) { return referencedRatioQuestion({ ...input, slug: 'future-age-problems' }) },
  validate: validateQuestion,
}

export const ageDifferenceGenerator: QuestionGenerator = {
  slug: 'age-difference', version, title: 'Age Difference', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'age-difference' })
    const younger = random.integer(8, 32)
    const difference = random.integer(4, 25)
    const older = younger + difference
    const years = random.integer(3, 15)
    return buildQuestion({
      slug: 'age-difference', difficulty: input.difficulty, seed: input.seed,
      prompt: `Two people are now ${older} and ${younger} years old. What will their age difference be ${years} years from now?`,
      correct: difference,
      candidates: [
        candidate({ value: difference + years, correct: difference, mistakeType: 'changed_age_difference_over_time', operation: 'increase gap by elapsed years', inputs: [difference, years] }),
        candidate({ value: Math.abs(difference - years), correct: difference, mistakeType: 'changed_age_difference_over_time', operation: 'decrease gap by elapsed years', inputs: [difference, years] }),
        candidate({ value: years, correct: difference, mistakeType: 'used_age_difference_as_elapsed_time', operation: 'use elapsed years as gap', inputs: [difference, years] }),
        candidate({ value: older + younger + 2 * years, correct: difference, mistakeType: 'used_age_total_as_one_age', operation: 'return future total', inputs: [older, younger, years] }),
        candidate({ value: Math.trunc(difference / 2), correct: difference, mistakeType: 'divided_age_difference_without_total', operation: 'halve age gap', inputs: [difference] }),
      ],
      explanationSteps: [`The present difference is ${older} - ${younger} = ${difference}.`, `After ${years} years both ages increase by ${years}, so the subtraction still gives ${difference}.`],
      validationKind: 'difference-invariant', parameters: { older, younger, years, direction: 'future', presentAges: [older, younger] },
      canonicalSignature: `age-difference|${older}|${younger}|${years}`,
    })
  }, validate: validateQuestion,
}

export const sumOfAgesGenerator: QuestionGenerator = {
  slug: 'sum-of-ages', version, title: 'Sum of Ages', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'sum-of-ages' })
    const count = input.difficulty === 'hard' ? 3 : random.pick([2, 3])
    const presentAges = Array.from({ length: count }, () => random.integer(10, 32))
    const presentSum = ageSum(presentAges)
    const years = random.integer(2, 8)
    const direction = random.pick(['past', 'future'] as const)
    const referenceSum = direction === 'future'
      ? presentSum + count * years
      : presentSum - count * years
    if (direction === 'past' && presentAges.some((age) => age - years < 5)) {
      return this.generate({ ...input, seed: `${input.seed}|retry-past-sum` })
    }
    return buildQuestion({
      slug: 'sum-of-ages', difficulty: input.difficulty, seed: input.seed,
      prompt: `${years} years ${direction === 'past' ? 'ago' : 'from now'}, the total age of ${count} people ${direction === 'past' ? 'was' : 'will be'} ${referenceSum} years. What is their present total age?`,
      correct: presentSum,
      candidates: [
        candidate({ value: direction === 'future' ? referenceSum - years : referenceSum + years, correct: presentSum, mistakeType: 'adjusted_age_sum_once_only', operation: 'adjust total once instead of per person', inputs: [referenceSum, years, count] }),
        candidate({ value: referenceSum, correct: presentSum, mistakeType: 'returned_referenced_instead_of_present_value', operation: 'return referenced total', inputs: [referenceSum] }),
        candidate({ value: direction === 'future' ? referenceSum + count * years : Math.max(0, referenceSum - count * years), correct: presentSum, mistakeType: 'used_wrong_timeline_sign', operation: 'reverse total timeline adjustment', inputs: [referenceSum, years, count] }),
        candidate({ value: Math.trunc(referenceSum / count), correct: presentSum, mistakeType: 'used_wrong_age_group_count', operation: 'return average instead of total', inputs: [referenceSum, count] }),
        candidate({ value: presentSum - (presentAges.at(-1) as number), correct: presentSum, mistakeType: 'omitted_person_from_age_total', operation: 'omit one person', inputs: presentAges }),
      ],
      explanationSteps: [`Every one of the ${count} people changes by ${years} years, so the total changes by ${count} × ${years} = ${count * years}.`, direction === 'future' ? `Subtract from the future total: ${referenceSum} - ${count * years} = ${presentSum}.` : `Add to the past total: ${referenceSum} + ${count * years} = ${presentSum}.`],
      validationKind: 'timeline-sum', parameters: { referenceSum, count, years, direction, presentAges, pastAges: direction === 'past' ? presentAges.map((age) => age - years) : [] },
      canonicalSignature: `sum-of-ages|${direction}|${referenceSum}|${count}|${years}`,
    })
  }, validate: validateQuestion,
}

export const ageRatiosGenerator: QuestionGenerator = {
  slug: 'age-ratios', version, title: 'Age Ratios', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'age-ratios' })
    const [olderPart, youngerPart] = random.pick([[2, 1], [3, 2], [5, 2]] as const)
    const factor = random.integer(5, 12)
    const older = olderPart * factor
    const younger = youngerPart * factor
    const condition = random.pick(['sum', 'difference'] as const)
    const conditionValue = condition === 'sum' ? older + younger : older - younger
    const requested = random.pick(['older', 'younger'] as const)
    const correct = requested === 'older' ? older : younger
    return buildQuestion({
      slug: 'age-ratios', difficulty: input.difficulty, seed: input.seed,
      prompt: `The present ages of two people are in the ratio ${olderPart}:${youngerPart}. Their ${condition} is ${conditionValue} years. Find the ${requested} person's age.`,
      correct,
      candidates: [
        ...pairCandidates({ correct, older, younger }),
        candidate({ value: requested === 'older' ? olderPart : youngerPart, correct, mistakeType: 'used_ratio_parts_as_ages', operation: 'use ratio term as actual age', inputs: [olderPart, youngerPart] }),
        candidate({ value: requested === 'older' ? younger : older, correct, mistakeType: 'reversed_age_ratio', operation: 'reverse ratio roles', inputs: [older, younger] }),
        candidate({ value: Math.trunc(conditionValue / (requested === 'older' ? olderPart : youngerPart)), correct, mistakeType: 'divided_by_one_ratio_term', operation: 'divide condition by one ratio part', inputs: [conditionValue, olderPart, youngerPart] }),
      ],
      explanationSteps: [`Let one ratio unit be k. The ages are ${olderPart}k and ${youngerPart}k.`, condition === 'sum' ? `(${olderPart} + ${youngerPart})k = ${conditionValue}, so k = ${factor}.` : `(${olderPart} - ${youngerPart})k = ${conditionValue}, so k = ${factor}.`, `The requested age is ${correct}.`],
      validationKind: 'ratio-condition', parameters: { olderPart, youngerPart, condition, conditionValue, requested, years: 0, direction: 'present', presentAges: [older, younger] },
      canonicalSignature: `age-ratios|${olderPart}|${youngerPart}|${condition}|${factor}|${requested}`,
    })
  }, validate: validateQuestion,
}

export const parentChildAgesGenerator: QuestionGenerator = {
  slug: 'parent-child-ages', version, title: 'Parent and Child Ages', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'parent-child-ages' })
    const possibilities: Array<{ child: number; parent: number; years: number; ratio: number }> = []
    for (let child = 7; child <= 18; child += 1) {
      for (let years = 2; years <= 8; years += 1) {
        for (const ratio of [2, 3]) {
          const parent = ratio * (child + years) - years
          if (validateParentChildAges(parent, child)) possibilities.push({ child, parent, years, ratio })
        }
      }
    }
    const selected = random.pick(possibilities)
    const difference = ageDifference(selected.parent, selected.child)
    const requested = random.pick(['older', 'younger'] as const)
    const correct = requested === 'older' ? selected.parent : selected.child
    return buildQuestion({
      slug: 'parent-child-ages', difficulty: input.difficulty, seed: input.seed,
      prompt: `A parent is ${difference} years older than a child. In ${selected.years} years, the parent will be ${selected.ratio} times the child's age. Find the ${requested === 'older' ? 'parent' : 'child'}'s present age.`,
      correct,
      candidates: [
        ...pairCandidates({ correct, older: selected.parent, younger: selected.child, years: selected.years }),
        candidate({ value: selected.ratio * selected.child, correct, mistakeType: 'used_ratio_at_wrong_time', operation: 'apply future ratio to present child', inputs: [selected.ratio, selected.child] }),
        candidate({ value: selected.child + selected.years, correct, mistakeType: 'returned_future_instead_of_present_age', operation: 'return child future age', inputs: [selected.child, selected.years] }),
      ],
      explanationSteps: [`Let P and C be present ages: P - C = ${difference}.`, `In ${selected.years} years, P + ${selected.years} = ${selected.ratio}(C + ${selected.years}).`, `Solving gives P = ${selected.parent} and C = ${selected.child}; the requested age is ${correct}.`],
      validationKind: 'referenced-ratio-difference', parameters: { direction: 'future', years: selected.years, olderPart: selected.ratio, youngerPart: 1, difference, requested, parentChild: true, presentAges: [selected.parent, selected.child] },
      canonicalSignature: `parent-child-ages|${selected.parent}|${selected.child}|${selected.years}|${requested}`,
    })
  }, validate: validateQuestion,
}

export const siblingGroupAgesGenerator: QuestionGenerator = {
  slug: 'sibling-group-ages', version, title: 'Sibling and Group Ages', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'sibling-group-ages' })
    const count = 3
    const step = random.integer(1, 4)
    const youngest = random.integer(7, 20)
    const ages = Array.from({ length: count }, (_, index) => youngest + index * step)
    const total = ageSum(ages)
    const requested = input.difficulty === 'easy' ? 'oldest' : random.pick(['youngest', 'middle', 'oldest'] as const)
    const correct = requested === 'youngest' ? youngest : requested === 'middle' ? youngest + step : youngest + 2 * step
    return buildQuestion({
      slug: 'sibling-group-ages', difficulty: input.difficulty, seed: input.seed,
      prompt: `Three siblings are ${step} years apart in age and their ages total ${total} years. Find the ${requested} sibling's age.`,
      correct,
      candidates: [
        ...pairCandidates({ correct, older: ages[2] as number, younger: ages[0] as number }),
        candidate({ value: Math.trunc(total / 2), correct, mistakeType: 'used_wrong_age_group_count', operation: 'divide total by two siblings', inputs: [total, count] }),
        candidate({ value: youngest + 2, correct, mistakeType: 'used_wrong_sibling_spacing', operation: 'use fixed two-year spacing', inputs: [youngest, step] }),
        candidate({ value: total - (ages[1] as number), correct, mistakeType: 'omitted_person_from_age_total', operation: 'omit middle sibling from total', inputs: ages }),
      ],
      explanationSteps: [`Let the youngest be x. The ages are x, x + ${step}, and x + ${2 * step}.`, `3x + ${3 * step} = ${total}, so x = ${youngest}.`, `The requested ${requested} age is ${correct}.`],
      validationKind: 'group-spacing', parameters: { count, step, total, requested, presentAges: [...ages].reverse() },
      canonicalSignature: `sibling-group-ages|${youngest}|${step}|${requested}`,
    })
  }, validate: validateQuestion,
}

export const mixedAgeRelationshipsGenerator: QuestionGenerator = {
  slug: 'mixed-age-relationships', version, title: 'Mixed Age Relationships', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'mixed-age-relationships' })
    const direction = input.difficulty === 'easy' ? 'future' : random.pick(['past', 'future'] as const)
    const ratio = random.pick([2, 3])
    const years = random.integer(2, 8)
    const maximumFutureYounger = Math.floor((80 + years) / ratio - years)
    const younger = direction === 'future'
      ? random.integer(10, Math.min(24, maximumFutureYounger))
      : random.integer(years + 6, 28)
    const older = direction === 'future'
      ? ratio * (younger + years) - years
      : ratio * (younger - years) + years
    const solvedYears = solveElapsedTimeForRatio({ older, younger, ratio: { olderPart: ratio, youngerPart: 1 }, direction })
    if (solvedYears === null) throw new Error('Constructed elapsed-time problem is invalid.')
    const gap = ageDifference(older, younger)
    return buildQuestion({
      slug: 'mixed-age-relationships', difficulty: input.difficulty, seed: input.seed,
      prompt: `Two people are now ${older} and ${younger} years old. How many years ${direction === 'future' ? 'from now' : 'ago'} ${direction === 'future' ? 'will' : 'was'} the older person be ${ratio} times the younger person's age?`,
      correct: solvedYears,
      candidates: [
        candidate({ value: gap, correct: solvedYears, mistakeType: 'used_age_difference_as_elapsed_time', operation: 'use present age gap as elapsed time', inputs: [older, younger] }),
        candidate({ value: younger, correct: solvedYears, mistakeType: 'returned_wrong_person_age', operation: 'return younger present age', inputs: [younger] }),
        candidate({ value: older, correct: solvedYears, mistakeType: 'returned_wrong_person_age', operation: 'return older present age', inputs: [older] }),
        candidate({ value: ratio, correct: solvedYears, mistakeType: 'used_ratio_parts_as_ages', operation: 'use ratio multiplier as elapsed years', inputs: [ratio] }),
        candidate({ value: solvedYears * ratio, correct: solvedYears, mistakeType: 'adjusted_only_one_future_age', operation: 'multiply elapsed time by age ratio', inputs: [solvedYears, ratio] }),
        candidate({ value: solvedYears + younger, correct: solvedYears, mistakeType: 'returned_referenced_instead_of_present_value', operation: 'return shifted younger age', inputs: [younger, solvedYears] }),
        candidate({ value: Math.trunc((older + ratio * younger) / (ratio + 1)), correct: solvedYears, mistakeType: 'used_wrong_timeline_sign', operation: 'solve with both timeline signs positive', inputs: [older, younger, ratio] }),
      ],
      explanationSteps: [`Let t be the number of years ${direction === 'future' ? 'from now' : 'ago'}.`, direction === 'future' ? `${older} + t = ${ratio}(${younger} + t).` : `${older} - t = ${ratio}(${younger} - t).`, `Solving gives t = ${solvedYears}. Substitution verifies the ${ratio}:1 ratio at that time.`],
      validationKind: 'elapsed-ratio', parameters: { direction, years: solvedYears, older, younger, olderPart: ratio, youngerPart: 1, presentAges: [older, younger], pastAges: direction === 'past' ? [older - solvedYears, younger - solvedYears] : [] },
      canonicalSignature: `mixed-age-relationships|${direction}|${older}|${younger}|${ratio}`,
      unit: direction === 'future' ? 'years from now' : 'years ago',
    })
  }, validate: validateQuestion,
}

export const ageProblemGenerators = [
  presentAgeEquationsGenerator,
  pastAgeProblemsGenerator,
  futureAgeProblemsGenerator,
  ageDifferenceGenerator,
  sumOfAgesGenerator,
  ageRatiosGenerator,
  parentChildAgesGenerator,
  siblingGroupAgesGenerator,
  mixedAgeRelationshipsGenerator,
] as const satisfies readonly QuestionGenerator[]
