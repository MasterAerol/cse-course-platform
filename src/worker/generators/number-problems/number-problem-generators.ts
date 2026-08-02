import {
  chooseNumberProblemDistractors,
  createNumberProblemDistractor,
  type NumberProblemDistractor,
} from '../../domain/number-problems/number-problem-distractors'
import { formatIntegerAnswer } from '../../domain/number-problems/number-problem-format'
import {
  consecutiveSequence,
  constructTwoDigitNumber,
  divideByRational,
  hasParity,
  rational,
  rationalToInteger,
  reverseTwoDigitNumber,
  smallestPositiveWithRemainders,
  solveLinearPair,
} from '../../domain/number-problems/number-problem-math'
import {
  assertIntegerAnswer,
  validateDigitPair,
  validateParitySequence,
  validateRemainderCondition,
} from '../../domain/number-problems/number-problem-validation'
import type { DistractorMistakeType } from '../../domain/distractor-models'
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
  | 'consecutive'
  | 'parity-sequence'
  | 'sum-difference'
  | 'multiple-relationship'
  | 'two-digit'
  | 'reversed-digit'
  | 'quotient-remainder'
  | 'simultaneous-remainder'
  | 'fractional-part'

interface ChoiceDraft {
  text: string
  value: number
  mistakeType: DistractorMistakeType | null
  derivation: GeneratedChoice['derivation']
  qualityScore: number
}

function randomFor(input: { seed: string; slug: GeneratorSlug; difficulty: GeneratorDifficulty }): SeededRandom {
  return createSeededRandom(`${input.seed}|${input.slug}|${version}|${input.difficulty}`)
}

function candidate(input: {
  value: number
  correct: number
  mistakeType: DistractorMistakeType
  operation: string
  inputs: number[]
  suffix?: string
  qualityScore?: number
}): NumberProblemDistractor | null {
  return createNumberProblemDistractor(input)
}

function buildQuestion(input: {
  slug: GeneratorSlug
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  correct: number
  candidates: readonly (NumberProblemDistractor | null)[]
  explanationSteps: string[]
  validationKind: ValidationKind
  parameters: Record<string, unknown>
  canonicalSignature: string
  suffix?: string
}): GeneratedQuestion {
  const correct = assertIntegerAnswer(input.correct)
  const distractors = chooseNumberProblemDistractors(input.candidates)
  const random = randomFor(input)
  const choices: ChoiceDraft[] = random.shuffle([
    { text: formatIntegerAnswer(correct, input.suffix), value: correct, mistakeType: null, derivation: null, qualityScore: 100 },
    ...distractors.map((item) => ({ text: item.text, value: item.value, mistakeType: item.mistakeType, derivation: item.derivation, qualityScore: item.qualityScore })),
  ])
  if (new Set(choices.map((choice) => choice.text)).size !== 4 || new Set(choices.map((choice) => choice.value)).size !== 4) {
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
      correctIdentity: String(correct),
      choiceIdentities: choices.map((choice) => String(choice.value)),
    },
    choices: choices.map((choice) => ({
      text: choice.text,
      isCorrect: choice.value === correct,
      distractorType: choice.mistakeType,
      mistakeType: choice.mistakeType,
      derivation: choice.derivation,
      qualityScore: choice.qualityScore,
      numericValue: choice.value,
    })),
    explanation: { title: 'Solution', steps: input.explanationSteps, finalAnswer: formatIntegerAnswer(correct, input.suffix) },
    metadata: { answerKind: 'count', unit: input.suffix?.trim() || null, canonicalSignature: input.canonicalSignature },
  }
}

