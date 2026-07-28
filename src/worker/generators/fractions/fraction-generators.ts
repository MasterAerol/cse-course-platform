import type {
  DistractorMistakeType,
} from '../../domain/distractor-models'
import {
  chooseUniqueFractionDistractors,
  createFractionDistractorCandidate,
  type FractionDistractorCandidate,
} from '../../domain/fractions/fraction-distractors'
import { formatFraction, formatFractionRaw } from '../../domain/fractions/fraction-format'
import {
  addFractions,
  compareFractions,
  divideFractions,
  fractionIdentity,
  fractionsEqual,
  greatestCommonDivisor,
  improperToMixed,
  leastCommonMultiple,
  mixedToImproper,
  multiplyFractions,
  simplifyFraction,
  subtractFractions,
} from '../../domain/fractions/fraction-math'
import type { Fraction } from '../../domain/fractions/fraction.types'
import {
  createSeededRandom,
  type SeededRandom,
} from '../generator-random'
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

interface FractionQuestionParameters extends Record<string, unknown> {
  correctIdentity: string
  choiceIdentities: string[]
}

interface ChoiceDraft {
  fraction: Fraction
  text: string
  isCorrect: boolean
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

function fractionValue(fraction: Fraction): number {
  const simplified = simplifyFraction(fraction)

  return simplified.numerator / simplified.denominator
}

function candidate(input: {
  fraction: Fraction
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  qualityScore?: number
  text?: string
}): FractionDistractorCandidate {
  const result = createFractionDistractorCandidate(input)

  if (result === null) {
    throw new Error(`Invalid fraction distractor for ${input.operation}.`)
  }

  return result
}

function buildFractionQuestion(input: {
  slug: GeneratorSlug
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  correct: Fraction
  candidates: readonly FractionDistractorCandidate[]
  explanationSteps: string[]
  canonicalSignature: string
  parameters: Record<string, unknown>
}): GeneratedQuestion {
  const random = randomFor({
    seed: input.seed,
    slug: input.slug,
    difficulty: input.difficulty,
  })
  const correct = simplifyFraction(input.correct)
  const distractors = chooseUniqueFractionDistractors({
    correct,
    candidates: [
      ...input.candidates,
      ...fallbackFractionDistractors(correct),
    ],
    count: 3,
  })
  const drafts: ChoiceDraft[] = [
    {
      fraction: correct,
      text: formatFraction(correct),
      isCorrect: true,
      mistakeType: null,
      derivation: null,
      qualityScore: 100,
    },
    ...distractors.map((item) => ({
      fraction: item.fraction,
      text: item.text ?? formatFraction(item.fraction),
      isCorrect: false,
      mistakeType: item.mistakeType,
      derivation: item.derivation,
      qualityScore: item.qualityScore,
    })),
  ]
  const shuffled = random.shuffle(drafts)
  const finalAnswer = formatFraction(correct)

  return {
    generatorSlug: input.slug,
    generatorVersion: version,
    difficulty: input.difficulty,
    seed: input.seed,
    prompt: input.prompt,
    parameters: {
      ...input.parameters,
      correctIdentity: fractionIdentity(correct),
      choiceIdentities: shuffled.map((choice) => fractionIdentity(choice.fraction)),
    },
    choices: shuffled.map((choice) => ({
      text: choice.text,
      isCorrect: choice.isCorrect,
      distractorType: choice.mistakeType,
      mistakeType: choice.mistakeType,
      derivation: choice.derivation,
      qualityScore: choice.qualityScore,
      numericValue: fractionValue(choice.fraction),
    })),
    explanation: {
      title: 'Solution',
      steps: input.explanationSteps,
      finalAnswer,
    },
    metadata: {
      answerKind: 'fraction',
      unit: null,
      canonicalSignature: input.canonicalSignature,
    },
  }
}

function fallbackFractionDistractors(
  correct: Fraction,
): FractionDistractorCandidate[] {
  const simplified = simplifyFraction(correct)
  const numeratorBase = Math.max(1, Math.abs(simplified.numerator))
  const denominatorBase = Math.max(2, simplified.denominator)

  return [
    candidate({
      fraction: {
        numerator: simplified.numerator + 1,
        denominator: denominatorBase,
      },
      mistakeType: 'converted_numerators_incorrectly',
      operation: 'adjust numerator upward',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 55,
    }),
    candidate({
      fraction: {
        numerator: Math.max(1, numeratorBase - 1),
        denominator: denominatorBase,
      },
      mistakeType: 'converted_numerators_incorrectly',
      operation: 'adjust numerator downward',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 55,
    }),
    candidate({
      fraction: {
        numerator: numeratorBase,
        denominator: denominatorBase + 1,
      },
      mistakeType: 'wrong_common_denominator',
      operation: 'adjust denominator upward',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 50,
    }),
    candidate({
      fraction: {
        numerator: numeratorBase + 1,
        denominator: denominatorBase + 2,
      },
      mistakeType: 'forgot_to_simplify_fraction',
      operation: 'mixed numerator and denominator adjustment',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 45,
    }),
  ]
}

function lowerFractionCandidates(correct: Fraction): FractionDistractorCandidate[] {
  const simplified = simplifyFraction(correct)
  const numerator = Math.max(1, simplified.numerator)
  const denominator = Math.max(2, simplified.denominator)

  return [
    candidate({
      fraction: {
        numerator: Math.max(1, numerator - 1),
        denominator,
      },
      mistakeType: 'compared_numerators_only',
      operation: 'lower numerator by one',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 65,
    }),
    candidate({
      fraction: {
        numerator,
        denominator: denominator + 1,
      },
      mistakeType: 'compared_denominators_only',
      operation: 'increase denominator',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 60,
    }),
    candidate({
      fraction: {
        numerator: Math.max(1, numerator - 1),
        denominator: denominator + 1,
      },
      mistakeType: 'chose_larger_denominator',
      operation: 'lower numerator and increase denominator',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 55,
    }),
    candidate({
      fraction: {
        numerator,
        denominator: denominator + 2,
      },
      mistakeType: 'reversed_inequality',
      operation: 'choose nearby smaller fraction',
      inputs: [simplified.numerator, simplified.denominator],
      qualityScore: 50,
    }),
  ].filter((item) => compareFractions(item.fraction, simplified) < 0)
}

function validateFractionQuestion(
  question: GeneratedQuestion,
  expected: {
    slug: GeneratorSlug
    recomputedAnswer: Fraction
    allowedDifficulties: readonly GeneratorDifficulty[]
  },
): GeneratorValidationResult {
  const parameters = question.parameters as FractionQuestionParameters

  if (question.generatorSlug !== expected.slug) {
    return { valid: false, reason: 'Generator slug mismatch.' }
  }

  if (question.generatorVersion !== version) {
    return { valid: false, reason: 'Generator version mismatch.' }
  }

  if (!expected.allowedDifficulties.includes(question.difficulty)) {
    return { valid: false, reason: 'Unsupported difficulty.' }
  }

  if (question.choices.length !== 4) {
    return { valid: false, reason: 'Question does not have four choices.' }
  }

  if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
    return { valid: false, reason: 'Question must have exactly one correct choice.' }
  }

