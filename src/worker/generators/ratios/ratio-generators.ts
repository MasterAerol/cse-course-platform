import type {
  DistractorMistakeType,
} from '../../domain/distractor-models'
import {
  chooseUniqueRatioDistractors,
  createRatioDistractor,
  type RatioDistractorCandidate,
} from '../../domain/ratios/ratio-distractors'
import {
  formatControlledNumber,
  formatRatio,
  formatRatioRaw,
} from '../../domain/ratios/ratio-format'
import {
  calculateDirectProportion,
  calculateInverseProportion,
  compareRatios,
  greatestCommonDivisor,
  ratioIdentity,
  shareInRatio,
  simplifyRatio,
  solveProportion,
} from '../../domain/ratios/ratio-math'
import type { Ratio } from '../../domain/ratios/ratio.types'
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
  QuestionGenerator,
} from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

type ValidationKind =
  | 'simplify'
  | 'equivalent'
  | 'compare'
  | 'solve'
  | 'direct'
  | 'inverse'
  | 'share'
  | 'word'

interface ChoiceDraft {
  text: string
  identity: string
  numericValue: number
  mistakeType: DistractorMistakeType | null
  derivation: GeneratedChoice['derivation']
  qualityScore: number
}

interface ScalarCandidate extends ChoiceDraft {
  mistakeType: DistractorMistakeType
  derivation: NonNullable<GeneratedChoice['derivation']>
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

function scalarIdentity(value: number): string {
  return Number(value.toFixed(6)).toString()
}

function scalarCandidate(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  answerKind?: AnswerKind
  suffix?: string
  qualityScore?: number
}): ScalarCandidate | null {
  if (
    !Number.isFinite(input.value) ||
    input.value <= 0 ||
    scalarIdentity(input.value) === scalarIdentity(input.correct)
  ) {
    return null
  }

  const formatted = formatControlledNumber(input.value)
  const text =
    input.answerKind === 'money'
      ? `\u20b1${formatted}`
      : `${formatted}${input.suffix ?? ''}`

  return {
    text,
    identity: scalarIdentity(input.value),
    numericValue: input.value,
    mistakeType: input.mistakeType,
    derivation: {
      operation: input.operation,
      inputs: input.inputs,
    },
    qualityScore: input.qualityScore ?? 60,
  }
}

function chooseScalarDistractors(
  correct: number,
  candidates: readonly (ScalarCandidate | null)[],
): ScalarCandidate[] {
  const used = new Set([scalarIdentity(correct)])
  const selected: ScalarCandidate[] = []

  for (const candidate of candidates
    .filter((item): item is ScalarCandidate => item !== null)
    .sort((left, right) => right.qualityScore - left.qualityScore)) {
    if (used.has(candidate.identity) || selected.some((item) => item.text === candidate.text)) {
      continue
    }

    used.add(candidate.identity)
    selected.push(candidate)

    if (selected.length === 3) {
      return selected
    }
  }

  throw new Error('Fewer than three documented scalar distractors are available.')
}

function buildQuestion(input: {
  slug: GeneratorSlug
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  correct: ChoiceDraft
  distractors: readonly ChoiceDraft[]
  explanationSteps: string[]
  canonicalSignature: string
  validationKind: ValidationKind
  parameters: Record<string, unknown>
  answerKind: AnswerKind
  unit?: string | null
}): GeneratedQuestion {
  const random = randomFor(input)
  const choices = random.shuffle([input.correct, ...input.distractors])

  if (
    choices.length !== 4 ||
    new Set(choices.map((choice) => choice.text)).size !== 4 ||
    new Set(choices.map((choice) => choice.identity)).size !== 4
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
      correctIdentity: input.correct.identity,
      choiceIdentities: choices.map((choice) => choice.identity),
    },
    choices: choices.map((choice) => ({
      text: choice.text,
      isCorrect: choice.identity === input.correct.identity,
      distractorType: choice.mistakeType,
      mistakeType: choice.mistakeType,
      derivation: choice.derivation,
      qualityScore: choice.qualityScore,
      numericValue: choice.numericValue,
    })),
    explanation: {
      title: 'Solution',
      steps: input.explanationSteps,
      finalAnswer: input.correct.text,
    },
    metadata: {
      answerKind: input.answerKind,
      unit: input.unit ?? null,
      canonicalSignature: input.canonicalSignature,
    },
  }
}

