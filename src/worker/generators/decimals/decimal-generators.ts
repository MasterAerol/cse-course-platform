import type {
  DistractorMistakeType,
} from '../../domain/distractor-models'
import {
  numericIdentity,
  roundTo,
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
  GeneratorValidationResult,
  QuestionGenerator,
} from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const
const peso = '\u20b1'

type DecimalSlug =
  | 'comparing-decimals'
  | 'rounding-decimals'
  | 'adding-decimals'
  | 'subtracting-decimals'
  | 'multiplying-decimals'
  | 'dividing-decimals'
  | 'decimal-conversions'

interface DecimalQuestionParameters extends Record<string, unknown> {
  operation: string
  correctValue: number
  answerKind: AnswerKind
  decimalPlaces: number
  choiceIdentities: string[]
}

interface DecimalChoiceDraft {
  value: number
  text: string
  isCorrect: boolean
  mistakeType: DistractorMistakeType | null
  derivation: GeneratedChoice['derivation']
  qualityScore: number
}

interface DecimalDistractor {
  value: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore?: number
}

function randomFor(input: {
  seed: string
  slug: DecimalSlug
  difficulty: GeneratorDifficulty
}): SeededRandom {
  return createSeededRandom(
    `${input.seed}|${input.slug}|${version}|${input.difficulty}`,
  )
}

function decimalPlacesForDifficulty(
  difficulty: GeneratorDifficulty,
): 1 | 2 | 3 {
  if (difficulty === 'easy') {
    return 1
  }

  return difficulty === 'medium' ? 2 : 3
}

function pow10(places: number): number {
  return 10 ** places
}

function makeDecimal(
  random: SeededRandom,
  difficulty: GeneratorDifficulty,
  options: { minWhole?: number; maxWhole?: number; places?: number } = {},
): number {
  const places = options.places ?? decimalPlacesForDifficulty(difficulty)
  const scale = pow10(places)
  const minWhole = options.minWhole ?? (difficulty === 'easy' ? 1 : 2)
  const maxWhole = options.maxWhole ?? (difficulty === 'hard' ? 90 : 40)
  const min = minWhole * scale
  const max = maxWhole * scale

  return roundTo(random.integer(min, max) / scale, places)
}

function formatDecimal(value: number, places = 3): string {
  const rounded = roundTo(value, places)

  return rounded
    .toFixed(places)
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, '')
}

function formatMoney(value: number): string {
  return `${peso}${roundTo(value, 2).toFixed(2)}`
}

function formatChoice(
  value: number,
  kind: AnswerKind,
  places: number,
): string {
  if (kind === 'money') {
    return formatMoney(value)
  }

  if (kind === 'percent') {
    return `${formatDecimal(value, 2)}%`
  }

  return formatDecimal(value, places)
}

function normalized(value: number): number {
  return roundTo(value, 4)
}

function choiceIdentity(value: number, kind: AnswerKind): string {
  return `${kind}:${numericIdentity(value)}`
}

function uniqueDistractors(
  correct: number,
  kind: AnswerKind,
  places: number,
  candidates: readonly DecimalDistractor[],
  fallbackSeed: number,
): DecimalDistractor[] {
  const seen = new Set([choiceIdentity(correct, kind)])
  const seenText = new Set([formatChoice(correct, kind, places)])
  const selected: DecimalDistractor[] = []

  for (const candidate of candidates) {
    const value = normalized(candidate.value)
    const identity = choiceIdentity(value, kind)
    const text = formatChoice(value, kind, places)

    if (
      Number.isFinite(value) &&
      value >= 0 &&
      !seen.has(identity) &&
      !seenText.has(text)
    ) {
      selected.push({ ...candidate, value })
      seen.add(identity)
      seenText.add(text)
    }

    if (selected.length === 3) {
      return selected
    }
  }

  const fallbackValues = [
    correct + fallbackSeed,
    Math.max(0, correct - fallbackSeed),
    correct + fallbackSeed / 10,
    Math.max(0, correct - fallbackSeed / 10),
    correct + 1,
    Math.max(0, correct - 1),
  ]

  for (const value of fallbackValues) {
    const rounded = normalized(value)
    const identity = choiceIdentity(rounded, kind)
    const text = formatChoice(rounded, kind, places)

    if (!seen.has(identity) && !seenText.has(text)) {
      selected.push({
        value: rounded,
        mistakeType: 'decimal_place_shift',
        operation: 'nearby controlled decimal fallback',
        inputs: [correct, fallbackSeed],
        qualityScore: 40,
      })
      seen.add(identity)
      seenText.add(text)
    }

    if (selected.length === 3) {
      return selected
    }
  }

  throw new Error('Unable to create three unique decimal distractors.')
}