  if (new Set(question.choices.map((choice) => choice.text)).size !== 4) {
    return { valid: false, reason: 'Choice text is duplicated.' }
  }

  if (
    !Array.isArray(parameters.choiceIdentities) ||
    new Set(parameters.choiceIdentities).size !== 4
  ) {
    return { valid: false, reason: 'Choice rational value is duplicated.' }
  }

  const expectedIdentity = fractionIdentity(expected.recomputedAnswer)

  if (parameters.correctIdentity !== expectedIdentity) {
    return { valid: false, reason: 'Correct identity does not match recomputed answer.' }
  }

  const correctChoice = question.choices.find((choice) => choice.isCorrect)

  if (correctChoice?.text !== formatFraction(expected.recomputedAnswer)) {
    return { valid: false, reason: 'Correct choice text does not match.' }
  }

  if (question.explanation.finalAnswer !== correctChoice.text) {
    return { valid: false, reason: 'Explanation final answer mismatch.' }
  }

  for (const choice of question.choices) {
    if (
      !choice.isCorrect &&
      (choice.mistakeType === null ||
        choice.derivation === null ||
        choice.qualityScore < 35)
    ) {
      return { valid: false, reason: 'Distractor is missing quality metadata.' }
    }
  }

  return { valid: true, reason: null }
}