function requiredNumber(
  parameters: Record<string, unknown>,
  key: string,
): number {
  const value = parameters[key]

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid numeric generator parameter ${key}.`)
  }

  return value
}

function recomputeCorrectIdentity(question: GeneratedQuestion): string {
  const kind = question.parameters.validationKind

  if (kind === 'simplify') {
    return ratioIdentity({
      left: requiredNumber(question.parameters, 'originalLeft'),
      right: requiredNumber(question.parameters, 'originalRight'),
    })
  }

  if (kind === 'equivalent') {
    const left = requiredNumber(question.parameters, 'left')
    const right = requiredNumber(question.parameters, 'right')
    const scaledLeft = requiredNumber(question.parameters, 'scaledLeft')

    return scalarIdentity((right * scaledLeft) / left)
  }

  if (kind === 'compare') {
    const left = {
      left: requiredNumber(question.parameters, 'firstLeft'),
      right: requiredNumber(question.parameters, 'firstRight'),
    }
    const right = {
      left: requiredNumber(question.parameters, 'secondLeft'),
      right: requiredNumber(question.parameters, 'secondRight'),
    }

    return ratioIdentity(compareRatios(left, right) > 0 ? left : right)
  }

  if (kind === 'solve') {
    return scalarIdentity(
      solveProportion(
        requiredNumber(question.parameters, 'firstNumerator'),
        requiredNumber(question.parameters, 'firstDenominator'),
        requiredNumber(question.parameters, 'secondNumerator'),
      ),
    )
  }

  if (kind === 'direct') {
    return scalarIdentity(
      calculateDirectProportion(
        requiredNumber(question.parameters, 'firstInput'),
        requiredNumber(question.parameters, 'firstOutput'),
        requiredNumber(question.parameters, 'secondInput'),
      ),
    )
  }

  if (kind === 'inverse') {
    return scalarIdentity(
      calculateInverseProportion(
        requiredNumber(question.parameters, 'firstInput'),
        requiredNumber(question.parameters, 'firstOutput'),
        requiredNumber(question.parameters, 'secondInput'),
      ),
    )
  }

  if (kind === 'share') {
    const shares = shareInRatio(
      requiredNumber(question.parameters, 'total'),
      {
        left: requiredNumber(question.parameters, 'ratioLeft'),
        right: requiredNumber(question.parameters, 'ratioRight'),
      },
    )

    return scalarIdentity(Math.max(shares.left, shares.right))
  }

  if (kind === 'word') {
    const firstCount = requiredNumber(question.parameters, 'firstCount')
    const ratioLeft = requiredNumber(question.parameters, 'ratioLeft')
    const ratioRight = requiredNumber(question.parameters, 'ratioRight')

    return scalarIdentity((firstCount * ratioRight) / ratioLeft)
  }

  throw new Error('Unsupported ratio generator validation kind.')
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    if (
      question.generatorVersion !== version ||
      !supportedDifficulties.includes(question.difficulty) ||
      question.choices.length !== 4
    ) {
      return { valid: false, reason: 'Generator metadata is invalid.' }
    }

    const correctChoices = question.choices.filter((choice) => choice.isCorrect)
    const choiceIdentities = question.parameters.choiceIdentities
    const recomputed = recomputeCorrectIdentity(question)

    if (
      correctChoices.length !== 1 ||
      !Array.isArray(choiceIdentities) ||
      choiceIdentities.some((identity) => typeof identity !== 'string') ||
      new Set(choiceIdentities).size !== 4 ||
      new Set(question.choices.map((choice) => choice.text)).size !== 4 ||
      question.parameters.correctIdentity !== recomputed ||
      correctChoices[0]?.text !== question.explanation.finalAnswer
    ) {
      return { valid: false, reason: 'Answer or choice validation failed.' }
    }

    for (const choice of question.choices) {
      if (
        !Number.isFinite(choice.numericValue) ||
        (!choice.isCorrect &&
          (choice.mistakeType === null ||
            choice.derivation === null ||
            choice.qualityScore < 35))
      ) {
        return { valid: false, reason: 'Distractor validation failed.' }
      }
    }

    return { valid: true, reason: null }
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : 'Validation failed.',
    }
  }
}

function ratioChoice(
  ratio: Ratio,
  mistakeType: DistractorMistakeType | null = null,
  derivation: GeneratedChoice['derivation'] = null,
  qualityScore = 100,
): ChoiceDraft {
  const simplified = simplifyRatio(ratio)

  return {
    text: formatRatio(simplified),
    identity: ratioIdentity(simplified),
    numericValue: simplified.left / simplified.right,
    mistakeType,
    derivation,
    qualityScore,
  }
}

function ratioCandidate(input: {
  ratio: Ratio
  correct: Ratio
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore?: number
}): RatioDistractorCandidate | null {
  return createRatioDistractor(input)
}

function ratioCandidateChoice(candidate: RatioDistractorCandidate): ChoiceDraft {
  return ratioChoice(
    candidate.ratio,
    candidate.mistakeType,
    candidate.derivation,
    candidate.qualityScore,
  )
}

export const simplifyingRatiosGenerator: QuestionGenerator = {
  slug: 'simplifying-ratios',
  version,
  title: 'Simplifying Ratios',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: this.slug })
    const left = random.integer(2, input.difficulty === 'hard' ? 12 : 9)
    let right = random.integer(2, input.difficulty === 'hard' ? 14 : 10)

    while (left === right || greatestCommonDivisor(left, right) !== 1) {
      right = random.integer(2, input.difficulty === 'hard' ? 14 : 10)
    }

    const factor = random.integer(2, input.difficulty === 'easy' ? 5 : 9)
    const original = { left: left * factor, right: right * factor }
    const correct = { left, right }
    const candidates = chooseUniqueRatioDistractors({
      correct,
      candidates: [
        ratioCandidate({
          ratio: { left, right: original.right },
          correct,
          mistakeType: 'simplified_one_ratio_term_only',
          operation: 'divide the left term only',
          inputs: [original.left, original.right, factor],
          qualityScore: 78,
        }),
        ratioCandidate({
          ratio: { left: original.left, right },
          correct,
          mistakeType: 'simplified_one_ratio_term_only',
          operation: 'divide the right term only',
          inputs: [original.left, original.right, factor],
          qualityScore: 77,
        }),
        ratioCandidate({
          ratio: { left: right, right: left },
          correct,
          mistakeType: 'reversed_ratio',
          operation: 'reverse ratio terms',
          inputs: [left, right],
          qualityScore: 75,
        }),
        ratioCandidate({
          ratio: {
            left: Math.max(1, original.left - factor),
            right: Math.max(1, original.right - factor),
          },
          correct,
          mistakeType: 'subtracted_common_factor',
          operation: 'subtract the common factor',
          inputs: [original.left, original.right, factor],
          qualityScore: 70,
        }),
      ],
    })

    return buildQuestion({
      slug: this.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `Simplify ${formatRatioRaw(original)}.`,
      correct: ratioChoice(correct),
      distractors: candidates.map(ratioCandidateChoice),
      explanationSteps: [
        `The greatest common divisor of ${original.left} and ${original.right} is ${factor}.`,
        `Divide both terms by ${factor}.`,
        `${original.left} \u00f7 ${factor} = ${left} and ${original.right} \u00f7 ${factor} = ${right}.`,
      ],
      canonicalSignature: `${this.slug}|${original.left}:${original.right}`,
      validationKind: 'simplify',
      parameters: {
        originalLeft: original.left,
        originalRight: original.right,
      },
      answerKind: 'ratio',
    })
  },
  validate: validateQuestion,
}

export const equivalentRatiosGenerator: QuestionGenerator = {
  slug: 'equivalent-ratios',
  version,
  title: 'Equivalent Ratios',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: this.slug })
    const left = random.integer(2, 8)
    const right = random.integer(left + 1, 12)
    const factor = random.integer(2, input.difficulty === 'easy' ? 4 : 9)
    const scaledLeft = left * factor
    const correct = right * factor
    const candidates = chooseScalarDistractors(correct, [
      scalarCandidate({
        value: right + factor,
        correct,
        mistakeType: 'added_scale_factor',
        operation: 'add scale factor',
        inputs: [right, factor],
      }),
      scalarCandidate({
        value: right,
        correct,
        mistakeType: 'multiplied_one_ratio_term_only',
        operation: 'leave second term unchanged',
        inputs: [right, factor],
      }),
      scalarCandidate({
        value: left * factor,
        correct,
        mistakeType: 'reversed_ratio',
        operation: 'copy scaled first term',
        inputs: [left, factor],
      }),
      scalarCandidate({
        value: Math.abs(right - left) * factor,
        correct,
        mistakeType: 'used_ratio_difference',
        operation: 'scale ratio difference',
        inputs: [left, right, factor],
      }),
      scalarCandidate({
        value: scaledLeft + right,
        correct,
        mistakeType: 'added_across_proportion',
        operation: 'add across the equivalent ratio',
        inputs: [scaledLeft, right],
      }),
      scalarCandidate({
        value: (scaledLeft * left) / right,
        correct,
        mistakeType: 'used_wrong_cross_products',
        operation: 'cross multiply in the reversed order',
        inputs: [left, right, scaledLeft],
      }),
      scalarCandidate({
        value: scaledLeft + factor,
        correct,
        mistakeType: 'added_scale_factor',
        operation: 'add the scale factor to the scaled first term',
        inputs: [scaledLeft, factor],
      }),
    ])

    return buildQuestion({
      slug: this.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `${left}:${right} = ${scaledLeft}:?`,
      correct: {
        text: String(correct),
        identity: scalarIdentity(correct),
        numericValue: correct,
        mistakeType: null,
        derivation: null,
        qualityScore: 100,
      },
      distractors: candidates,
      explanationSteps: [
        `${left} was multiplied by ${factor} to get ${scaledLeft}.`,
        `Multiply ${right} by the same factor: ${right} \u00d7 ${factor} = ${correct}.`,
      ],
      canonicalSignature: `${this.slug}|${left}:${right}|${factor}`,
      validationKind: 'equivalent',
      parameters: { left, right, scaledLeft },
      answerKind: 'number',
    })
  },
  validate: validateQuestion,
}

export const comparingRatiosGenerator: QuestionGenerator = {
  slug: 'comparing-ratios',
  version,
  title: 'Comparing Ratios',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: this.slug })
    let first = {
      left: random.integer(2, 9),
      right: random.integer(3, 12),
    }
    let second = {
      left: random.integer(2, 9),
      right: random.integer(3, 12),
    }

    while (
      first.left === first.right ||
      second.left === second.right ||
      compareRatios(first, second) === 0 ||
      ratioIdentity(first) === ratioIdentity(second)
    ) {
      first = { left: random.integer(2, 9), right: random.integer(3, 12) }
      second = { left: random.integer(2, 9), right: random.integer(3, 12) }
    }

    const correct = compareRatios(first, second) > 0 ? first : second
    const incorrect = compareRatios(first, second) > 0 ? second : first
    const candidates = chooseUniqueRatioDistractors({
      correct,
      candidates: [
        ratioCandidate({
          ratio: incorrect,
          correct,
          mistakeType: 'compared_ratio_terms_only',
          operation: 'choose the other displayed ratio',
          inputs: [first.left, first.right, second.left, second.right],
          qualityScore: 80,
        }),
        ratioCandidate({
          ratio: { left: first.right, right: first.left },
          correct,
          mistakeType: 'reversed_ratio',
          operation: 'reverse first ratio',
          inputs: [first.left, first.right],
          qualityScore: 70,
        }),
        ratioCandidate({
          ratio: { left: second.right, right: second.left },
          correct,
          mistakeType: 'reversed_ratio',
          operation: 'reverse second ratio',
          inputs: [second.left, second.right],
          qualityScore: 69,
        }),
        ratioCandidate({
          ratio: {
            left: first.left + second.left,
            right: first.right + second.right,
          },
          correct,
          mistakeType: 'chose_larger_group_total',
          operation: 'combine group terms',
          inputs: [first.left, first.right, second.left, second.right],
          qualityScore: 55,
        }),
        ratioCandidate({
          ratio: {
            left: first.left + second.left,
            right: first.right,
          },
          correct,
          mistakeType: 'compared_ratio_terms_only',
          operation: 'combine first terms but keep first denominator',
          inputs: [first.left, first.right, second.left],
          qualityScore: 52,
        }),
        ratioCandidate({
          ratio: {
            left: second.left,
            right: first.right + second.right,
          },
          correct,
          mistakeType: 'compared_ratio_terms_only',
          operation: 'combine second terms but keep second numerator',
          inputs: [first.right, second.left, second.right],
          qualityScore: 51,
        }),
        ratioCandidate({
          ratio: {
            left: Math.abs(first.left - second.left) + 1,
            right: Math.abs(first.right - second.right) + 1,
          },
          correct,
          mistakeType: 'used_ratio_difference',
          operation: 'compare differences instead of ratios',
          inputs: [first.left, first.right, second.left, second.right],
          qualityScore: 50,
        }),
      ],
    })

    return buildQuestion({
      slug: this.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `Which ratio is greater: ${formatRatioRaw(first)} or ${formatRatioRaw(second)}?`,
      correct: ratioChoice(correct),
      distractors: candidates.map(ratioCandidateChoice),
      explanationSteps: [
        `Cross products are ${first.left} \u00d7 ${second.right} = ${first.left * second.right} and ${second.left} \u00d7 ${first.right} = ${second.left * first.right}.`,
        `${formatRatio(correct)} has the larger value.`,
      ],
      canonicalSignature: `${this.slug}|${formatRatioRaw(first)}|${formatRatioRaw(second)}`,
      validationKind: 'compare',
      parameters: {
        firstLeft: first.left,
        firstRight: first.right,
        secondLeft: second.left,
        secondRight: second.right,
      },
      answerKind: 'ratio',
    })
  },
  validate: validateQuestion,
}

export const solvingProportionsGenerator: QuestionGenerator = {
  slug: 'solving-proportions',
  version,
  title: 'Solving Proportions',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: this.slug })
    const firstNumerator = random.integer(2, 9)
    const firstDenominator = random.integer(3, 12)
    const factor = random.integer(2, input.difficulty === 'easy' ? 5 : 10)
    const secondNumerator = firstNumerator * factor
    const correct = solveProportion(
      firstNumerator,
      firstDenominator,
      secondNumerator,
    )
    const candidates = chooseScalarDistractors(correct, [
      scalarCandidate({
        value: (firstNumerator * secondNumerator) / firstDenominator,
        correct,
        mistakeType: 'used_wrong_cross_products',
        operation: 'cross multiply wrong terms',
        inputs: [firstNumerator, firstDenominator, secondNumerator],
      }),
      scalarCandidate({
        value: (firstNumerator * firstDenominator) / secondNumerator,
        correct,
        mistakeType: 'divided_by_wrong_coefficient',
        operation: 'divide by second numerator',
        inputs: [firstNumerator, firstDenominator, secondNumerator],
      }),
      scalarCandidate({
        value: firstNumerator + firstDenominator + secondNumerator,
        correct,
        mistakeType: 'added_across_proportion',
        operation: 'add known terms',
        inputs: [firstNumerator, firstDenominator, secondNumerator],
      }),
      scalarCandidate({
        value: secondNumerator / factor,
        correct,
        mistakeType: 'reversed_ratio',
        operation: 'reverse scale application',
        inputs: [secondNumerator, factor],
      }),
      scalarCandidate({
        value: firstDenominator * secondNumerator,
        correct,
        mistakeType: 'divided_by_wrong_coefficient',
        operation: 'stop after forming the cross product',
        inputs: [firstDenominator, secondNumerator],
      }),
      scalarCandidate({
        value: secondNumerator + firstDenominator,
        correct,
        mistakeType: 'added_across_proportion',
        operation: 'add denominator to scaled numerator',
        inputs: [secondNumerator, firstDenominator],
      }),
      scalarCandidate({
        value: firstDenominator / factor,
        correct,
        mistakeType: 'reversed_ratio',
        operation: 'divide by scale factor instead of multiply',
        inputs: [firstDenominator, factor],
      }),
    ])

    return buildQuestion({
      slug: this.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `Solve ${firstNumerator}/${firstDenominator} = ${secondNumerator}/x.`,
      correct: {
        text: formatControlledNumber(correct),
        identity: scalarIdentity(correct),
        numericValue: correct,
        mistakeType: null,
        derivation: null,
        qualityScore: 100,
      },
      distractors: candidates,
      explanationSteps: [
        `Cross multiply: ${firstNumerator}x = ${firstDenominator} \u00d7 ${secondNumerator}.`,
        `Divide by ${firstNumerator}: x = ${formatControlledNumber(correct)}.`,
      ],
      canonicalSignature: `${this.slug}|${firstNumerator}|${firstDenominator}|${secondNumerator}`,
      validationKind: 'solve',
      parameters: {
        firstNumerator,
        firstDenominator,
        secondNumerator,
      },
      answerKind: 'number',
    })
  },
  validate: validateQuestion,
}

function proportionalQuestion(input: {
  slug: 'direct-proportion' | 'inverse-proportion'
  seed: string
  difficulty: GeneratorDifficulty
}): GeneratedQuestion {
  const random = randomFor(input)
  const firstInput = random.integer(2, 8)
  const factor = random.integer(2, input.difficulty === 'easy' ? 4 : 7)

  if (input.slug === 'direct-proportion') {
    const unitPrice = random.integer(15, 60) * 5
    const firstOutput = firstInput * unitPrice
    const secondInput = firstInput * factor
    const correct = calculateDirectProportion(
      firstInput,
      firstOutput,
      secondInput,
    )
    const candidates = chooseScalarDistractors(correct, [
      scalarCandidate({
        value: calculateInverseProportion(firstInput, firstOutput, secondInput),
        correct,
        mistakeType: 'used_inverse_relationship',
        operation: 'apply inverse proportion',
        inputs: [firstInput, firstOutput, secondInput],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: firstOutput + (secondInput - firstInput),
        correct,
        mistakeType: 'used_wrong_scale_factor',
        operation: 'add quantity difference',
        inputs: [firstInput, firstOutput, secondInput],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: firstOutput * firstInput / secondInput,
        correct,
        mistakeType: 'used_wrong_unit_rate',
        operation: 'divide in wrong direction',
        inputs: [firstInput, firstOutput, secondInput],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: unitPrice,
        correct,
        mistakeType: 'used_wrong_unit_rate',
        operation: 'return unit price only',
        inputs: [firstOutput, firstInput],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: firstOutput + secondInput,
        correct,
        mistakeType: 'used_wrong_scale_factor',
        operation: 'add target quantity to known cost',
        inputs: [firstOutput, secondInput],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: firstOutput * secondInput,
        correct,
        mistakeType: 'used_wrong_unit_rate',
        operation: 'multiply without finding unit price',
        inputs: [firstOutput, secondInput],
        answerKind: 'money',
      }),
    ])

    return buildQuestion({
      slug: input.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `If ${firstInput} notebooks cost \u20b1${firstOutput}, how much do ${secondInput} notebooks cost at the same price per notebook?`,
      correct: {
        text: `\u20b1${formatControlledNumber(correct)}`,
        identity: scalarIdentity(correct),
        numericValue: correct,
        mistakeType: null,
        derivation: null,
        qualityScore: 100,
      },
      distractors: candidates,
      explanationSteps: [
        `The unit price is \u20b1${firstOutput} \u00f7 ${firstInput} = \u20b1${unitPrice}.`,
        `${secondInput} \u00d7 \u20b1${unitPrice} = \u20b1${formatControlledNumber(correct)}.`,
      ],
      canonicalSignature: `${input.slug}|${firstInput}|${firstOutput}|${secondInput}`,
      validationKind: 'direct',
      parameters: { firstInput, firstOutput, secondInput },
      answerKind: 'money',
      unit: 'PHP',
    })
  }

  const firstOutput = factor * random.integer(2, 7)
  const secondInput = firstInput * factor
  const correct = calculateInverseProportion(
    firstInput,
    firstOutput,
    secondInput,
  )
  const candidates = chooseScalarDistractors(correct, [
    scalarCandidate({
      value: calculateDirectProportion(firstInput, firstOutput, secondInput),
      correct,
      mistakeType: 'used_direct_relationship',
      operation: 'apply direct proportion',
      inputs: [firstInput, firstOutput, secondInput],
      suffix: ' days',
    }),
    scalarCandidate({
      value: firstOutput,
      correct,
      mistakeType: 'used_wrong_constant_product',
      operation: 'keep time unchanged',
      inputs: [firstOutput],
      suffix: ' days',
    }),
    scalarCandidate({
      value: (firstInput * secondInput) / firstOutput,
      correct,
      mistakeType: 'used_wrong_constant_product',
      operation: 'divide wrong product',
      inputs: [firstInput, firstOutput, secondInput],
      suffix: ' days',
    }),
    scalarCandidate({
      value: firstOutput - factor,
      correct,
      mistakeType: 'used_wrong_scale_factor',
      operation: 'subtract scale factor',
      inputs: [firstOutput, factor],
      suffix: ' days',
    }),
    scalarCandidate({
      value: firstOutput + factor,
      correct,
      mistakeType: 'used_wrong_scale_factor',
      operation: 'add the worker scale factor to time',
      inputs: [firstOutput, factor],
      suffix: ' days',
    }),
    scalarCandidate({
      value: firstInput * firstOutput,
      correct,
      mistakeType: 'used_wrong_constant_product',
      operation: 'return the constant product without dividing',
      inputs: [firstInput, firstOutput],
      suffix: ' days',
    }),
    scalarCandidate({
      value: secondInput,
      correct,
      mistakeType: 'used_direct_relationship',
      operation: 'use the new worker count as time',
      inputs: [secondInput],
      suffix: ' days',
    }),
  ])

  return buildQuestion({
    slug: input.slug,
    difficulty: input.difficulty,
    seed: input.seed,
    prompt: `If ${firstInput} workers finish a task in ${firstOutput} days, how many days would ${secondInput} equally productive workers need?`,
    correct: {
      text: `${formatControlledNumber(correct)} days`,
      identity: scalarIdentity(correct),
      numericValue: correct,
      mistakeType: null,
      derivation: null,
      qualityScore: 100,
    },
    distractors: candidates,
    explanationSteps: [
      `Work is fixed, so workers and days are inversely proportional.`,
      `${firstInput} \u00d7 ${firstOutput} = ${secondInput} \u00d7 d.`,
      `d = ${formatControlledNumber(correct)} days.`,
    ],
    canonicalSignature: `${input.slug}|${firstInput}|${firstOutput}|${secondInput}`,
    validationKind: 'inverse',
    parameters: { firstInput, firstOutput, secondInput },
    answerKind: 'count',
    unit: 'days',
  })
}

export const directProportionGenerator: QuestionGenerator = {
  slug: 'direct-proportion',
  version,
  title: 'Direct Proportion',
  supportedDifficulties,
  generate(input) {
    return proportionalQuestion({ ...input, slug: 'direct-proportion' })
  },
  validate: validateQuestion,
}

export const inverseProportionGenerator: QuestionGenerator = {
  slug: 'inverse-proportion',
  version,
  title: 'Inverse Proportion',
  supportedDifficulties,
  generate(input) {
    return proportionalQuestion({ ...input, slug: 'inverse-proportion' })
  },
  validate: validateQuestion,
}

export const ratioSharingGenerator: QuestionGenerator = {
  slug: 'ratio-sharing',
  version,
  title: 'Sharing an Amount in a Ratio',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: this.slug })
    const ratioLeft = random.integer(1, 5)
    const ratioRight = random.integer(ratioLeft + 1, 8)
    const perPart = random.integer(4, input.difficulty === 'easy' ? 20 : 60) * 100
    const total = (ratioLeft + ratioRight) * perPart
    const shares = shareInRatio(total, {
      left: ratioLeft,
      right: ratioRight,
    })
    const correct = shares.right
    const candidates = chooseScalarDistractors(correct, [
      scalarCandidate({
        value: total / ratioRight,
        correct,
        mistakeType: 'divided_by_one_ratio_term',
        operation: 'divide total by larger ratio term',
        inputs: [total, ratioRight],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: total / (ratioLeft + ratioRight),
        correct,
        mistakeType: 'forgot_total_ratio_parts',
        operation: 'return one part only',
        inputs: [total, ratioLeft, ratioRight],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: shares.left,
        correct,
        mistakeType: 'reversed_ratio_shares',
        operation: 'use smaller share',
        inputs: [shares.left, shares.right],
        answerKind: 'money',
      }),
      scalarCandidate({
        value: total * ratioRight / 100,
        correct,
        mistakeType: 'treated_ratio_as_percentage',
        operation: 'treat ratio term as percent',
        inputs: [total, ratioRight],
        answerKind: 'money',
      }),
    ])

    return buildQuestion({
      slug: this.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `Divide \u20b1${total} in the ratio ${ratioLeft}:${ratioRight}. What is the larger share?`,
      correct: {
        text: `\u20b1${formatControlledNumber(correct)}`,
        identity: scalarIdentity(correct),
        numericValue: correct,
        mistakeType: null,
        derivation: null,
        qualityScore: 100,
      },
      distractors: candidates,
      explanationSteps: [
        `Total parts: ${ratioLeft} + ${ratioRight} = ${ratioLeft + ratioRight}.`,
        `One part is \u20b1${total} \u00f7 ${ratioLeft + ratioRight} = \u20b1${perPart}.`,
        `The larger share is ${ratioRight} \u00d7 \u20b1${perPart} = \u20b1${correct}.`,
      ],
      canonicalSignature: `${this.slug}|${total}|${ratioLeft}:${ratioRight}`,
      validationKind: 'share',
      parameters: { total, ratioLeft, ratioRight },
      answerKind: 'money',
      unit: 'PHP',
    })
  },
  validate: validateQuestion,
}

export const ratioWordProblemsGenerator: QuestionGenerator = {
  slug: 'ratio-word-problems',
  version,
  title: 'Ratio and Proportion Word Problems',
  supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: this.slug })
    const ratioLeft = random.integer(2, 5)
    const ratioRight = random.integer(ratioLeft + 1, 9)
    const factor = random.integer(3, input.difficulty === 'easy' ? 6 : 12)
    const firstCount = ratioLeft * factor
    const correct = ratioRight * factor
    const candidates = chooseScalarDistractors(correct, [
      scalarCandidate({
        value: firstCount,
        correct,
        mistakeType: 'multiplied_one_ratio_term_only',
        operation: 'reuse known group count',
        inputs: [firstCount],
      }),
      scalarCandidate({
        value: ratioRight + factor,
        correct,
        mistakeType: 'added_scale_factor',
        operation: 'add scale factor',
        inputs: [ratioRight, factor],
      }),
      scalarCandidate({
        value: firstCount * ratioLeft / ratioRight,
        correct,
        mistakeType: 'reversed_ratio',
        operation: 'reverse proportional scale',
        inputs: [firstCount, ratioLeft, ratioRight],
      }),
      scalarCandidate({
        value: firstCount + ratioRight,
        correct,
        mistakeType: 'used_ratio_difference',
        operation: 'add ratio term to known count',
        inputs: [firstCount, ratioRight],
      }),
      scalarCandidate({
        value: firstCount + factor,
        correct,
        mistakeType: 'added_scale_factor',
        operation: 'add one scale factor to known count',
        inputs: [firstCount, factor],
      }),
      scalarCandidate({
        value: ratioRight * firstCount,
        correct,
        mistakeType: 'used_wrong_scale_factor',
        operation: 'multiply by target ratio term without finding one part',
        inputs: [ratioRight, firstCount],
      }),
      scalarCandidate({
        value: factor,
        correct,
        mistakeType: 'used_wrong_unit_rate',
        operation: 'return the value of one ratio part',
        inputs: [firstCount, ratioLeft],
      }),
    ])

    return buildQuestion({
      slug: this.slug,
      difficulty: input.difficulty,
      seed: input.seed,
      prompt: `The ratio of male to female employees is ${ratioLeft}:${ratioRight}. If there are ${firstCount} male employees, how many female employees are there?`,
      correct: {
        text: String(correct),
        identity: scalarIdentity(correct),
        numericValue: correct,
        mistakeType: null,
        derivation: null,
        qualityScore: 100,
      },
      distractors: candidates,
      explanationSteps: [
        `${ratioLeft} ratio parts represent ${firstCount} employees, so one part is ${factor}.`,
        `${ratioRight} parts represent ${ratioRight} \u00d7 ${factor} = ${correct} female employees.`,
      ],
      canonicalSignature: `${this.slug}|${ratioLeft}:${ratioRight}|${firstCount}`,
      validationKind: 'word',
      parameters: { firstCount, ratioLeft, ratioRight },
      answerKind: 'count',
    })
  },
  validate: validateQuestion,
}

export const ratioGenerators = [
  simplifyingRatiosGenerator,
  equivalentRatiosGenerator,
  comparingRatiosGenerator,
  solvingProportionsGenerator,
  directProportionGenerator,
  inverseProportionGenerator,
  ratioSharingGenerator,
  ratioWordProblemsGenerator,
] as const satisfies readonly QuestionGenerator[]