function numberParam(parameters: Record<string, unknown>, key: string): number {
  const value = parameters[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid numeric parameter ${key}.`)
  return value
}

function stringParam(parameters: Record<string, unknown>, key: string): string {
  const value = parameters[key]
  if (typeof value !== 'string') throw new Error(`Invalid string parameter ${key}.`)
  return value
}

function recompute(question: GeneratedQuestion): number {
  const p = question.parameters
  const kind = p.validationKind
  if (kind === 'consecutive' || kind === 'parity-sequence') {
    const values = consecutiveSequence(numberParam(p, 'start'), numberParam(p, 'count'), numberParam(p, 'step'))
    const requested = stringParam(p, 'requested')
    if (requested === 'sum') return values.reduce((sum, value) => sum + value, 0)
    if (requested === 'smallest') return values[0] as number
    return values.at(-1) as number
  }
  if (kind === 'sum-difference') {
    const solved = solveLinearPair(
      { xCoefficient: 1, yCoefficient: 1, constant: numberParam(p, 'sum') },
      { xCoefficient: 1, yCoefficient: -1, constant: numberParam(p, 'difference') },
    )
    if (solved === null) throw new Error('The sum-and-difference system has no integer solution.')
    return stringParam(p, 'requested') === 'larger' ? solved.x : solved.y
  }
  if (kind === 'multiple-relationship') {
    const smaller = stringParam(p, 'condition') === 'sum'
      ? numberParam(p, 'conditionValue') / (numberParam(p, 'multiplier') + 1)
      : numberParam(p, 'conditionValue') / (numberParam(p, 'multiplier') - 1)
    return assertIntegerAnswer(smaller * numberParam(p, 'multiplier'))
  }
  if (kind === 'two-digit' || kind === 'reversed-digit') {
    const tens = numberParam(p, 'tens')
    const ones = numberParam(p, 'ones')
    if (!validateDigitPair(tens, ones, kind === 'reversed-digit')) throw new Error('Invalid digit parameters.')
    return kind === 'two-digit' ? constructTwoDigitNumber(tens, ones) :
      (stringParam(p, 'requested') === 'original' ? constructTwoDigitNumber(tens, ones) : constructTwoDigitNumber(ones, tens))
  }
  if (kind === 'quotient-remainder') {
    const divisor = numberParam(p, 'divisor')
    const quotient = numberParam(p, 'quotient')
    const remainder = numberParam(p, 'remainder')
    const value = divisor * quotient + remainder
    if (!validateRemainderCondition(value, divisor, remainder)) throw new Error('Invalid remainder parameters.')
    return value
  }
  if (kind === 'simultaneous-remainder') {
    const value = smallestPositiveWithRemainders([
      { divisor: numberParam(p, 'firstDivisor'), remainder: numberParam(p, 'firstRemainder') },
      { divisor: numberParam(p, 'secondDivisor'), remainder: numberParam(p, 'secondRemainder') },
    ], 500)
    if (value === null) throw new Error('No simultaneous remainder solution was found.')
    return value
  }
  if (kind === 'fractional-part') {
    const part = numberParam(p, 'part')
    const fraction = rational(numberParam(p, 'numerator'), numberParam(p, 'denominator'))
    const whole = rationalToInteger(divideByRational(part, fraction))
    if (whole === null) throw new Error('Fractional-part answer is not an integer.')
    return whole
  }
  throw new Error('Unsupported number-problem validation kind.')
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    if (question.generatorVersion !== version || !supportedDifficulties.includes(question.difficulty) || question.choices.length !== 4) {
      return { valid: false, reason: 'Generator metadata is invalid.' }
    }
    const expected = recompute(question)
    const correct = question.choices.filter((choice) => choice.isCorrect)
    const identities = question.parameters.choiceIdentities
    if (correct.length !== 1 || question.parameters.correctIdentity !== String(expected) || !Array.isArray(identities) ||
      new Set(identities).size !== 4 || new Set(question.choices.map((choice) => choice.text)).size !== 4 ||
      correct[0]?.numericValue !== expected || correct[0]?.text !== question.explanation.finalAnswer) {
      return { valid: false, reason: 'Answer or choice validation failed.' }
    }
    if (question.parameters.validationKind === 'parity-sequence') {
      const values = consecutiveSequence(numberParam(question.parameters, 'start'), numberParam(question.parameters, 'count'), 2)
      const parity = stringParam(question.parameters, 'parity')
      if ((parity !== 'odd' && parity !== 'even') || !validateParitySequence(values, parity)) {
        return { valid: false, reason: 'Parity validation failed.' }
      }
    }
    for (const choice of question.choices) {
      if (!Number.isFinite(choice.numericValue) || !Number.isInteger(choice.numericValue)) return { valid: false, reason: 'A choice is not a finite integer.' }
      if (!choice.isCorrect && (choice.mistakeType === null || choice.derivation === null || choice.qualityScore < 35)) {
        return { valid: false, reason: 'Distractor validation failed.' }
      }
    }
    return { valid: true, reason: null }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Validation failed.' }
  }
}

function sequenceQuestion(input: { seed: string; difficulty: GeneratorDifficulty; parity?: 'odd' | 'even' }): GeneratedQuestion {
  const slug: GeneratorSlug = input.parity === undefined ? 'consecutive-integers' : 'consecutive-odd-even-integers'
  const random = randomFor({ ...input, slug })
  const count = input.difficulty === 'easy' ? random.pick([2, 3]) : random.pick([3, 4])
  const step = input.parity === undefined ? 1 : 2
  let start = random.integer(input.difficulty === 'medium' ? -8 : 2, input.difficulty === 'hard' ? 32 : 24)
  if (input.parity === 'odd' && !hasParity(start, 'odd')) start += 1
  if (input.parity === 'even' && !hasParity(start, 'even')) start += 1
  const values = consecutiveSequence(start, count, step)
  const requested = input.difficulty === 'easy' ? 'largest' : random.pick(['smallest', 'largest', 'sum'] as const)
  const correct = requested === 'sum' ? values.reduce((sum, value) => sum + value, 0) : requested === 'smallest' ? start : values.at(-1) as number
  const total = values.reduce((sum, value) => sum + value, 0)
  const label = input.parity === undefined ? 'consecutive integers' : `consecutive ${input.parity} integers`
  const relationship = requested === 'sum'
    ? `The ${count} ${label} begin with ${start}. Find their sum.`
    : `The sum of ${count} ${label} is ${total}. Find the ${requested} integer.`
  return buildQuestion({
    slug, difficulty: input.difficulty, seed: input.seed, prompt: relationship, correct,
    candidates: [
      candidate({ value: start, correct, mistakeType: 'returned_base_instead_of_requested_term', operation: 'return base value', inputs: [start, count, step] }),
      candidate({ value: total, correct, mistakeType: 'used_sequence_sum_as_term', operation: 'return sequence sum', inputs: values }),
      candidate({ value: Math.trunc(total / Math.max(1, count - 1)), correct, mistakeType: 'divided_sequence_by_wrong_count', operation: 'divide by one fewer term', inputs: [total, count] }),
      candidate({ value: start + (count - 1) * (step === 1 ? 2 : 1), correct, mistakeType: step === 1 ? 'used_wrong_consecutive_step' : 'used_step_one_for_parity_sequence', operation: 'use wrong sequence step', inputs: [start, count, step] }),
      candidate({ value: correct + step, correct, mistakeType: 'advanced_one_sequence_term_too_far', operation: 'advance one extra term', inputs: [correct, step] }),
      candidate({ value: correct - step, correct, mistakeType: 'stopped_one_sequence_term_too_early', operation: 'stop one term early', inputs: [correct, step] }),
      candidate({ value: total - (values.at(-1) as number), correct, mistakeType: 'omitted_sequence_term', operation: 'omit final term', inputs: values }),
    ],
    explanationSteps: [`Represent the sequence with a step of ${step}: ${values.join(', ')}.`, requested === 'sum' ? `Add all ${count} terms to get ${correct}.` : `The requested ${requested} term is ${correct}.`],
    validationKind: input.parity === undefined ? 'consecutive' : 'parity-sequence',
    parameters: { start, count, step, requested, parity: input.parity ?? 'none' },
    canonicalSignature: `${slug}|${start}|${count}|${requested}`,
  })
}

export const consecutiveIntegersGenerator: QuestionGenerator = {
  slug: 'consecutive-integers', version, title: 'Consecutive Integers', supportedDifficulties,
  generate(input) { return sequenceQuestion(input) }, validate: validateQuestion,
}

export const consecutiveOddEvenIntegersGenerator: QuestionGenerator = {
  slug: 'consecutive-odd-even-integers', version, title: 'Consecutive Odd and Even Integers', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'consecutive-odd-even-integers' })
    return sequenceQuestion({ ...input, parity: random.pick(['odd', 'even'] as const) })
  }, validate: validateQuestion,
}

export const sumDifferenceNumbersGenerator: QuestionGenerator = {
  slug: 'sum-difference-numbers', version, title: 'Sum and Difference of Numbers', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'sum-difference-numbers' })
    const smaller = random.integer(4, input.difficulty === 'hard' ? 45 : 28)
    const difference = random.integer(3, 14)
    const larger = smaller + difference
    const sum = larger + smaller
    const requested = random.pick(['larger', 'smaller'] as const)
    const correct = requested === 'larger' ? larger : smaller
    return buildQuestion({
      slug: 'sum-difference-numbers', difficulty: input.difficulty, seed: input.seed,
      prompt: `The sum of two numbers is ${sum}, and their difference is ${difference}. Find the ${requested} number.`, correct,
      candidates: [
        candidate({ value: requested === 'larger' ? smaller : larger, correct, mistakeType: 'returned_wrong_number_from_pair', operation: 'return the other number', inputs: [larger, smaller] }),
        candidate({ value: sum, correct, mistakeType: 'used_relationship_total_as_answer', operation: 'use sum directly', inputs: [sum] }),
        candidate({ value: Math.trunc(difference / 2), correct, mistakeType: 'halved_difference_only', operation: 'halve difference only', inputs: [difference] }),
        candidate({ value: Math.trunc((sum - difference) / 2) + difference * 2, correct, mistakeType: 'added_difference_twice', operation: 'add difference twice', inputs: [sum, difference] }),
        candidate({ value: Math.trunc((sum + difference) / 2) - difference, correct, mistakeType: 'reversed_larger_smaller_relationship', operation: 'reverse requested relationship', inputs: [sum, difference] }),
        candidate({ value: Math.trunc((sum + difference) / 2) + 1, correct, mistakeType: 'number_relationship_arithmetic_error', operation: 'make arithmetic sign error', inputs: [sum, difference] }),
      ],
      explanationSteps: [`Let x be the larger number and y the smaller: x + y = ${sum}, x - y = ${difference}.`, `Add the equations: 2x = ${sum + difference}, so x = ${larger}.`, `Then y = ${smaller}; the requested answer is ${correct}.`],
      validationKind: 'sum-difference', parameters: { sum, difference, requested }, canonicalSignature: `sum-difference-numbers|${sum}|${difference}|${requested}`,
    })
  }, validate: validateQuestion,
}

export const productQuotientNumbersGenerator: QuestionGenerator = {
  slug: 'product-quotient-numbers', version, title: 'Product and Quotient Relationships', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'product-quotient-numbers' })
    const multiplier = random.integer(2, input.difficulty === 'hard' ? 6 : 4)
    const smaller = random.integer(3, 16)
    const larger = smaller * multiplier
    const condition = random.pick(['sum', 'difference'] as const)
    const conditionValue = condition === 'sum' ? larger + smaller : larger - smaller
    return buildQuestion({
      slug: 'product-quotient-numbers', difficulty: input.difficulty, seed: input.seed,
      prompt: `One positive integer is ${multiplier} times another. Their ${condition} is ${conditionValue}. Find the larger integer.`, correct: larger,
      candidates: [
        candidate({ value: smaller, correct: larger, mistakeType: 'returned_smaller_instead_of_larger', operation: 'return smaller number', inputs: [smaller, larger] }),
        candidate({ value: multiplier, correct: larger, mistakeType: 'used_multiplier_as_number_answer', operation: 'use multiplier as answer', inputs: [multiplier] }),
        candidate({ value: conditionValue, correct: larger, mistakeType: 'ignored_second_number_condition', operation: 'use relationship total', inputs: [conditionValue] }),
        candidate({ value: conditionValue - multiplier, correct: larger, mistakeType: 'treated_times_as_addition', operation: 'treat times as addition', inputs: [conditionValue, multiplier] }),
        candidate({ value: Math.trunc(conditionValue / multiplier), correct: larger, mistakeType: 'reversed_quotient_order', operation: 'divide condition by multiplier only', inputs: [conditionValue, multiplier] }),
        candidate({ value: larger + smaller, correct: larger, mistakeType: 'used_relationship_total_as_answer', operation: 'return pair total', inputs: [larger, smaller] }),
      ],
      explanationSteps: [`Let the smaller number be x, so the larger is ${multiplier}x.`, condition === 'sum' ? `${multiplier}x + x = ${conditionValue}.` : `${multiplier}x - x = ${conditionValue}.`, `Solve x = ${smaller}; the larger number is ${larger}.`],
      validationKind: 'multiple-relationship', parameters: { multiplier, condition, conditionValue }, canonicalSignature: `product-quotient-numbers|${multiplier}|${condition}|${conditionValue}`,
    })
  }, validate: validateQuestion,
}

export const twoDigitNumberProblemsGenerator: QuestionGenerator = {
  slug: 'two-digit-number-problems', version, title: 'Two-Digit Number Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'two-digit-number-problems' })
    const ones = random.integer(1, 6)
    const difference = random.integer(1, Math.min(3, 9 - ones))
    const tens = ones + difference
    const digitSum = tens + ones
    const correct = constructTwoDigitNumber(tens, ones)
    return buildQuestion({
      slug: 'two-digit-number-problems', difficulty: input.difficulty, seed: input.seed,
      prompt: `The digits of a two-digit number sum to ${digitSum}. The tens digit is ${difference} greater than the ones digit. Find the number.`, correct,
      candidates: [
        candidate({ value: digitSum, correct, mistakeType: 'used_digit_sum_as_number', operation: 'use digit sum as number', inputs: [tens, ones] }),
        candidate({ value: constructTwoDigitNumber(ones, tens), correct, mistakeType: 'reversed_digit_place_values', operation: 'reverse tens and ones', inputs: [tens, ones] }),
        candidate({ value: tens + 10 * ones, correct, mistakeType: 'used_a_plus_ten_b', operation: 'use a + 10b', inputs: [tens, ones] }),
        candidate({ value: tens, correct, mistakeType: 'satisfied_only_digit_relationship', operation: 'return tens digit only', inputs: [tens, ones] }),
        candidate({ value: ones, correct, mistakeType: 'satisfied_only_digit_relationship', operation: 'return ones digit only', inputs: [tens, ones] }),
        candidate({ value: correct + digitSum, correct, mistakeType: 'confused_digit_sum_with_number_value', operation: 'add digit sum to number', inputs: [correct, digitSum] }),
      ],
      explanationSteps: [`Let a be the tens digit and b the ones digit: a + b = ${digitSum}, a = b + ${difference}.`, `Solving gives a = ${tens} and b = ${ones}.`, `The number is 10a + b = ${correct}.`],
      validationKind: 'two-digit', parameters: { tens, ones, digitSum, difference }, canonicalSignature: `two-digit-number-problems|${tens}|${ones}`,
    })
  }, validate: validateQuestion,
}

export const reversedDigitProblemsGenerator: QuestionGenerator = {
  slug: 'reversed-digit-problems', version, title: 'Reversed-Digit Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'reversed-digit-problems' })
    const tens = random.integer(2, 9)
    let ones = random.integer(1, 8)
    if (tens === ones) ones = tens === 9 ? 8 : tens + 1
    const original = constructTwoDigitNumber(tens, ones)
    const reversed = reverseTwoDigitNumber(original)
    const digitSum = tens + ones
    const signedDifference = original - reversed
    const requested = random.pick(['original', 'reversed'] as const)
    const correct = requested === 'original' ? original : reversed
    return buildQuestion({
      slug: 'reversed-digit-problems', difficulty: input.difficulty, seed: input.seed,
      prompt: `A two-digit number and its reverse have digit sum ${digitSum}. The original minus its reverse is ${signedDifference}. Find the ${requested} number.`, correct,
      candidates: [
        candidate({ value: requested === 'original' ? reversed : original, correct, mistakeType: 'returned_reversed_digit_number', operation: 'return opposite orientation', inputs: [original, reversed] }),
        candidate({ value: digitSum, correct, mistakeType: 'used_digit_sum_as_number', operation: 'use digit sum', inputs: [tens, ones] }),
        candidate({ value: Math.abs(signedDifference), correct, mistakeType: 'reversed_digit_subtraction_direction', operation: 'use digit difference result', inputs: [original, reversed] }),
        candidate({ value: tens, correct, mistakeType: 'ignored_digit_sum_condition', operation: 'use tens digit only', inputs: [tens, digitSum] }),
        candidate({ value: ones, correct, mistakeType: 'swapped_tens_ones_equations', operation: 'use ones digit only', inputs: [ones, digitSum] }),
        candidate({ value: 10 * digitSum + ones, correct, mistakeType: 'used_digit_sum_as_place_value', operation: 'use digit sum as tens digit', inputs: [digitSum, ones] }),
      ],
      explanationSteps: [`Write the original as 10a + b and the reverse as 10b + a.`, `Use a + b = ${digitSum} and 9(a - b) = ${signedDifference}.`, `The digits are ${tens} and ${ones}, so the requested number is ${correct}.`],
      validationKind: 'reversed-digit', parameters: { tens, ones, requested, digitSum, signedDifference }, canonicalSignature: `reversed-digit-problems|${tens}|${ones}|${requested}`,
    })
  }, validate: validateQuestion,
}

export const remainderNumberProblemsGenerator: QuestionGenerator = {
  slug: 'remainder-number-problems', version, title: 'Number and Remainder Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'remainder-number-problems' })
    if (input.difficulty === 'hard') {
      const firstDivisor = random.pick([3, 4, 5])
      const secondDivisor = random.pick([5, 7, 8])
      const knownSolution = random.integer(8, 80)
      const firstRemainder = knownSolution % firstDivisor
      const secondRemainder = knownSolution % secondDivisor
      const correct = smallestPositiveWithRemainders([{ divisor: firstDivisor, remainder: firstRemainder }, { divisor: secondDivisor, remainder: secondRemainder }], 500)
      if (correct === null) throw new Error('No controlled simultaneous remainder solution.')
      return buildQuestion({
        slug: 'remainder-number-problems', difficulty: input.difficulty, seed: input.seed,
        prompt: `Find the smallest positive number that leaves remainder ${firstRemainder} when divided by ${firstDivisor} and remainder ${secondRemainder} when divided by ${secondDivisor}.`, correct,
        candidates: [
          candidate({ value: firstDivisor + secondDivisor + firstRemainder + secondRemainder, correct, mistakeType: 'added_divisors_quotients_remainders', operation: 'add condition values', inputs: [firstDivisor, firstRemainder, secondDivisor, secondRemainder] }),
          candidate({ value: correct - firstRemainder, correct, mistakeType: 'omitted_remainder', operation: 'remove first remainder', inputs: [correct, firstRemainder] }),
          candidate({ value: correct + firstDivisor, correct, mistakeType: 'did_not_choose_smallest_remainder_solution', operation: 'choose later matching candidate', inputs: [correct, firstDivisor] }),
          candidate({ value: firstDivisor * secondDivisor, correct, mistakeType: 'ignored_remainder_condition', operation: 'use divisor product', inputs: [firstDivisor, secondDivisor] }),
          candidate({ value: correct + 1, correct, mistakeType: 'chose_wrong_remainder_number', operation: 'use adjacent nonmatching value', inputs: [correct, firstDivisor, secondDivisor] }),
        ],
        explanationSteps: [`Test positive values satisfying n = ${firstDivisor}q + ${firstRemainder}.`, `The first one also leaving remainder ${secondRemainder} on division by ${secondDivisor} is ${correct}.`, `Both remainder checks pass.`],
        validationKind: 'simultaneous-remainder', parameters: { firstDivisor, firstRemainder, secondDivisor, secondRemainder }, canonicalSignature: `remainder-number-problems|both|${firstDivisor}|${firstRemainder}|${secondDivisor}|${secondRemainder}`,
      })
    }
    const divisor = random.integer(3, 10)
    const remainder = random.integer(0, divisor - 1)
    const quotient = random.integer(3, 16)
    const correct = divisor * quotient + remainder
    return buildQuestion({
      slug: 'remainder-number-problems', difficulty: input.difficulty, seed: input.seed,
      prompt: `A number divided by ${divisor} has quotient ${quotient} and remainder ${remainder}. Find the number.`, correct,
      candidates: [
        candidate({ value: divisor * quotient, correct, mistakeType: 'omitted_remainder', operation: 'omit remainder', inputs: [divisor, quotient, remainder] }),
        candidate({ value: divisor + quotient + remainder, correct, mistakeType: 'added_divisors_quotients_remainders', operation: 'use d + q + r', inputs: [divisor, quotient, remainder] }),
        candidate({ value: quotient * remainder + divisor, correct, mistakeType: 'swapped_divisor_and_quotient', operation: 'swap divisor and remainder roles', inputs: [divisor, quotient, remainder] }),
        candidate({ value: divisor * (quotient + remainder), correct, mistakeType: 'multiplied_remainder_by_divisor', operation: 'multiply remainder by divisor', inputs: [divisor, quotient, remainder] }),
        candidate({ value: correct + divisor, correct, mistakeType: 'chose_wrong_remainder_number', operation: 'advance one quotient', inputs: [correct, divisor] }),
      ],
      explanationSteps: [`Use n = dq + r.`, `n = ${divisor} × ${quotient} + ${remainder} = ${correct}.`, `The remainder ${remainder} is less than the divisor ${divisor}.`],
      validationKind: 'quotient-remainder', parameters: { divisor, quotient, remainder }, canonicalSignature: `remainder-number-problems|single|${divisor}|${quotient}|${remainder}`,
    })
  }, validate: validateQuestion,
}

export const fractionalPartNumberProblemsGenerator: QuestionGenerator = {
  slug: 'fractional-part-number-problems', version, title: 'Fractional Parts of Numbers', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'fractional-part-number-problems' })
    const denominator = random.pick([2, 3, 4, 5, 6, 8])
    const numerator = random.integer(1, denominator - 1)
    const whole = denominator * random.integer(5, input.difficulty === 'hard' ? 24 : 16)
    const partValue = rationalToInteger(rational(whole * numerator, denominator))
    if (partValue === null) throw new Error('Fractional part is not an integer.')
    const correct = rationalToInteger(divideByRational(partValue, rational(numerator, denominator)))
    if (correct === null) throw new Error('Whole is not an integer.')
    return buildQuestion({
      slug: 'fractional-part-number-problems', difficulty: input.difficulty, seed: input.seed,
      prompt: `${numerator}/${denominator} of a number is ${partValue}. Find the number.`, correct,
      candidates: [
        candidate({ value: partValue, correct, mistakeType: 'returned_fractional_part_instead_of_whole', operation: 'return known part', inputs: [partValue] }),
        candidate({ value: partValue * numerator, correct, mistakeType: 'multiplied_when_fraction_division_required', operation: 'multiply by numerator', inputs: [partValue, numerator] }),
        candidate({ value: partValue * denominator, correct, mistakeType: 'used_fraction_denominator_only', operation: 'multiply by denominator only', inputs: [partValue, denominator] }),
        candidate({ value: Math.trunc(partValue * numerator / denominator), correct, mistakeType: 'found_fractional_part_twice', operation: 'take the fraction again', inputs: [partValue, numerator, denominator] }),
        candidate({ value: Math.trunc(partValue * numerator / Math.max(1, denominator - numerator)), correct, mistakeType: 'reversed_fraction_relationship', operation: 'reverse or complement fraction relation', inputs: [partValue, numerator, denominator] }),
        candidate({ value: partValue + denominator, correct, mistakeType: 'added_fraction_components', operation: 'add denominator to part', inputs: [partValue, denominator] }),
      ],
      explanationSteps: [`Translate the statement as (${numerator}/${denominator})x = ${partValue}.`, `Divide by ${numerator}/${denominator}, or multiply by ${denominator}/${numerator}.`, `x = ${correct}.`],
      validationKind: 'fractional-part', parameters: { numerator, denominator, part: partValue }, canonicalSignature: `fractional-part-number-problems|${numerator}|${denominator}|${partValue}`,
    })
  }, validate: validateQuestion,
}

export const mixedNumberRelationshipsGenerator: QuestionGenerator = {
  slug: 'mixed-number-relationships', version, title: 'Mixed Number Relationship Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'mixed-number-relationships' })
    const structure = random.pick(['multiple', 'digits', 'remainder'] as const)
    if (structure === 'digits') {
      const ones = random.integer(1, 6)
      const tens = ones + random.integer(1, Math.min(3, 9 - ones))
      const correct = constructTwoDigitNumber(tens, ones)
      return buildQuestion({
        slug: 'mixed-number-relationships', difficulty: input.difficulty, seed: input.seed,
        prompt: `A two-digit number has digit sum ${tens + ones}; its tens digit is ${tens - ones} greater than its ones digit. Find the number and verify both conditions.`, correct,
        candidates: [
          candidate({ value: constructTwoDigitNumber(ones, tens), correct, mistakeType: 'returned_reversed_digit_number', operation: 'return reverse', inputs: [tens, ones] }),
          candidate({ value: tens + ones, correct, mistakeType: 'used_digit_sum_as_number', operation: 'use digit sum', inputs: [tens, ones] }),
          candidate({ value: tens, correct, mistakeType: 'satisfied_only_digit_relationship', operation: 'return tens digit', inputs: [tens] }),
          candidate({ value: correct + (tens + ones), correct, mistakeType: 'confused_digit_sum_with_number_value', operation: 'add digit sum to number', inputs: [correct, tens, ones] }),
          candidate({ value: 10 * (tens - ones) + ones, correct, mistakeType: 'ignored_digit_sum_condition', operation: 'use difference as tens digit', inputs: [tens, ones] }),
        ],
        explanationSteps: [`Let the number be 10a + b. Use a + b = ${tens + ones} and a - b = ${tens - ones}.`, `This gives a = ${tens}, b = ${ones}.`, `The number is ${correct}, which satisfies both conditions.`],
        validationKind: 'two-digit', parameters: { tens, ones }, canonicalSignature: `mixed-number-relationships|digits|${tens}|${ones}`,
      })
    }
    if (structure === 'remainder') {
      const divisor = random.integer(4, 9)
      const remainder = random.integer(1, divisor - 1)
      const quotient = random.integer(5, 12)
      const correct = divisor * quotient + remainder
      return buildQuestion({
        slug: 'mixed-number-relationships', difficulty: input.difficulty, seed: input.seed,
        prompt: `A number is between ${correct - 3} and ${correct + 3}. When divided by ${divisor}, it has quotient ${quotient} and remainder ${remainder}. Find the number.`, correct,
        candidates: [
          candidate({ value: divisor * quotient, correct, mistakeType: 'omitted_remainder', operation: 'omit remainder', inputs: [divisor, quotient, remainder] }),
          candidate({ value: divisor + quotient + remainder, correct, mistakeType: 'added_divisors_quotients_remainders', operation: 'add values', inputs: [divisor, quotient, remainder] }),
          candidate({ value: correct + divisor, correct, mistakeType: 'ignored_range_constraint', operation: 'choose later congruent number', inputs: [correct, divisor] }),
          candidate({ value: correct - divisor, correct, mistakeType: 'ignored_range_constraint', operation: 'choose earlier congruent number', inputs: [correct, divisor] }),
          candidate({ value: correct + 1, correct, mistakeType: 'chose_wrong_remainder_number', operation: 'choose adjacent value', inputs: [correct] }),
        ],
        explanationSteps: [`Use n = ${divisor}q + ${remainder} with q = ${quotient}.`, `n = ${divisor} × ${quotient} + ${remainder} = ${correct}.`, `It lies inside the stated range and has the correct remainder.`],
        validationKind: 'quotient-remainder', parameters: { divisor, quotient, remainder }, canonicalSignature: `mixed-number-relationships|remainder|${divisor}|${quotient}|${remainder}`,
      })
    }
    const multiplier = random.integer(2, 5)
    const smaller = random.integer(5, 18)
    const condition = random.pick(['sum', 'difference'] as const)
    const larger = multiplier * smaller
    const conditionValue = condition === 'sum' ? larger + smaller : larger - smaller
    return buildQuestion({
      slug: 'mixed-number-relationships', difficulty: input.difficulty, seed: input.seed,
      prompt: `The larger of two positive integers is ${multiplier} times the smaller, and their ${condition} is ${conditionValue}. Find the larger integer.`, correct: larger,
      candidates: [
        candidate({ value: smaller, correct: larger, mistakeType: 'returned_smaller_instead_of_larger', operation: 'return smaller', inputs: [smaller, larger] }),
        candidate({ value: conditionValue, correct: larger, mistakeType: 'used_relationship_total_as_answer', operation: 'use condition value', inputs: [conditionValue] }),
        candidate({ value: multiplier, correct: larger, mistakeType: 'used_multiplier_as_number_answer', operation: 'use multiplier', inputs: [multiplier] }),
        candidate({ value: conditionValue - multiplier, correct: larger, mistakeType: 'treated_times_as_addition', operation: 'treat multiple as addition', inputs: [conditionValue, multiplier] }),
        candidate({ value: larger + smaller, correct: larger, mistakeType: 'ignored_requested_value', operation: 'return pair sum', inputs: [larger, smaller] }),
        candidate({ value: larger - multiplier, correct: larger, mistakeType: 'treated_times_as_addition', operation: 'subtract multiplier from larger value', inputs: [larger, multiplier] }),
        candidate({ value: smaller + multiplier, correct: larger, mistakeType: 'treated_times_as_addition', operation: 'add multiplier to smaller value', inputs: [smaller, multiplier] }),
        candidate({ value: Math.trunc(conditionValue / (multiplier + 1)), correct: larger, mistakeType: 'returned_smaller_instead_of_larger', operation: 'solve for smaller and stop', inputs: [conditionValue, multiplier] }),
      ],
      explanationSteps: [`Let the smaller number be x; the larger is ${multiplier}x.`, condition === 'sum' ? `${multiplier}x + x = ${conditionValue}.` : `${multiplier}x - x = ${conditionValue}.`, `x = ${smaller}, so the requested larger number is ${larger}.`],
      validationKind: 'multiple-relationship', parameters: { multiplier, condition, conditionValue }, canonicalSignature: `mixed-number-relationships|multiple|${multiplier}|${condition}|${conditionValue}`,
    })
  }, validate: validateQuestion,
}

export const numberProblemGenerators = [
  consecutiveIntegersGenerator,
  consecutiveOddEvenIntegersGenerator,
  sumDifferenceNumbersGenerator,
  productQuotientNumbersGenerator,
  twoDigitNumberProblemsGenerator,
  reversedDigitProblemsGenerator,
  remainderNumberProblemsGenerator,
  fractionalPartNumberProblemsGenerator,
  mixedNumberRelationshipsGenerator,
] as const satisfies readonly QuestionGenerator[]