function properFraction(random: SeededRandom, difficulty: GeneratorDifficulty): Fraction {
  const denominator =
    difficulty === 'easy'
      ? random.integer(3, 9)
      : difficulty === 'medium'
        ? random.integer(5, 14)
        : random.integer(8, 18)
  const numerator = random.integer(1, denominator - 1)

  return simplifyFraction({ numerator, denominator })
}

export const equivalentFractionsGenerator: QuestionGenerator = {
  slug: 'equivalent-fractions',
  version,
  title: 'Equivalent Fractions',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const slug = 'equivalent-fractions'
    const random = randomFor({ seed, slug, difficulty })
    const base = properFraction(random, difficulty)
    const scale =
      difficulty === 'easy'
        ? random.pick([2, 3, 4])
        : difficulty === 'medium'
          ? random.integer(3, 7)
          : random.integer(5, 11)
    const scaled = {
      numerator: base.numerator * scale,
      denominator: base.denominator * scale,
    }
    const missingVariant = difficulty === 'easy' ? 'direct' : random.pick(['direct', 'missing-numerator'] as const)
    const prompt =
      missingVariant === 'missing-numerator'
        ? `Complete the equivalent fraction: ${formatFraction(base)} = ?/${scaled.denominator}`
        : `Which fraction is equivalent to ${formatFraction(base)}?`
    const correct =
      missingVariant === 'missing-numerator'
        ? { numerator: scaled.numerator, denominator: 1 }
        : scaled
    const candidates = [
      candidate({
        fraction: {
          numerator: base.numerator * scale,
          denominator: base.denominator,
        },
        mistakeType: 'multiplied_numerator_only',
        operation: 'numerator * scale',
        inputs: [base.numerator, base.denominator, scale],
      }),
      candidate({
        fraction: {
          numerator: base.numerator,
          denominator: base.denominator * scale,
        },
        mistakeType: 'multiplied_denominator_only',
        operation: 'denominator * scale',
        inputs: [base.numerator, base.denominator, scale],
      }),
      candidate({
        fraction: {
          numerator: base.numerator + scale,
          denominator: base.denominator + scale,
        },
        mistakeType: 'added_scale_factor',
        operation: 'add scale factor',
        inputs: [base.numerator, base.denominator, scale],
      }),
      candidate({
        fraction: {
          numerator: scaled.denominator,
          denominator: scaled.numerator,
        },
        mistakeType: 'reversed_fraction',
        operation: 'reverse scaled fraction',
        inputs: [scaled.numerator, scaled.denominator],
      }),
    ]

    return buildFractionQuestion({
      slug,
      difficulty,
      seed,
      prompt,
      correct,
      candidates,
      canonicalSignature: `${slug}|${difficulty}|${base.numerator}/${base.denominator}|${scale}|${missingVariant}`,
      parameters: { base, scale, missingVariant },
      explanationSteps: [
        `Equivalent fractions are made by multiplying numerator and denominator by the same number.`,
        `${formatFraction(base)} × ${scale}/${scale} = ${formatFractionRaw(scaled)}.`,
        `The equivalent value is ${formatFraction(correct)}.`,
      ],
    })
  },
  validate: (question) => {
    const parameters = question.parameters as {
      base: Fraction
      scale: number
      missingVariant: string
    }
    const scaled = {
      numerator: parameters.base.numerator * parameters.scale,
      denominator: parameters.base.denominator * parameters.scale,
    }

    return validateFractionQuestion(question, {
      slug: 'equivalent-fractions',
      allowedDifficulties: supportedDifficulties,
      recomputedAnswer:
        parameters.missingVariant === 'missing-numerator'
          ? { numerator: scaled.numerator, denominator: 1 }
          : scaled,
    })
  },
}