function buildDecimalQuestion(input: {
  slug: DecimalSlug
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  correctValue: number
  answerKind?: AnswerKind
  decimalPlaces?: number
  candidates: readonly DecimalDistractor[]
  explanationSteps: string[]
  canonicalSignature: string
  parameters: Record<string, unknown>
}): GeneratedQuestion {
  const kind = input.answerKind ?? 'number'
  const places = input.decimalPlaces ?? 3
  const correct = normalized(input.correctValue)
  const random = randomFor({
    seed: input.seed,
    slug: input.slug,
    difficulty: input.difficulty,
  })
  const distractors = uniqueDistractors(
    correct,
    kind,
    places,
    input.candidates,
    10 ** -Math.min(places, 3),
  )
  const drafts: DecimalChoiceDraft[] = [
    {
      value: correct,
      text: formatChoice(correct, kind, places),
      isCorrect: true,
      mistakeType: null,
      derivation: null,
      qualityScore: 100,
    },
    ...distractors.map((candidate) => ({
      value: candidate.value,
      text: formatChoice(candidate.value, kind, places),
      isCorrect: false,
      mistakeType: candidate.mistakeType,
      derivation: {
        operation: candidate.operation,
        inputs: candidate.inputs,
      },
      qualityScore: candidate.qualityScore ?? 75,
    })),
  ]
  const shuffled = random.shuffle(drafts)
  const finalAnswer = formatChoice(correct, kind, places)

  return {
    generatorSlug: input.slug,
    generatorVersion: version,
    difficulty: input.difficulty,
    seed: input.seed,
    prompt: input.prompt,
    parameters: {
      ...input.parameters,
      correctValue: correct,
      answerKind: kind,
      decimalPlaces: places,
      choiceIdentities: shuffled.map((choice) =>
        choiceIdentity(choice.value, kind),
      ),
    },
    choices: shuffled.map((choice) => ({
      text: choice.text,
      isCorrect: choice.isCorrect,
      distractorType: choice.mistakeType,
      mistakeType: choice.mistakeType,
      derivation: choice.derivation,
      qualityScore: choice.qualityScore,
      numericValue: choice.value,
    })),
    explanation: {
      title: 'Solution',
      steps: input.explanationSteps,
      finalAnswer,
    },
    metadata: {
      answerKind: kind,
      unit: kind === 'money' ? peso : null,
      canonicalSignature: input.canonicalSignature,
    },
  }
}

function validateDecimalQuestion(
  question: GeneratedQuestion,
  expectedSlug: DecimalSlug,
  recompute: (parameters: DecimalQuestionParameters) => number,
): GeneratorValidationResult {
  if (question.generatorSlug !== expectedSlug) {
    return { valid: false, reason: 'Generator slug mismatch.' }
  }

  if (question.generatorVersion !== version) {
    return { valid: false, reason: 'Generator version mismatch.' }
  }

  if (!supportedDifficulties.includes(question.difficulty)) {
    return { valid: false, reason: 'Unsupported difficulty.' }
  }

  const parameters = question.parameters as DecimalQuestionParameters
  const expectedAnswer = normalized(recompute(parameters))

  if (!Number.isFinite(expectedAnswer)) {
    return { valid: false, reason: 'Expected answer is not finite.' }
  }

  if (normalized(parameters.correctValue) !== expectedAnswer) {
    return { valid: false, reason: 'Correct value does not match recomputed answer.' }
  }

  if (question.choices.length !== 4) {
    return { valid: false, reason: 'Question does not have four choices.' }
  }

  const correctChoices = question.choices.filter((choice) => choice.isCorrect)

  if (correctChoices.length !== 1) {
    return { valid: false, reason: 'Question must have exactly one correct choice.' }
  }

  if (new Set(question.choices.map((choice) => choice.text)).size !== 4) {
    return { valid: false, reason: 'Choice text is duplicated.' }
  }

  if (
    !Array.isArray(parameters.choiceIdentities) ||
    new Set(parameters.choiceIdentities).size !== 4
  ) {
    return { valid: false, reason: 'Choice numeric value is duplicated.' }
  }

  if (normalized(correctChoices[0]?.numericValue ?? Number.NaN) !== expectedAnswer) {
    return { valid: false, reason: 'Correct choice numeric value mismatch.' }
  }

  if (correctChoices[0]?.text !== question.explanation.finalAnswer) {
    return { valid: false, reason: 'Explanation final answer mismatch.' }
  }

  for (const choice of question.choices) {
    if (!Number.isFinite(choice.numericValue)) {
      return { valid: false, reason: 'Choice numeric value is not finite.' }
    }

    if (
      !choice.isCorrect &&
      (choice.mistakeType === null ||
        choice.derivation === null ||
        choice.qualityScore < 35)
    ) {
      return { valid: false, reason: 'Distractor is missing quality metadata.' }
    }

    if (
      question.metadata.answerKind === 'money' &&
      !/^\u20b1\d+(?:\.\d{1,2})?$/u.test(choice.text)
    ) {
      return { valid: false, reason: 'Money choice format is invalid.' }
    }
  }

  if (!question.metadata.canonicalSignature.includes(expectedSlug)) {
    return { valid: false, reason: 'Canonical signature does not include slug.' }
  }

  return { valid: true, reason: null }
}

