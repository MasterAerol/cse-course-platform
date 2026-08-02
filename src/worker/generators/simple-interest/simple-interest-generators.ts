import { addFractions, divideFractions, fractionsEqual, multiplyFractions, subtractFractions } from '../../domain/fractions/fraction-math'
import { chooseInterestDistractors, interestDistractor, type InterestDistractor } from '../../domain/simple-interest/simple-interest-distractors'
import { formatInterestAnswer, formatMoneyFromCentavos, interestToNumber } from '../../domain/simple-interest/simple-interest-format'
import {
  annualRateFromInterest,
  compareInterestOptions,
  daysToYears,
  interestFromMaturity,
  interestRational,
  maturityValue,
  monthsToYears,
  percentToAnnualRate,
  principalFromInterest,
  roundMoneyCentavos,
  simpleInterest,
  timeFromInterest,
} from '../../domain/simple-interest/simple-interest-math'
import { hasUniqueInterestValues, isPositiveInterestValue, isWholeCentavos } from '../../domain/simple-interest/simple-interest-validation'
import type { DayCountBasis, InterestAnswerUnit, InterestRational } from '../../domain/simple-interest/simple-interest.types'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty) {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function parseRational(parameters: Record<string, unknown>, key: string): InterestRational {
  const value = parameters[key]
  if (typeof value !== 'object' || value === null || !('numerator' in value) || !('denominator' in value) || typeof value.numerator !== 'number' || typeof value.denominator !== 'number') throw new Error(`Invalid rational parameter ${key}.`)
  return interestRational(value.numerator, value.denominator)
}

function parseString(parameters: Record<string, unknown>, key: string): string {
  const value = parameters[key]
  if (typeof value !== 'string') throw new Error(`Invalid string parameter ${key}.`)
  return value
}

function parseNumber(parameters: Record<string, unknown>, key: string): number {
  const value = parameters[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid numeric parameter ${key}.`)
  return value
}

const money = (pesos: number): InterestRational => interestRational(pesos * 100)
const roundedMoney = (value: InterestRational): InterestRational => interestRational(roundMoneyCentavos(value))

function timeSpec(random: ReturnType<typeof randomFor>, difficulty: GeneratorDifficulty): { years: InterestRational; label: string; kind: 'years' | 'months' | 'days'; sourceValue: number; basis: DayCountBasis | null } {
  if (difficulty === 'easy') { const years = random.integer(1, 4); return { years: interestRational(years), label: `${years} year${years === 1 ? '' : 's'}`, kind: 'years', sourceValue: years, basis: null } }
  if (difficulty === 'medium') { const months = random.pick([6, 9, 18, 24, 30]); return { years: monthsToYears(months), label: `${months} months`, kind: 'months', sourceValue: months, basis: null } }
  const basis = random.pick([360, 365] as const); const days = basis === 360 ? random.pick([60, 90, 120, 180]) : random.pick([73, 146, 219]); return { years: daysToYears(days, basis), label: `${days} days using a ${basis}-day year`, kind: 'days', sourceValue: days, basis }
}

function build(input: { slug: GeneratorSlug; seed: string; difficulty: GeneratorDifficulty; prompt: string; correct: InterestRational; unit: InterestAnswerUnit; candidates: readonly (InterestDistractor | null)[]; parameters: Record<string, unknown>; steps: string[]; signature: string }): GeneratedQuestion {
  const format = (value: InterestRational) => formatInterestAnswer(value, input.unit)
  const distractors = chooseInterestDistractors({ correct: input.correct, candidates: input.candidates, format })
  const choices = [
    { text: format(input.correct), isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: interestToNumber(input.correct) },
    ...distractors.map((item) => ({ text: format(item.value), isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.operation, inputs: item.inputs }, qualityScore: item.qualityScore, numericValue: interestToNumber(item.value) })),
  ]
  return { generatorSlug: input.slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: input.prompt, parameters: { ...input.parameters, correct: input.correct, answerUnit: input.unit }, choices: randomFor(input.seed, input.slug, input.difficulty).shuffle(choices), explanation: { title: 'Simple-interest solution', steps: input.steps, finalAnswer: format(input.correct) }, metadata: { answerKind: input.unit === 'money' || input.unit.includes('money') ? 'money' : input.unit === 'percent' ? 'percent' : 'number', unit: input.unit, canonicalSignature: input.signature } }
}

export function recomputeSimpleInterestAnswer(question: GeneratedQuestion): InterestRational {
  const p = question.parameters
  switch (question.generatorSlug) {
    case 'simple-interest': return simpleInterest(parseRational(p, 'principal'), parseRational(p, 'rate'), parseRational(p, 'timeYears'))
    case 'principal-from-interest': return principalFromInterest(parseRational(p, 'interest'), parseRational(p, 'rate'), parseRational(p, 'timeYears'))
    case 'rate-from-interest': return annualRateFromInterest(parseRational(p, 'interest'), parseRational(p, 'principal'), parseRational(p, 'timeYears'))
    case 'time-from-interest': {
      const years = timeFromInterest(parseRational(p, 'interest'), parseRational(p, 'principal'), parseRational(p, 'rate'))
      return parseString(p, 'answerUnit') === 'months' ? multiplyFractions(years, interestRational(12)) : years
    }
    case 'maturity-value': return maturityValue(parseRational(p, 'principal'), simpleInterest(parseRational(p, 'principal'), parseRational(p, 'rate'), parseRational(p, 'timeYears')))
    case 'interest-time-conversions': {
      const kind = parseString(p, 'conversionKind'); const sourceValue = parseNumber(p, 'sourceValue')
      if (kind === 'months') return monthsToYears(sourceValue)
      if (kind === 'days') return daysToYears(sourceValue, parseNumber(p, 'basis') as DayCountBasis)
      throw new Error('Unsupported interest time conversion.')
    }
    case 'compare-interest-options': return compareInterestOptions({ principalCentavos: parseRational(p, 'firstPrincipal'), annualRate: parseRational(p, 'firstRate'), timeYears: parseRational(p, 'firstTime') }, { principalCentavos: parseRational(p, 'secondPrincipal'), annualRate: parseRational(p, 'secondRate'), timeYears: parseRational(p, 'secondTime') }).differenceCentavos
    case 'loan-savings-applications': return maturityValue(parseRational(p, 'principal'), simpleInterest(parseRational(p, 'principal'), parseRational(p, 'rate'), parseRational(p, 'timeYears')))
    case 'mixed-simple-interest': return principalFromInterest(interestFromMaturity(parseRational(p, 'maturity'), parseRational(p, 'principal')), parseRational(p, 'rate'), parseRational(p, 'timeYears'))
    default: throw new Error('Question does not belong to the simple-interest generator family.')
  }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const correct = parseRational(question.parameters, 'correct'); const recomputed = recomputeSimpleInterestAnswer(question); const unit = parseString(question.parameters, 'answerUnit')
    const values = question.choices.map((choice) => interestRational(Math.round(choice.numericValue * 1_000_000), 1_000_000))
    const moneyAnswer = unit === 'money' || unit.includes('money')
    const dayKindValid = question.parameters.timeKind !== 'days' || question.parameters.dayCountBasis === 360 || question.parameters.dayCountBasis === 365
    const valid = fractionsEqual(correct, recomputed) && isPositiveInterestValue(correct) && (!moneyAnswer || isWholeCentavos(correct)) && dayKindValid && question.choices.length === 4 && question.choices.filter((choice) => choice.isCorrect).length === 1 && new Set(question.choices.map((choice) => choice.text)).size === 4 && hasUniqueInterestValues(values) && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null) && question.prompt.length > 25 && question.explanation.steps.length >= 3 && !question.prompt.toLowerCase().includes('compound')
    return { valid, reason: valid ? null : 'The generated simple-interest question failed exact validation.' }
  } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid simple-interest question.' } }
}

function baseParameters(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty) {
  const random = randomFor(seed, slug, difficulty); const principal = money(random.integer(1, 6) * 15_000); const rateBasisPoints = random.pick([300, 400, 450, 500, 600, 750]); const rate = percentToAnnualRate(rateBasisPoints); const time = timeSpec(random, difficulty); const interest = simpleInterest(principal, rate, time.years)
  return { random, principal, rateBasisPoints, rate, time, interest }
}

const simpleInterestGenerator: QuestionGenerator = { slug: 'simple-interest', version, title: 'Simple Interest', supportedDifficulties, generate(input) {
  const base = baseParameters(input.seed, 'simple-interest', input.difficulty); const correct = base.interest; const maturity = maturityValue(base.principal, correct); const unnormalizedTime = simpleInterest(base.principal, base.rate, interestRational(base.time.sourceValue))
  return build({ slug: 'simple-interest', ...input, prompt: `Find the simple interest on ${formatMoneyFromCentavos(base.principal)} at ${base.rateBasisPoints / 100}% per year for ${base.time.label}.`, correct, unit: 'money', candidates: [interestDistractor(roundedMoney(multiplyFractions(correct, interestRational(100))), 'interest_rate_not_converted_to_decimal', 'use percent as a whole number', [base.rateBasisPoints]), interestDistractor(roundedMoney(unnormalizedTime), 'interest_time_not_converted_to_years', 'use stated time directly as years', [base.time.sourceValue]), interestDistractor(maturity, 'returned_maturity_value_as_interest', 'add principal to interest', [interestToNumber(base.principal), interestToNumber(correct)]), interestDistractor(roundedMoney(multiplyFractions(correct, base.rate)), 'applied_interest_rate_twice', 'apply annual rate twice', [interestToNumber(correct), base.rateBasisPoints])], parameters: { principal: base.principal, rate: base.rate, timeYears: base.time.years, timeKind: base.time.kind, dayCountBasis: base.time.basis }, steps: [`Convert the annual rate to ${base.rate.numerator}/${base.rate.denominator} and normalize ${base.time.label} to years.`, 'Use I = Prt with the original principal only.', `The simple interest is ${formatMoneyFromCentavos(correct)}; do not add the principal unless maturity value is requested.`], signature: `interest|${base.principal.numerator}|${base.rateBasisPoints}|${base.time.years.numerator}/${base.time.years.denominator}` })
}, validate: validateQuestion }

const principalGenerator: QuestionGenerator = { slug: 'principal-from-interest', version, title: 'Principal from Interest', supportedDifficulties, generate(input) {
  const base = baseParameters(input.seed, 'principal-from-interest', input.difficulty); const correct = base.principal
  return build({ slug: 'principal-from-interest', ...input, prompt: `An account earned ${formatMoneyFromCentavos(base.interest)} at ${base.rateBasisPoints / 100}% annual simple interest for ${base.time.label}. What was the original principal?`, correct, unit: 'money', candidates: [interestDistractor(roundedMoney(multiplyFractions(multiplyFractions(base.interest, base.rate), base.time.years)), 'multiplied_instead_of_divided_interest_formula', 'multiply I by r and t', [interestToNumber(base.interest), base.rateBasisPoints]), interestDistractor(roundedMoney(divideFractions(base.interest, base.rate)), 'omitted_interest_time_factor', 'divide by rate but omit time', [interestToNumber(base.interest), base.rateBasisPoints]), interestDistractor(roundedMoney(divideFractions(base.interest, base.time.years)), 'omitted_interest_rate_factor', 'divide by time but omit rate', [interestToNumber(base.interest), interestToNumber(base.time.years)]), interestDistractor(roundedMoney(divideFractions(base.interest, multiplyFractions(base.rate, interestRational(100)))), 'used_whole_number_interest_rate', 'use whole-number percent in denominator', [base.rateBasisPoints])], parameters: { interest: base.interest, rate: base.rate, timeYears: base.time.years, timeKind: base.time.kind, dayCountBasis: base.time.basis }, steps: ['Identify the known interest, annual decimal rate, and time in years.', 'Rearrange I = Prt to P = I ÷ (rt).', `The original principal is ${formatMoneyFromCentavos(correct)}.`], signature: `principal|${base.interest.numerator}/${base.interest.denominator}|${base.rateBasisPoints}|${base.time.years.numerator}/${base.time.years.denominator}` })
}, validate: validateQuestion }

const rateGenerator: QuestionGenerator = { slug: 'rate-from-interest', version, title: 'Rate from Interest', supportedDifficulties, generate(input) {
  const base = baseParameters(input.seed, 'rate-from-interest', input.difficulty); const correct = base.rate; const omittedTime = annualRateFromInterest(base.interest, base.principal, interestRational(1)); const wrongMaturity = annualRateFromInterest(maturityValue(base.principal, base.interest), base.principal, base.time.years)
  return build({ slug: 'rate-from-interest', ...input, prompt: `${formatMoneyFromCentavos(base.principal)} earned ${formatMoneyFromCentavos(base.interest)} in ${base.time.label} under simple interest. Find the annual interest rate.`, correct, unit: 'percent', candidates: [interestDistractor(divideFractions(correct, interestRational(100)), 'left_decimal_rate_as_percent', 'display decimal without converting to percent', [interestToNumber(correct)]), interestDistractor(multiplyFractions(correct, interestRational(100)), 'converted_interest_rate_twice', 'multiply the decimal rate by 100 twice', [interestToNumber(correct)]), interestDistractor(omittedTime, 'used_wrong_interest_denominator', 'omit time from I divided by Pt', [interestToNumber(base.interest), interestToNumber(base.principal)]), interestDistractor(wrongMaturity, 'returned_maturity_value_as_interest', 'use maturity value in place of interest', [interestToNumber(base.principal), interestToNumber(base.interest)])], parameters: { interest: base.interest, principal: base.principal, timeYears: base.time.years, timeKind: base.time.kind, dayCountBasis: base.time.basis }, steps: ['Normalize time to years and keep interest separate from maturity value.', 'Use r = I ÷ (Pt), keeping r as an exact decimal rate.', `Convert once to an annual percentage: ${formatInterestAnswer(correct, 'percent')}.`], signature: `rate|${base.principal.numerator}|${base.interest.numerator}/${base.interest.denominator}|${base.time.years.numerator}/${base.time.years.denominator}` })
}, validate: validateQuestion }

const timeGenerator: QuestionGenerator = { slug: 'time-from-interest', version, title: 'Time from Interest', supportedDifficulties, generate(input) {
  const base = baseParameters(input.seed, 'time-from-interest', input.difficulty); const answerInMonths = input.difficulty !== 'easy'; const correct = answerInMonths ? multiplyFractions(base.time.years, interestRational(12)) : base.time.years; const unit: InterestAnswerUnit = answerInMonths ? 'months' : 'years'
  const unconverted = answerInMonths ? base.time.years : multiplyFractions(correct, interestRational(12))
  return build({ slug: 'time-from-interest', ...input, prompt: `How many ${unit} will ${formatMoneyFromCentavos(base.principal)} take to earn ${formatMoneyFromCentavos(base.interest)} at ${base.rateBasisPoints / 100}% annual simple interest?`, correct, unit, candidates: [interestDistractor(unconverted, 'returned_years_instead_of_months', answerInMonths ? 'return normalized years without requested month conversion' : 'treat years as a month count', [interestToNumber(base.time.years)]), interestDistractor(divideFractions(correct, interestRational(100)), 'used_whole_number_interest_rate', 'use whole-number percent instead of decimal rate', [base.rateBasisPoints]), interestDistractor(divideFractions(interestRational(1), correct), 'inverted_work_rate_incorrectly', 'invert the solved time', [interestToNumber(correct)]), interestDistractor(multiplyFractions(correct, interestRational(12)), 'interest_time_not_converted_to_years', 'apply an extra month conversion', [interestToNumber(correct)]), interestDistractor(divideFractions(correct, interestRational(12)), 'interest_time_not_converted_to_years', 'divide by the month factor in the wrong direction', [interestToNumber(correct)])], parameters: { interest: base.interest, principal: base.principal, rate: base.rate, answerUnit: unit, timeKind: base.time.kind, dayCountBasis: base.time.basis }, steps: ['Use the annual decimal rate and keep the requested time unit visible.', 'Rearrange I = Prt to t = I ÷ (Pr).', `Convert the exact year result only once when months are requested: ${formatInterestAnswer(correct, unit)}.`], signature: `time|${base.principal.numerator}|${base.rateBasisPoints}|${base.interest.numerator}/${base.interest.denominator}|${unit}` })
}, validate: validateQuestion }

function maturityQuestion(slug: 'maturity-value' | 'loan-savings-applications', input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const base = baseParameters(input.seed, slug, input.difficulty); const correct = maturityValue(base.principal, base.interest); const compoundLike = roundedMoney(multiplyFractions(base.principal, addFractions(interestRational(1), multiplyFractions(base.rate, multiplyFractions(base.time.years, addFractions(interestRational(1), base.rate))))))
  const context = slug === 'loan-savings-applications' ? 'A saver places' : 'Find the maturity value of'
  return build({ slug, ...input, prompt: `${context} ${formatMoneyFromCentavos(base.principal)} at ${base.rateBasisPoints / 100}% annual simple interest for ${base.time.label}. What total amount is due at maturity?`, correct, unit: 'money', candidates: [interestDistractor(base.interest, 'returned_interest_instead_of_maturity', 'return interest only', [interestToNumber(base.interest)]), interestDistractor(addFractions(correct, base.principal), 'added_interest_principal_twice', 'add principal twice', [interestToNumber(base.principal), interestToNumber(base.interest)]), interestDistractor(compoundLike, 'used_compound_growth_for_simple_interest', 'apply rate to a growing balance', [interestToNumber(base.principal), base.rateBasisPoints]), interestDistractor(subtractFractions(base.principal, base.interest), 'returned_maturity_value_as_interest', 'subtract interest from principal', [interestToNumber(base.principal), interestToNumber(base.interest)])], parameters: { principal: base.principal, rate: base.rate, timeYears: base.time.years, timeKind: base.time.kind, dayCountBasis: base.time.basis }, steps: ['Normalize the annual rate and time, then calculate I = Prt on the original principal.', 'Use A = P + I; simple interest does not change the interest-bearing principal.', `The maturity value is ${formatMoneyFromCentavos(correct)}.`], signature: `${slug}|${base.principal.numerator}|${base.rateBasisPoints}|${base.time.years.numerator}/${base.time.years.denominator}` })
}

const maturityGenerator: QuestionGenerator = { slug: 'maturity-value', version, title: 'Maturity Value', supportedDifficulties, generate(input) { return maturityQuestion('maturity-value', input) }, validate: validateQuestion }
const loanGenerator: QuestionGenerator = { slug: 'loan-savings-applications', version, title: 'Loan and Savings Applications', supportedDifficulties, generate(input) { return maturityQuestion('loan-savings-applications', input) }, validate: validateQuestion }

const conversionGenerator: QuestionGenerator = { slug: 'interest-time-conversions', version, title: 'Interest Time Conversions', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'interest-time-conversions', input.difficulty); const useDays = input.difficulty === 'hard' || (input.difficulty === 'medium' && random.integer(0, 1) === 1); let correct: InterestRational; let prompt: string; let parameters: Record<string, unknown>; let direct: InterestRational; let wrongBasis: InterestRational
  if (useDays) { const basis = random.pick([360, 365] as const); const days = basis === 360 ? random.pick([60, 90, 120, 180]) : random.pick([73, 146, 219]); correct = daysToYears(days, basis); prompt = `For a simple-interest calculation, convert ${days} days to years using the explicitly stated ${basis}-day basis.`; parameters = { conversionKind: 'days', sourceValue: days, basis, timeKind: 'days', dayCountBasis: basis }; direct = interestRational(days); wrongBasis = daysToYears(days, basis === 360 ? 365 : 360) }
  else { const months = random.pick([6, 9, 15, 18, 24, 30]); correct = monthsToYears(months); prompt = `Convert ${months} months to years before using an annual simple-interest rate.`; parameters = { conversionKind: 'months', sourceValue: months, basis: null, timeKind: 'months', dayCountBasis: null }; direct = interestRational(months); wrongBasis = interestRational(months, 100) }
  const basisSignature = typeof parameters.basis === 'number' ? String(parameters.basis) : 'none'
  return build({ slug: 'interest-time-conversions', ...input, prompt, correct, unit: 'years', candidates: [interestDistractor(direct, 'used_interest_months_directly', 'use stated duration directly as years', [interestToNumber(direct)]), interestDistractor(wrongBasis, useDays ? 'used_wrong_day_count_basis' : 'divided_interest_months_by_100', useDays ? 'divide days by the other convention' : 'divide months by 100', [interestToNumber(direct)]), interestDistractor(divideFractions(correct, interestRational(10)), 'rounded_interest_time_too_early', 'misplace the decimal while converting time', [interestToNumber(correct)]), interestDistractor(multiplyFractions(correct, interestRational(12)), 'interest_time_not_converted_to_years', 'apply the wrong month factor', [interestToNumber(correct)])], parameters, steps: ['Read the stated time unit and, for days, the explicit day-count basis.', useDays ? 'Divide days by exactly the stated 360- or 365-day basis.' : 'Divide months by 12, not by 100.', `Keep the exact result through the interest calculation: ${formatInterestAnswer(correct, 'years')}.`], signature: `conversion|${parseString(parameters, 'conversionKind')}|${parseNumber(parameters, 'sourceValue')}|${basisSignature}` })
}, validate: validateQuestion }

const compareGenerator: QuestionGenerator = { slug: 'compare-interest-options', version, title: 'Compare Simple-Interest Options', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'compare-interest-options', input.difficulty); const principal = money(random.integer(1, 5) * 10_000); const firstRate = percentToAnnualRate(500); const secondRate = percentToAnnualRate(450); const firstTime = interestRational(2); const secondTime = monthsToYears(30); const comparison = compareInterestOptions({ principalCentavos: principal, annualRate: firstRate, timeYears: firstTime }, { principalCentavos: principal, annualRate: secondRate, timeYears: secondTime }); const correct = comparison.differenceCentavos
  const ignoredTimeDifference = subtractFractions(simpleInterest(principal, firstRate, interestRational(1)), simpleInterest(principal, secondRate, interestRational(1)))
  return build({ slug: 'compare-interest-options', ...input, prompt: `Option A invests ${formatMoneyFromCentavos(principal)} at 5% simple interest for 2 years. Option B invests the same principal at 4.5% for 30 months. Which earns more interest, and by how much?`, correct, unit: 'option-b-money', candidates: [interestDistractor(comparison.firstInterestCentavos, 'chose_higher_rate_without_full_comparison', 'choose higher rate and report its interest', [500, 2]), interestDistractor(maturityValue(principal, comparison.secondInterestCentavos), 'compared_interest_with_maturity_value', 'compare maturity value with interest', [interestToNumber(principal), interestToNumber(comparison.secondInterestCentavos)]), interestDistractor(ignoredTimeDifference, 'interest_time_not_converted_to_years', 'compare one-year interest only', [500, 450]), interestDistractor(comparison.secondInterestCentavos, 'ignored_interest_principal_difference', 'return winning interest instead of difference', [interestToNumber(comparison.secondInterestCentavos)])], parameters: { firstPrincipal: principal, firstRate, firstTime, secondPrincipal: principal, secondRate, secondTime: secondTime }, steps: ['Normalize 30 months to 2.5 years and calculate each option with I = Prt.', `Option A earns ${formatMoneyFromCentavos(comparison.firstInterestCentavos)} and Option B earns ${formatMoneyFromCentavos(comparison.secondInterestCentavos)}.`, `Compare like quantities: ${formatInterestAnswer(correct, 'option-b-money')}.`], signature: `compare|${principal.numerator}` })
}, validate: validateQuestion }

const mixedGenerator: QuestionGenerator = { slug: 'mixed-simple-interest', version, title: 'Mixed Simple Interest', supportedDifficulties, generate(input) {
  const base = baseParameters(input.seed, 'mixed-simple-interest', input.difficulty); const maturity = maturityValue(base.principal, base.interest); const correct = base.principal
  return build({ slug: 'mixed-simple-interest', ...input, prompt: `A simple-interest loan matures to ${formatMoneyFromCentavos(maturity)} after ${base.time.label} at ${base.rateBasisPoints / 100}% per year. The interest portion is ${formatMoneyFromCentavos(base.interest)}. Find the original principal.`, correct, unit: 'money', candidates: [interestDistractor(maturity, 'returned_maturity_value_as_interest', 'return maturity value as principal', [interestToNumber(maturity)]), interestDistractor(base.interest, 'returned_interest_instead_of_maturity', 'return interest as principal', [interestToNumber(base.interest)]), interestDistractor(subtractFractions(maturity, base.principal), 'used_wrong_interest_denominator', 'subtract the wrong amount from maturity', [interestToNumber(maturity), interestToNumber(base.principal)]), interestDistractor(roundedMoney(multiplyFractions(base.interest, multiplyFractions(base.rate, base.time.years))), 'multiplied_instead_of_divided_interest_formula', 'multiply interest by rate and time', [interestToNumber(base.interest), base.rateBasisPoints])], parameters: { maturity, principal: base.principal, rate: base.rate, timeYears: base.time.years, timeKind: base.time.kind, dayCountBasis: base.time.basis }, steps: ['Separate maturity value from the stated interest and normalize time.', 'Verify the interest with I = Prt, then use A = P + I.', `The original principal is ${formatMoneyFromCentavos(correct)}; adding its verified interest reproduces the maturity value.`], signature: `mixed-interest|${base.principal.numerator}|${base.rateBasisPoints}|${base.time.years.numerator}/${base.time.years.denominator}` })
}, validate: validateQuestion }

export const simpleInterestGenerators = [simpleInterestGenerator, principalGenerator, rateGenerator, timeGenerator, maturityGenerator, conversionGenerator, compareGenerator, loanGenerator, mixedGenerator] as const satisfies readonly QuestionGenerator[]