export const simplifyingFractionsGenerator: QuestionGenerator = {
  slug: 'simplifying-fractions',
  version,
  title: 'Simplifying Fractions',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const slug = 'simplifying-fractions'
    const random = randomFor({ seed, slug, difficulty })
    const simplified = properFraction(random, difficulty)
    const factor =
      difficulty === 'easy'
        ? random.pick([2, 3, 4])
        : difficulty === 'medium'
          ? random.integer(4, 8)
          : random.integer(6, 12)
    const original = {
      numerator: simplified.numerator * factor,
      denominator: simplified.denominator * factor,
    }
    const partialMultiplier = Math.max(2, Math.floor(factor / 2))
    const candidates = [
      candidate({
        fraction: {
          numerator: simplified.numerator,
          denominator: original.denominator,
        },
        mistakeType: 'divided_numerator_only',
        operation: 'divide numerator only',
        inputs: [original.numerator, original.denominator, factor],
      }),
      candidate({
        fraction: {
          numerator: original.numerator,
          denominator: simplified.denominator,
        },
        mistakeType: 'divided_denominator_only',
        operation: 'divide denominator only',
        inputs: [original.numerator, original.denominator, factor],
      }),
      candidate({
        fraction: {
          numerator: original.numerator - factor,
          denominator: original.denominator - factor,
        },
        mistakeType: 'subtracted_common_factor',
        operation: 'subtract factor',
        inputs: [original.numerator, original.denominator, factor],
      }),
      candidate({
        fraction: {
          numerator: simplified.numerator * partialMultiplier,
          denominator: simplified.denominator * partialMultiplier,
        },
        mistakeType: 'stopped_simplifying_too_early',
        operation: 'divide by only part of the common factor',
        inputs: [original.numerator, original.denominator, partialMultiplier],
      }),
    ]

    return buildFractionQuestion({
      slug,
      difficulty,
      seed,
      prompt: `Simplify ${formatFractionRaw(original)}.`,
      correct: simplified,
      candidates,
      canonicalSignature: `${slug}|${difficulty}|${original.numerator}/${original.denominator}`,
      parameters: { original, factor },
      explanationSteps: [
        `The numerator and denominator have a common factor of ${factor}.`,
        `Divide both parts by ${factor}: ${original.numerator} ÷ ${factor} = ${simplified.numerator}, and ${original.denominator} ÷ ${factor} = ${simplified.denominator}.`,
        `The simplified fraction is ${formatFraction(simplified)}.`,
      ],
    })
  },
  validate: (question) => {
    const parameters = question.parameters as { original: Fraction }

    return validateFractionQuestion(question, {
      slug: 'simplifying-fractions',
      allowedDifficulties: supportedDifficulties,
      recomputedAnswer: simplifyFraction(parameters.original),
    })
  },
}