export const comparingDecimalsGenerator: QuestionGenerator = {
  slug: 'comparing-decimals',
  version,
  title: 'Comparing Decimals',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const slug = 'comparing-decimals'
    const random = randomFor({ seed, slug, difficulty })
    const places = decimalPlacesForDifficulty(difficulty)
    let left = makeDecimal(random, difficulty, { places })
    let right = makeDecimal(random, difficulty, { places })

    while (left === right) {
      right = makeDecimal(random, difficulty, { places })
    }

    const correct = Math.max(left, right)

    return buildDecimalQuestion({
      slug,
      difficulty,
      seed,
      prompt: `Which decimal is greater: ${formatDecimal(left, places)} or ${formatDecimal(right, places)}?`,
      correctValue: correct,
      decimalPlaces: places,
      candidates: [
        {
          value: Math.min(left, right),
          mistakeType: 'reversed_inequality',
          operation: 'choose the smaller decimal',
          inputs: [left, right],
        },
        {
          value: Number(`${Math.trunc(correct)}.${String(Math.round((correct % 1) * pow10(places))).split('').reverse().join('')}`),
          mistakeType: 'ordered_by_digit_count',
          operation: 'reverse decimal digits',
          inputs: [correct],
          qualityScore: 60,
        },
        {
          value: roundTo(correct / 10, places),
          mistakeType: 'decimal_place_shift',
          operation: 'shift decimal one place left',
          inputs: [correct],
        },
      ],
      explanationSteps: [
        'Compare digits by place value from left to right.',
        `${formatDecimal(correct, places)} is greater.`,
      ],
      canonicalSignature: `${slug}|${difficulty}|${left}|${right}`,
      parameters: { operation: 'greater', left, right },
    })
  },
  validate: (question) =>
    validateDecimalQuestion(
      question,
      'comparing-decimals',
      (parameters) => Math.max(parameters.left as number, parameters.right as number),
    ),
}

