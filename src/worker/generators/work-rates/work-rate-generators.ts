import {
  addFractions,
  divideFractions,
  fractionsEqual,
  subtractFractions,
} from '../../domain/fractions/fraction-math'
import {
  chooseWorkRateDistractors,
  workRateDistractor,
  type WorkRateDistractor,
} from '../../domain/work-rates/work-rate-distractors'
import {
  formatHours,
  formatWorkRateAnswer,
  rationalToNumber,
} from '../../domain/work-rates/work-rate-format'
import {
  WHOLE_JOB,
  combinedRates,
  efficiencyRate,
  individualRate,
  opposingNetRate,
  rateFromWorkAndTime,
  rational,
  remainingWork,
  solveUnknownRate,
  timeFromWorkAndRate,
  workFromRateAndTime,
} from '../../domain/work-rates/work-rate-math'
import { hasUniqueRationalValues, isPositiveRational } from '../../domain/work-rates/work-rate-validation'
import type { Rational, WorkRateAnswerUnit } from '../../domain/work-rates/work-rate.types'
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

interface BuildInput {
  slug: GeneratorSlug
  seed: string
  difficulty: GeneratorDifficulty
  prompt: string
  correct: Rational
  unit: WorkRateAnswerUnit
  candidates: readonly (WorkRateDistractor | null)[]
  steps: string[]
  parameters: Record<string, unknown>
  signature: string
}

function randomFor(input: { seed: string; slug: GeneratorSlug; difficulty: GeneratorDifficulty }): SeededRandom {
  return createSeededRandom(`${input.seed}|${input.slug}|${version}|${input.difficulty}`)
}

function parseRational(parameters: Record<string, unknown>, key: string): Rational {
  const value = parameters[key]
  if (
    typeof value !== 'object' || value === null ||
    !('numerator' in value) || !('denominator' in value)
  ) throw new Error(`Missing rational parameter ${key}.`)
  const numerator = value.numerator
  const denominator = value.denominator
  if (typeof numerator !== 'number' || typeof denominator !== 'number') throw new Error(`Invalid rational parameter ${key}.`)
  return rational(numerator, denominator)
}