export const comparingFractionsGenerator: QuestionGenerator = {
  slug: 'comparing-fractions',
  version,
  title: 'Comparing Fractions',
  supportedDifficulties,
  generate: ({ seed, difficulty }) => {
    const slug = 'comparing-fractions'
    const random = randomFor({ seed, slug, difficulty })
    let left = properFraction(random, difficulty)
    let right = properFraction(random, difficulty)

    while (fractionsEqual(left, right)) {
      right = properFraction(random, difficulty)
    }

    if (difficulty === 'easy') {
      const denominator = random.integer(4, 12)
      left = { numerator: random.integer(1, denominator - 2), denominator }
      right = { numerator: random.integer(left.numerator + 1, denominator - 1), denominator }
    }

    const correct = compareFractions(left, right) > 0 ? left : right
    const smaller = compareFractions(left, right) > 0 ? right : left
    const candidates = [
      candidate({
        fraction: smaller,
        mistakeType: 'reversed_inequality',
        operation: 'choose smaller fraction',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
      ...lowerFractionCandidates(correct),
    ]

    return buildFractionQuestion({
      slug,
      difficulty,
      seed,
      prompt: `Which fraction is greater: ${formatFraction(left)} or ${formatFraction(right)}?`,
      correct,
      candidates,
      canonicalSignature: `${slug}|${difficulty}|${fractionIdentity(left)}|${fractionIdentity(right)}`,
      parameters: { left, right },
      explanationSteps: [
        `Compare by cross multiplication or common denominators.`,
        `${left.numerator} × ${right.denominator} = ${left.numerator * right.denominator}; ${right.numerator} × ${left.denominator} = ${right.numerator * left.denominator}.`,
        `The greater fraction is ${formatFraction(correct)}.`,
      ],
    })
  },
  validate: (question) => {
    const parameters = question.parameters as { left: Fraction; right: Fraction }

    return validateFractionQuestion(question, {
      slug: 'comparing-fractions',
      allowedDifficulties: supportedDifficulties,
      recomputedAnswer:
        compareFractions(parameters.left, parameters.right) > 0
          ? parameters.left
          : parameters.right,
    })
  },
}

function operationFractions(
  random: SeededRandom,
  difficulty: GeneratorDifficulty,
): { left: Fraction; right: Fraction } {
  if (difficulty === 'easy') {
    const denominator = random.integer(5, 12)
    const leftNumerator = random.integer(1, denominator - 3)
    const rightNumerator = random.integer(1, denominator - leftNumerator - 1)

    return {
      left: { numerator: leftNumerator, denominator },
      right: { numerator: rightNumerator, denominator },
    }
  }

  return {
    left: properFraction(random, difficulty),
    right: properFraction(random, difficulty),
  }
}

function arithmeticCandidates(input: {
  left: Fraction
  right: Fraction
  correct: Fraction
  operation: 'add' | 'subtract' | 'multiply' | 'divide'
}): FractionDistractorCandidate[] {
  const { left, right, operation } = input

  if (operation === 'add') {
    return [
      candidate({
        fraction: {
          numerator: left.numerator + right.numerator,
          denominator: left.denominator + right.denominator,
        },
        mistakeType: 'added_denominators',
        operation: 'add numerator and denominator',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
      candidate({
        fraction: {
          numerator: left.numerator + right.numerator,
          denominator: left.denominator * right.denominator,
        },
        mistakeType: 'wrong_common_denominator',
        operation: 'use product denominator without converting numerators',
        inputs: [left.denominator, right.denominator],
      }),
      candidate({
        fraction: {
          numerator: input.correct.numerator,
          denominator: input.correct.denominator * greatestCommonDivisor(input.correct.numerator, input.correct.denominator),
        },
        mistakeType: 'forgot_to_simplify_fraction',
        operation: 'unsimplified-style denominator',
        inputs: [input.correct.numerator, input.correct.denominator],
      }),
      candidate({
        fraction: {
          numerator: left.numerator * right.denominator + right.numerator * left.denominator,
          denominator: leastCommonMultiple(left.denominator, right.denominator) || left.denominator,
        },
        mistakeType: 'converted_numerators_incorrectly',
        operation: 'mixed denominator conversion',
        inputs: [left.denominator, right.denominator],
      }),
    ]
  }

  if (operation === 'subtract') {
    return [
      candidate({
        fraction: {
          numerator: Math.abs(left.numerator - right.numerator),
          denominator: Math.abs(left.denominator - right.denominator) || left.denominator,
        },
        mistakeType: 'subtracted_denominators',
        operation: 'subtract denominators',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
      candidate({
        fraction: subtractFractions(right, left),
        mistakeType: 'reversed_subtraction',
        operation: 'reverse subtraction',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
      candidate({
        fraction: {
          numerator: left.numerator - right.numerator,
          denominator: left.denominator * right.denominator,
        },
        mistakeType: 'wrong_common_denominator',
        operation: 'use product denominator without converting',
        inputs: [left.denominator, right.denominator],
      }),
      candidate({
        fraction: {
          numerator: input.correct.numerator * 2,
          denominator: input.correct.denominator * 2,
        },
        mistakeType: 'forgot_to_simplify_fraction',
        operation: 'leave equivalent unsimplified result',
        inputs: [input.correct.numerator, input.correct.denominator],
      }),
    ]
  }

  if (operation === 'multiply') {
    return [
      candidate({
        fraction: addFractions(left, right),
        mistakeType: 'added_instead_of_multiplied',
        operation: 'add instead of multiply',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
      candidate({
        fraction: {
          numerator: left.numerator * right.numerator,
          denominator: left.denominator + right.denominator,
        },
        mistakeType: 'multiplied_numerator_added_denominator',
        operation: 'multiply numerator add denominator',
        inputs: [left.denominator, right.denominator],
      }),
      candidate({
        fraction: {
          numerator: left.numerator * right.denominator,
          denominator: left.denominator * right.numerator,
        },
        mistakeType: 'cross_multiplied',
        operation: 'cross multiply',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
      candidate({
        fraction: divideFractions(left, right),
        mistakeType: 'inverted_unnecessarily',
        operation: 'divide instead of multiply',
        inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
      }),
    ]
  }

  return [
    candidate({
      fraction: multiplyFractions(left, right),
      mistakeType: 'multiplied_without_flipping',
      operation: 'multiply without reciprocal',
      inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
    }),
    candidate({
      fraction: divideFractions(right, left),
      mistakeType: 'flipped_first_fraction',
      operation: 'flip first fraction',
      inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
    }),
    candidate({
      fraction: {
        numerator: left.denominator * right.denominator,
        denominator: left.numerator * right.numerator,
      },
      mistakeType: 'flipped_both_fractions',
      operation: 'flip both fractions',
      inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
    }),
    candidate({
      fraction: addFractions(left, right),
      mistakeType: 'added_instead_of_divided',
      operation: 'add instead of divide',
      inputs: [left.numerator, left.denominator, right.numerator, right.denominator],
    }),
  ]
}

function arithmeticGenerator(input: {
  slug: GeneratorSlug
  title: string
  symbol: string
  operation: 'add' | 'subtract' | 'multiply' | 'divide'
  solve: (left: Fraction, right: Fraction) => Fraction
}): QuestionGenerator {
  return {
    slug: input.slug,
    version,
    title: input.title,
    supportedDifficulties,
    generate: ({ seed, difficulty }) => {
      const random = randomFor({ seed, slug: input.slug, difficulty })
      let { left, right } = operationFractions(random, difficulty)

      if (input.operation === 'subtract') {
        while (compareFractions(left, right) <= 0) {
          left = properFraction(random, difficulty)
          right = properFraction(random, difficulty)
        }
      }

      const correct = input.solve(left, right)

      return buildFractionQuestion({
        slug: input.slug,
        difficulty,
        seed,
        prompt: `Compute ${formatFraction(left)} ${input.symbol} ${formatFraction(right)}.`,
        correct,
        candidates: arithmeticCandidates({
          left,
          right,
          correct,
          operation: input.operation,
        }),
        canonicalSignature: `${input.slug}|${difficulty}|${fractionIdentity(left)}|${fractionIdentity(right)}`,
        parameters: { left, right },
        explanationSteps: [
          input.operation === 'divide'
            ? `Keep ${formatFraction(left)}, change division to multiplication, and flip ${formatFraction(right)}.`
            : input.operation === 'multiply'
              ? 'Multiply numerators, multiply denominators, then simplify.'
              : left.denominator === right.denominator
                ? 'The denominators are the same, so work with the numerators and keep the denominator.'
                : 'Use a common denominator, work with the converted numerators, then simplify.',
          `The result is ${formatFraction(correct)}.`,
        ],
      })
    },
    validate: (question) => {
      const parameters = question.parameters as { left: Fraction; right: Fraction }

      return validateFractionQuestion(question, {
        slug: input.slug,
        allowedDifficulties: supportedDifficulties,
        recomputedAnswer: input.solve(parameters.left, parameters.right),
      })
    },
  }
}

export const addingFractionsGenerator = arithmeticGenerator({
  slug: 'adding-fractions',
  title: 'Adding Fractions',
  symbol: '+',
  operation: 'add',
  solve: addFractions,
})

export const subtractingFractionsGenerator = arithmeticGenerator({
  slug: 'subtracting-fractions',
  title: 'Subtracting Fractions',
  symbol: '−',
  operation: 'subtract',
  solve: subtractFractions,
})

export const multiplyingFractionsGenerator = arithmeticGenerator({
  slug: 'multiplying-fractions',
  title: 'Multiplying Fractions',
  symbol: '×',
  operation: 'multiply',
  solve: multiplyFractions,
})

export const dividingFractionsGenerator = arithmeticGenerator({
  slug: 'dividing-fractions',
  title: 'Dividing Fractions',
  symbol: '÷',
  operation: 'divide',
  solve: divideFractions,
})

export const fractionGenerators = [
  equivalentFractionsGenerator,
  simplifyingFractionsGenerator,
  comparingFractionsGenerator,
  addingFractionsGenerator,
  subtractingFractionsGenerator,
  multiplyingFractionsGenerator,
  dividingFractionsGenerator,
] as const

export function mixedConversionExamples(): { improper: string; mixed: string } {
  const mixed = improperToMixed({ numerator: 11, denominator: 4 })
  const improper = mixedToImproper({ whole: 3, numerator: 2, denominator: 5 })

  return {
    improper: `${formatFraction({ numerator: 11, denominator: 4 })} = ${mixed.whole} ${mixed.numerator}/${mixed.denominator}`,
    mixed: `3 2/5 = ${formatFraction(improper)}`,
  }
}