export const roundingDecimalsGenerator: QuestionGenerator = {
  slug: 'rounding-decimals',
  version,
  title: 'Rounding Decimals',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const slug = 'rounding-decimals'
    const random = randomFor({ seed, slug, difficulty })
    const sourcePlaces = difficulty === 'easy' ? 2 : 3
    const targetPlaces = difficulty === 'easy' ? 1 : random.pick([1, 2] as const)
    const value = makeDecimal(random, difficulty, {
      places: sourcePlaces,
      minWhole: 1,
      maxWhole: difficulty === 'hard' ? 80 : 30,
    })
    const correct = roundTo(value, targetPlaces)

    return buildDecimalQuestion({
      slug,
      difficulty,
      seed,
      prompt: `Round ${formatDecimal(value, sourcePlaces)} to the ${targetPlaces === 1 ? 'tenths' : 'hundredths'} place.`,
      correctValue: correct,
      decimalPlaces: targetPlaces,
      candidates: [
        {
          value: Math.trunc(value * pow10(targetPlaces)) / pow10(targetPlaces),
          mistakeType: 'truncated_instead_of_rounded',
          operation: 'truncate instead of round',
          inputs: [value, targetPlaces],
        },
        {
          value: roundTo(value, targetPlaces === 1 ? 2 : 1),
          mistakeType: 'rounded_to_wrong_place',
          operation: 'round to the wrong place',
          inputs: [value, targetPlaces],
        },
        {
          value: roundTo(value * 10, targetPlaces),
          mistakeType: 'decimal_place_shift',
          operation: 'shift decimal one place right',
          inputs: [value],
          qualityScore: 55,
        },
      ],
      explanationSteps: [
        `Look at the digit immediately after the ${targetPlaces === 1 ? 'tenths' : 'hundredths'} place.`,
        `The rounded value is ${formatDecimal(correct, targetPlaces)}.`,
      ],
      canonicalSignature: `${slug}|${difficulty}|${value}|${targetPlaces}`,
      parameters: { operation: 'round', value, targetPlaces },
    })
  },
  validate: (question) =>
    validateDecimalQuestion(
      question,
      'rounding-decimals',
      (parameters) =>
        roundTo(parameters.value as number, parameters.targetPlaces as number),
    ),
}

function arithmeticGenerator(input: {
  slug: DecimalSlug
  title: string
  symbol: string
  operation: 'add' | 'subtract' | 'multiply' | 'divide'
  solve: (left: number, right: number) => number
}): QuestionGenerator {
  return {
    slug: input.slug,
    version,
    title: input.title,
    supportedDifficulties,
    generate: ({ seed, difficulty }) => {
      const random = randomFor({ seed, slug: input.slug, difficulty })
      const places = difficulty === 'hard' ? 2 : 1
      let left = makeDecimal(random, difficulty, { places, maxWhole: 40 })
      let right = makeDecimal(random, difficulty, { places, maxWhole: 20 })

      if (input.operation === 'subtract') {
        if (left < right) {
          const temp = left
          left = right
          right = temp
        }
      }

      if (input.operation === 'divide') {
        const divisor = random.integer(2, difficulty === 'hard' ? 8 : 5)
        const quotient = makeDecimal(random, difficulty, { places: 1, maxWhole: 15 })
        right = divisor
        left = roundTo(quotient * divisor, 1)
      }

      const correct = normalized(input.solve(left, right))
      const combinedDigits = Number(
        `${String(left).replace('.', '')}${String(right).replace('.', '')}`,
      )

      return buildDecimalQuestion({
        slug: input.slug,
        difficulty,
        seed,
        prompt: `Compute ${formatDecimal(left, places)} ${input.symbol} ${formatDecimal(right, places)}.`,
        correctValue: correct,
        decimalPlaces: input.operation === 'multiply' ? 3 : 2,
        candidates: [
          {
            value:
              input.operation === 'add'
                ? roundTo(left - right, 2)
                : input.operation === 'subtract'
                  ? roundTo(left + right, 2)
                  : input.operation === 'multiply'
                    ? roundTo(left + right, 2)
                    : roundTo(left * right, 2),
            mistakeType: 'used_wrong_operation',
            operation: 'use a different arithmetic operation',
            inputs: [left, right],
          },
          {
            value: combinedDigits,
            mistakeType: 'ignored_decimal_point',
            operation: 'ignore decimal points',
            inputs: [left, right],
            qualityScore: 50,
          },
          {
            value: roundTo(correct * 10, 3),
            mistakeType: 'decimal_place_shift',
            operation: 'shift decimal one place right',
            inputs: [correct],
          },
          {
            value: roundTo(correct / 10, 3),
            mistakeType: 'decimal_place_shift',
            operation: 'shift decimal one place left',
            inputs: [correct],
          },
        ],
        explanationSteps: [
          input.operation === 'add' || input.operation === 'subtract'
            ? 'Line up decimal points before combining place values.'
            : input.operation === 'multiply'
              ? 'Multiply, then place the decimal point using the total number of decimal places.'
              : 'Divide carefully and keep the decimal place in the quotient.',
          `The result is ${formatDecimal(correct, input.operation === 'multiply' ? 3 : 2)}.`,
        ],
        canonicalSignature: `${input.slug}|${difficulty}|${left}|${right}`,
        parameters: { operation: input.operation, left, right },
      })
    },
    validate: (question) =>
      validateDecimalQuestion(
        question,
        input.slug,
        (parameters) =>
          normalized(input.solve(parameters.left as number, parameters.right as number)),
      ),
  }
}