function numberParameter(parameters: Record<string, unknown>, key: string): number {
  const value = parameters[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid numeric parameter ${key}.`)
  return value
}

function formatFor(unit: WorkRateAnswerUnit): (value: Rational) => string {
  return unit === 'hours' ? formatHours : (value) => formatWorkRateAnswer(value, unit)
}

function buildQuestion(input: BuildInput): GeneratedQuestion {
  const format = formatFor(input.unit)
  const distractors = chooseWorkRateDistractors({ correct: input.correct, candidates: input.candidates, format })
  const correctChoice: GeneratedChoice = {
    text: format(input.correct), isCorrect: true, distractorType: null, mistakeType: null,
    derivation: null, qualityScore: 1, numericValue: rationalToNumber(input.correct),
  }
  const wrongChoices: GeneratedChoice[] = distractors.map((item) => ({
    text: format(item.value), isCorrect: false, distractorType: item.mistakeType,
    mistakeType: item.mistakeType, derivation: { operation: item.operation, inputs: item.inputs },
    qualityScore: item.qualityScore, numericValue: rationalToNumber(item.value),
  }))
  const random = randomFor({ seed: input.seed, slug: input.slug, difficulty: input.difficulty })
  return {
    generatorSlug: input.slug, generatorVersion: version, difficulty: input.difficulty,
    seed: input.seed, prompt: input.prompt,
    parameters: { ...input.parameters, correct: input.correct, answerUnit: input.unit },
    choices: random.shuffle([correctChoice, ...wrongChoices]),
    explanation: { title: 'Work-rate solution', steps: input.steps, finalAnswer: format(input.correct) },
    metadata: { answerKind: input.unit === 'hours' ? 'number' : 'fraction', unit: input.unit, canonicalSignature: input.signature },
  }
}

export function recomputeWorkRateAnswer(question: GeneratedQuestion): Rational {
  const p = question.parameters
  switch (question.generatorSlug) {
    case 'individual-work-rate':
      return rateFromWorkAndTime(parseRational(p, 'work'), parseRational(p, 'time'))
    case 'combined-work-rate':
    case 'pipes-filling':
      return timeFromWorkAndRate(WHOLE_JOB, combinedRates([individualRate(parseRational(p, 'firstTime')), individualRate(parseRational(p, 'secondTime'))]))
    case 'worker-joins-later': {
      const firstRate = individualRate(parseRational(p, 'firstTime'))
      const secondRate = individualRate(parseRational(p, 'secondTime'))
      return timeFromWorkAndRate(remainingWork(workFromRateAndTime(firstRate, parseRational(p, 'soloTime'))), combinedRates([firstRate, secondRate]))
    }
    case 'worker-leaves-early': {
      const continuing = individualRate(parseRational(p, 'continuingTime'))
      const leaving = individualRate(parseRational(p, 'leavingTime'))
      const completed = workFromRateAndTime(combinedRates([continuing, leaving]), parseRational(p, 'togetherTime'))
      return timeFromWorkAndRate(remainingWork(completed), continuing)
    }
    case 'pipes-filling-draining':
      return timeFromWorkAndRate(WHOLE_JOB, opposingNetRate([individualRate(parseRational(p, 'fillTime'))], [individualRate(parseRational(p, 'drainTime'))]))
    case 'efficiency-work-rates':
      return timeFromWorkAndRate(WHOLE_JOB, efficiencyRate(individualRate(parseRational(p, 'baseTime')), numberParameter(p, 'efficientParts'), numberParameter(p, 'baseParts')))
    case 'unknown-work-time': {
      const totalRate = individualRate(parseRational(p, 'togetherTime'))
      return timeFromWorkAndRate(WHOLE_JOB, solveUnknownRate(totalRate, [individualRate(parseRational(p, 'knownTime'))]))
    }
    case 'mixed-work-rate': {
      const firstRate = individualRate(parseRational(p, 'firstTime'))
      const secondRate = individualRate(parseRational(p, 'secondTime'))
      const solo = parseRational(p, 'soloTime')
      const remaining = remainingWork(workFromRateAndTime(firstRate, solo))
      return addFractions(solo, timeFromWorkAndRate(remaining, combinedRates([firstRate, secondRate])))
    }
    default:
      throw new Error('Question does not belong to the work-rate generator family.')
  }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const correct = parseRational(question.parameters, 'correct')
    const recomputed = recomputeWorkRateAnswer(question)
    const correctChoices = question.choices.filter((choice) => choice.isCorrect)
    const values = question.choices.map((choice) => rational(Math.round(choice.numericValue * 1_000_000), 1_000_000))
    const valid = fractionsEqual(correct, recomputed) && isPositiveRational(correct) &&
      question.choices.length === 4 && correctChoices.length === 1 &&
      new Set(question.choices.map((choice) => choice.text)).size === 4 &&
      hasUniqueRationalValues(values) &&
      question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null) &&
      question.prompt.trim().length > 20 && question.explanation.steps.length >= 2
    return { valid, reason: valid ? null : 'The generated work-rate question failed exact validation.' }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Invalid work-rate question.' }
  }
}

const documented = (value: Rational, mistake: Parameters<typeof workRateDistractor>[1], operation: string, inputs: number[]) =>
  workRateDistractor(value, mistake, operation, inputs)

const individualWorkRateGenerator: QuestionGenerator = {
  slug: 'individual-work-rate', version, title: 'Individual Work Rate', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'individual-work-rate' })
    const jobs = input.difficulty === 'easy' ? 1 : random.integer(2, 5)
    const time = random.integer(4, 16)
    const correct = rateFromWorkAndTime(rational(jobs), rational(time))
    return buildQuestion({ slug: 'individual-work-rate', ...input,
      prompt: jobs === 1 ? `A clerk completes one filing job in ${time} hours. What fraction of the job is completed per hour?` : `A printer completes ${jobs} identical jobs in ${time} hours. What is its rate in jobs per hour?`,
      correct, unit: jobs === 1 ? 'job per hour' : 'jobs per hour',
      candidates: [
        documented(rational(time), 'used_completion_time_as_rate', 'use completion time as rate', [jobs, time]),
        documented(rational(time, jobs), 'inverted_work_rate_incorrectly', 'divide time by work', [time, jobs]),
        documented(rational(1, time), 'forgot_number_of_jobs', 'ignore multiple jobs', [jobs, time]),
        documented(rational(jobs * time), 'inverted_work_rate_incorrectly', 'multiply work and time', [jobs, time]),
        documented(rational(jobs, time * 2), 'forgot_number_of_jobs', 'halve the job count', [jobs, time]),
        documented(rational(time + jobs), 'used_completion_time_as_rate', 'add work count to completion time', [jobs, time]),
        documented(rational(jobs + 1, time), 'forgot_number_of_jobs', 'count one extra completed job', [jobs, time]),
      ],
      steps: [`Use Rate = Work ÷ Time.`, `${jobs} ÷ ${time} = ${correct.numerator}/${correct.denominator} job per hour after reduction.`],
      parameters: { work: rational(jobs), time: rational(time) }, signature: `individual|${jobs}|${time}` })
  }, validate: validateQuestion,
}

const completionPairs = [[6, 3], [8, 8], [8, 24], [10, 15], [12, 6], [12, 18]] as const

function twoRateQuestion(input: { seed: string; difficulty: GeneratorDifficulty; slug: 'combined-work-rate' | 'pipes-filling' }): GeneratedQuestion {
  const random = randomFor(input)
  const [first, second] = random.pick(completionPairs)
  const combined = combinedRates([individualRate(rational(first)), individualRate(rational(second))])
  const correct = timeFromWorkAndRate(WHOLE_JOB, combined)
  const context = input.slug === 'pipes-filling' ? ['Pipe A', 'Pipe B', 'fill a tank'] : ['Worker A', 'Worker B', 'complete a job']
  return buildQuestion({ ...input, prompt: `${context[0]} can ${context[2]} in ${first} hours and ${context[1]} can do so in ${second} hours. How long will they take together?`,
    correct, unit: 'hours', candidates: [
      documented(rational(first + second), 'added_completion_times', 'add individual times', [first, second]),
      documented(rational(first + second, 2), 'averaged_completion_times', 'average individual times', [first, second]),
      documented(combined, 'forgot_final_rate_reciprocal', 'return combined rate as time', [first, second]),
      documented(rational(Math.min(first, second)), 'forgot_final_rate_reciprocal', 'use faster individual time', [first, second]),
      first === second ? null : documented(timeFromWorkAndRate(WHOLE_JOB, rational(Math.abs(first - second), first * second)), 'subtracted_completion_times', 'subtract rates', [first, second]),
    ], steps: [`Add rates: 1/${first} + 1/${second} = ${combined.numerator}/${combined.denominator} job per hour.`, `Invert the combined rate to get ${formatHours(correct)}.`],
    parameters: { firstTime: rational(first), secondTime: rational(second) }, signature: `${input.slug}|${first}|${second}` })
}

const combinedWorkRateGenerator: QuestionGenerator = { slug: 'combined-work-rate', version, title: 'Combined Work', supportedDifficulties, generate(input) { return twoRateQuestion({ ...input, slug: 'combined-work-rate' }) }, validate: validateQuestion }
const pipesFillingGenerator: QuestionGenerator = { slug: 'pipes-filling', version, title: 'Pipes Filling', supportedDifficulties, generate(input) { return twoRateQuestion({ ...input, slug: 'pipes-filling' }) }, validate: validateQuestion }

function stagedGenerator(input: { seed: string; difficulty: GeneratorDifficulty; slug: 'worker-joins-later' | 'worker-leaves-early' }): GeneratedQuestion {
  const random = randomFor(input)
  const first = random.pick([8, 10, 12, 15])
  const second = random.pick([6, 12, 18, 20])
  const phase = random.integer(1, Math.min(3, Math.floor(1 / (1 / first + 1 / second)) - 1))
  const firstRate = individualRate(rational(first)); const secondRate = individualRate(rational(second))
  if (input.slug === 'worker-joins-later') {
    const completed = workFromRateAndTime(firstRate, rational(phase))
    const correct = timeFromWorkAndRate(remainingWork(completed), combinedRates([firstRate, secondRate]))
    return buildQuestion({ ...input, prompt: `Worker A can finish a job in ${first} hours. A works alone for ${phase} hours, then Worker B, who can finish it in ${second} hours, joins. How much longer is needed?`, correct, unit: 'hours',
      candidates: [
        documented(timeFromWorkAndRate(WHOLE_JOB, combinedRates([firstRate, secondRate])), 'ignored_initial_solo_work', 'ignore solo work', [first, second, phase]),
        documented(addFractions(rational(phase), correct), 'subtracted_time_instead_of_work', 'return total elapsed time', [phase]),
        documented(rational(first - phase), 'ignored_initial_solo_work', 'continue with first worker only', [first, phase]),
        documented(timeFromWorkAndRate(WHOLE_JOB, firstRate), 'used_combined_rate_for_entire_timeline', 'use first completion time', [first]),
      ], steps: [`A completes ${phase}/${first} of the job before B joins.`, `Subtract that work from 1, then divide the remainder by 1/${first} + 1/${second}.`, `The additional time is ${formatHours(correct)}.`],
      parameters: { firstTime: rational(first), secondTime: rational(second), soloTime: rational(phase) }, signature: `join|${first}|${second}|${phase}` })
  }
  const completed = workFromRateAndTime(combinedRates([firstRate, secondRate]), rational(phase))
  const correct = timeFromWorkAndRate(remainingWork(completed), firstRate)
  return buildQuestion({ ...input, prompt: `Workers A and B can finish a job alone in ${first} and ${second} hours. They work together for ${phase} hours, then B leaves. How much longer will A need?`, correct, unit: 'hours',
    candidates: [
      documented(timeFromWorkAndRate(remainingWork(completed), combinedRates([firstRate, secondRate])), 'continued_combined_rate_after_departure', 'keep combined rate', [first, second, phase]),
      documented(rational(first - phase), 'ignored_completed_work', 'subtract departure time from A time', [first, phase]),
      documented(timeFromWorkAndRate(remainingWork(completed), secondRate), 'used_departing_worker_rate', 'use departing worker rate', [second]),
      documented(rational(first), 'ignored_completed_work', 'ignore all completed work', [first]),
    ], steps: [`Together they complete ${completed.numerator}/${completed.denominator} of the job.`, `A must complete the remaining ${remainingWork(completed).numerator}/${remainingWork(completed).denominator} at 1/${first} job per hour.`, `A needs ${formatHours(correct)} more.`],
    parameters: { continuingTime: rational(first), leavingTime: rational(second), togetherTime: rational(phase) }, signature: `leave|${first}|${second}|${phase}` })
}

const workerJoinsLaterGenerator: QuestionGenerator = { slug: 'worker-joins-later', version, title: 'Worker Joins Later', supportedDifficulties, generate(input) { return stagedGenerator({ ...input, slug: 'worker-joins-later' }) }, validate: validateQuestion }
const workerLeavesEarlyGenerator: QuestionGenerator = { slug: 'worker-leaves-early', version, title: 'Worker Leaves Early', supportedDifficulties, generate(input) { return stagedGenerator({ ...input, slug: 'worker-leaves-early' }) }, validate: validateQuestion }

const pipesFillingDrainingGenerator: QuestionGenerator = {
  slug: 'pipes-filling-draining', version, title: 'Pipes Filling and Draining', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'pipes-filling-draining' })
    const [fill, drain] = random.pick([[6, 12], [8, 24], [10, 15], [12, 18]] as const)
    const fillRate = individualRate(rational(fill)); const drainRate = individualRate(rational(drain))
    const net = opposingNetRate([fillRate], [drainRate]); const correct = timeFromWorkAndRate(WHOLE_JOB, net)
    return buildQuestion({ slug: 'pipes-filling-draining', ...input, prompt: `An inlet fills a tank in ${fill} hours while a drain empties a full tank in ${drain} hours. With both open, how long will the empty tank take to fill?`, correct, unit: 'hours',
      candidates: [
        documented(timeFromWorkAndRate(WHOLE_JOB, addFractions(fillRate, drainRate)), 'added_drain_rate', 'add drain rate', [fill, drain]),
        documented(rational(Math.abs(drain - fill)), 'subtracted_completion_times', 'subtract completion times', [fill, drain]),
        documented(rational(fill), 'ignored_completed_work', 'ignore drain', [fill]),
        documented(divideFractions(WHOLE_JOB, subtractFractions(drainRate, fillRate)), 'reversed_fill_drain_signs', 'reverse rate signs', [fill, drain]),
        documented(rational(fill + drain), 'added_completion_times', 'add fill and drain times', [fill, drain]),
        documented(rational(fill + drain, 2), 'averaged_completion_times', 'average fill and drain times', [fill, drain]),
      ], steps: [`Net rate = 1/${fill} - 1/${drain} = ${net.numerator}/${net.denominator} tank per hour.`, `Invert the positive net rate: ${formatHours(correct)}.`],
      parameters: { fillTime: rational(fill), drainTime: rational(drain) }, signature: `fill-drain|${fill}|${drain}` })
  }, validate: validateQuestion,
}

const efficiencyWorkRatesGenerator: QuestionGenerator = {
  slug: 'efficiency-work-rates', version, title: 'Efficiency and Different Work Rates', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'efficiency-work-rates' })
    const baseTime = random.pick([8, 12, 15, 18, 20]); const ratio = random.pick([2, 3]);
    const correct = timeFromWorkAndRate(WHOLE_JOB, efficiencyRate(individualRate(rational(baseTime)), ratio, 1))
    return buildQuestion({ slug: 'efficiency-work-rates', ...input, prompt: `Machine A is ${ratio} times as efficient as Machine B. If B completes the same job in ${baseTime} hours, how long does A need?`, correct, unit: 'hours',
      candidates: [
        documented(rational(baseTime * ratio), 'used_efficiency_ratio_as_time_ratio', 'multiply time by efficiency ratio', [baseTime, ratio]),
        documented(rational(baseTime), 'reversed_efficiency_ratio', 'keep equal times', [baseTime, ratio]),
        documented(rational(baseTime, ratio + 1), 'misread_percent_more_efficiency', 'divide by sum of ratio terms', [baseTime, ratio]),
        documented(rational(baseTime * (ratio - 1)), 'used_efficiency_ratio_as_time_ratio', 'scale time by excess efficiency', [baseTime, ratio]),
      ], steps: [`Efficiency and rate use the same ${ratio}:1 ratio, but completion time uses the inverse ratio.`, `${baseTime} ÷ ${ratio} = ${formatHours(correct)}.`],
      parameters: { baseTime: rational(baseTime), efficientParts: ratio, baseParts: 1 }, signature: `efficiency|${baseTime}|${ratio}` })
  }, validate: validateQuestion,
}

const unknownPairs = [[4, 6, 12], [6, 9, 18], [8, 12, 24], [10, 15, 30]] as const
const unknownWorkTimeGenerator: QuestionGenerator = {
  slug: 'unknown-work-time', version, title: 'Finding an Unknown Work Time', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'unknown-work-time' }); const [together, known, unknown] = random.pick(unknownPairs)
    const correct = rational(unknown)
    return buildQuestion({ slug: 'unknown-work-time', ...input, prompt: `Workers A and B together finish a job in ${together} hours. A alone needs ${known} hours. How long would B need alone?`, correct, unit: 'hours',
      candidates: [
        documented(rational(Math.abs(known - together)), 'subtracted_completion_times_for_unknown', 'subtract times directly', [known, together]),
        documented(rational(known + together), 'added_completion_times', 'add completion times', [known, together]),
        documented(subtractFractions(individualRate(rational(together)), individualRate(rational(known))), 'returned_rate_instead_of_time', 'return unknown rate', [known, together]),
        documented(rational(together), 'forgot_final_rate_reciprocal', 'return combined time', [together]),
      ], steps: [`B's rate = 1/${together} - 1/${known}.`, `The difference is 1/${unknown} job per hour, so B alone needs ${unknown} hours.`],
      parameters: { togetherTime: rational(together), knownTime: rational(known) }, signature: `unknown|${together}|${known}` })
  }, validate: validateQuestion,
}

const mixedWorkRateGenerator: QuestionGenerator = {
  slug: 'mixed-work-rate', version, title: 'Mixed Work and Rate Problems', supportedDifficulties,
  generate(input) {
    const random = randomFor({ ...input, slug: 'mixed-work-rate' }); const first = random.pick([8, 10, 12]); const second = random.pick([6, 12, 15]); const solo = random.integer(1, 3)
    const firstRate = individualRate(rational(first)); const combined = combinedRates([firstRate, individualRate(rational(second))])
    const remaining = remainingWork(workFromRateAndTime(firstRate, rational(solo))); const secondPhase = timeFromWorkAndRate(remaining, combined); const correct = addFractions(rational(solo), secondPhase)
    return buildQuestion({ slug: 'mixed-work-rate', ...input, prompt: `A records clerk can finish a batch in ${first} hours and works alone for ${solo} hours. A second clerk who could finish it in ${second} hours then joins. What is the total elapsed completion time?`, correct, unit: 'hours',
      candidates: [
        documented(secondPhase, 'ignored_initial_solo_work', 'return only second phase', [first, second, solo]),
        documented(timeFromWorkAndRate(WHOLE_JOB, combined), 'used_combined_rate_for_entire_timeline', 'use combined rate throughout', [first, second]),
        documented(rational(first - solo), 'subtracted_time_instead_of_work', 'subtract solo time from individual time', [first, solo]),
        documented(rational(first), 'ignored_completed_work', 'use first worker time', [first]),
      ], steps: [`Solo work = ${solo}/${first}; remaining work = ${remaining.numerator}/${remaining.denominator}.`, `Divide the remainder by the combined rate, then add the initial ${solo} hours.`, `Total elapsed time is ${formatHours(correct)}.`],
      parameters: { firstTime: rational(first), secondTime: rational(second), soloTime: rational(solo) }, signature: `mixed|${first}|${second}|${solo}` })
  }, validate: validateQuestion,
}

export const workRateGenerators = [
  individualWorkRateGenerator, combinedWorkRateGenerator, workerJoinsLaterGenerator,
  workerLeavesEarlyGenerator, pipesFillingGenerator, pipesFillingDrainingGenerator,
  efficiencyWorkRatesGenerator, unknownWorkTimeGenerator, mixedWorkRateGenerator,
] as const satisfies readonly QuestionGenerator[]