export const addingDecimalsGenerator = arithmeticGenerator({
  slug: 'adding-decimals',
  title: 'Adding Decimals',
  symbol: '+',
  operation: 'add',
  solve: (left, right) => roundTo(left + right, 4),
})

export const subtractingDecimalsGenerator = arithmeticGenerator({
  slug: 'subtracting-decimals',
  title: 'Subtracting Decimals',
  symbol: '-',
  operation: 'subtract',
  solve: (left, right) => roundTo(left - right, 4),
})

export const multiplyingDecimalsGenerator = arithmeticGenerator({
  slug: 'multiplying-decimals',
  title: 'Multiplying Decimals',
  symbol: 'x',
  operation: 'multiply',
  solve: (left, right) => roundTo(left * right, 4),
})

export const dividingDecimalsGenerator = arithmeticGenerator({
  slug: 'dividing-decimals',
  title: 'Dividing Decimals',
  symbol: '/',
  operation: 'divide',
  solve: (left, right) => roundTo(left / right, 4),
})

export const decimalConversionsGenerator: QuestionGenerator = {
  slug: 'decimal-conversions',
  version,
  title: 'Fractions, Decimals, and Percentages',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const slug = 'decimal-conversions'
    const random = randomFor({ seed, slug, difficulty })
    const denominator = random.pick(
      difficulty === 'easy'
        ? [10, 100] as const
        : difficulty === 'medium'
          ? [4, 5, 10, 20, 25, 100] as const
          : [8, 16, 20, 25, 40, 50, 100] as const,
    )
    const numerator = random.integer(1, denominator - 1)
    const decimal = roundTo(numerator / denominator, 4)
    const mode = random.pick(['fraction-to-decimal', 'decimal-to-percent'] as const)
    const correct = mode === 'fraction-to-decimal' ? decimal : decimal * 100
    const kind: AnswerKind = mode === 'fraction-to-decimal' ? 'number' : 'percent'

    return buildDecimalQuestion({
      slug,
      difficulty,
      seed,
      prompt:
        mode === 'fraction-to-decimal'
          ? `Write ${numerator}/${denominator} as a decimal.`
          : `Write ${formatDecimal(decimal, 4)} as a percentage.`,
      correctValue: correct,
      answerKind: kind,
      decimalPlaces: 4,
      candidates: [
        {
          value: mode === 'fraction-to-decimal' ? denominator / numerator : decimal,
          mistakeType: 'reversed_ratio',
          operation: 'reverse numerator and denominator or miss percent scaling',
          inputs: [numerator, denominator],
        },
        {
          value: correct * 10,
          mistakeType: 'decimal_place_shift',
          operation: 'shift decimal one place right',
          inputs: [correct],
        },
        {
          value: correct / 10,
          mistakeType: 'decimal_place_shift',
          operation: 'shift decimal one place left',
          inputs: [correct],
        },
        {
          value: numerator / 100,
          mistakeType: 'converted_fraction_denominator_incorrectly',
          operation: 'use denominator 100 incorrectly',
          inputs: [numerator, denominator],
        },
      ],
      explanationSteps: [
        `${numerator}/${denominator} = ${formatDecimal(decimal, 4)}.`,
        mode === 'fraction-to-decimal'
          ? `The decimal form is ${formatDecimal(decimal, 4)}.`
          : `To convert a decimal to percent, multiply by 100: ${formatDecimal(decimal, 4)} = ${formatDecimal(correct, 2)}%.`,
      ],
      canonicalSignature: `${slug}|${difficulty}|${mode}|${numerator}/${denominator}`,
      parameters: { operation: mode, numerator, denominator },
    })
  },
  validate: (question) =>
    validateDecimalQuestion(
      question,
      'decimal-conversions',
      (parameters) => {
        const decimal = (parameters.numerator as number) / (parameters.denominator as number)

        return parameters.operation === 'decimal-to-percent'
          ? decimal * 100
          : decimal
      },
    ),
}

export const decimalGenerators = [
  comparingDecimalsGenerator,
  roundingDecimalsGenerator,
  addingDecimalsGenerator,
  subtractingDecimalsGenerator,
  multiplyingDecimalsGenerator,
  dividingDecimalsGenerator,
  decimalConversionsGenerator,
] as const
