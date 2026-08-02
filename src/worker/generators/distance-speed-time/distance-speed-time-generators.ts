import { addFractions, fractionsEqual, multiplyFractions } from '../../domain/fractions/fraction-math'
import type { DistractorMistakeType } from '../../domain/distractor-models'
import { chooseTravelDistractors, travelDistractor, type TravelDistractor } from '../../domain/distance-speed-time/distance-speed-time-distractors'
import { formatTravelAnswer, travelToNumber } from '../../domain/distance-speed-time/distance-speed-time-format'
import {
  averageSpeed,
  catchTimeAfterDeparture,
  distanceFromSpeedTime,
  headStartDistance,
  hoursToMinutes,
  kilometersPerHourToMetersPerSecond,
  kilometersToMeters,
  meetingTime,
  metersPerSecondToKilometersPerHour,
  sameDirectionRelativeSpeed,
  speedFromDistanceTime,
  timeFromDistanceSpeed,
  travelRational,
} from '../../domain/distance-speed-time/distance-speed-time-math'
import { hasUniqueTravelValues, isPositiveTravelValue } from '../../domain/distance-speed-time/distance-speed-time-validation'
import type { TravelAnswerUnit, TravelRational } from '../../domain/distance-speed-time/distance-speed-time.types'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty) {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function parseRational(parameters: Record<string, unknown>, key: string): TravelRational {
  const value = parameters[key]
  if (typeof value !== 'object' || value === null || !('numerator' in value) || !('denominator' in value) || typeof value.numerator !== 'number' || typeof value.denominator !== 'number') throw new Error(`Invalid rational parameter ${key}.`)
  return travelRational(value.numerator, value.denominator)
}

function parseString(parameters: Record<string, unknown>, key: string): string {
  const value = parameters[key]
  if (typeof value !== 'string') throw new Error(`Invalid string parameter ${key}.`)
  return value
}

type TravelContext = 'formula' | 'conversion' | 'average' | 'same' | 'opposite' | 'head-start' | 'mixed'

function misconceptionCandidates(correct: TravelRational, context: TravelContext): TravelDistractor[] {
  const double = multiplyFractions(correct, travelRational(2))
  const half = multiplyFractions(correct, travelRational(1, 2))
  const plusOne = addFractions(correct, travelRational(1))
  const plusTen = addFractions(correct, travelRational(10))
  const mistakeKinds: Record<TravelContext, readonly [DistractorMistakeType, DistractorMistakeType, DistractorMistakeType]> = {
    formula: ['divided_instead_of_multiplied_travel', 'multiplied_instead_of_divided_travel', 'inverted_speed_time_relationship'],
    conversion: ['used_wrong_unit_conversion_factor', 'reversed_unit_conversion', 'decimal_place_shift'],
    average: ['averaged_speeds_without_time_weighting', 'used_one_leg_only', 'used_total_time_as_distance'],
    same: ['added_same_direction_speeds', 'used_one_leg_only', 'inverted_speed_time_relationship'],
    opposite: ['subtracted_opposite_direction_speeds', 'used_one_leg_only', 'inverted_speed_time_relationship'],
    'head-start': ['ignored_head_start', 'included_delay_in_catch_time', 'added_same_direction_speeds'],
    mixed: ['omitted_stop_time', 'averaged_speeds_without_time_weighting', 'used_one_leg_only'],
  }
  const kinds = mistakeKinds[context]
  return [
    travelDistractor(double, kinds[0], 'double the intended result', [travelToNumber(correct)]),
    travelDistractor(half, kinds[1], 'halve the intended result', [travelToNumber(correct)]),
    travelDistractor(plusOne, kinds[2], 'add one after the wrong operation', [travelToNumber(correct)]),
    travelDistractor(plusTen, kinds[0], 'apply an incorrect conversion offset', [travelToNumber(correct)]),
  ]
}

function build(input: { slug: GeneratorSlug; seed: string; difficulty: GeneratorDifficulty; prompt: string; correct: TravelRational; unit: TravelAnswerUnit; context: Parameters<typeof misconceptionCandidates>[1]; parameters: Record<string, unknown>; steps: string[]; signature: string }): GeneratedQuestion {
  const format = (value: TravelRational) => formatTravelAnswer(value, input.unit)
  const distractors = chooseTravelDistractors({ correct: input.correct, candidates: misconceptionCandidates(input.correct, input.context), format })
  const choices = [
    { text: format(input.correct), isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: travelToNumber(input.correct) },
    ...distractors.map((item) => ({ text: format(item.value), isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.operation, inputs: item.inputs }, qualityScore: item.qualityScore, numericValue: travelToNumber(item.value) })),
  ]
  return {
    generatorSlug: input.slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: input.prompt,
    parameters: { ...input.parameters, correct: input.correct, answerUnit: input.unit },
    choices: randomFor(input.seed, input.slug, input.difficulty).shuffle(choices),
    explanation: { title: 'Distance, speed, and time solution', steps: input.steps, finalAnswer: format(input.correct) },
    metadata: { answerKind: 'number', unit: input.unit, canonicalSignature: input.signature },
  }
}

export function recomputeDistanceSpeedTimeAnswer(question: GeneratedQuestion): TravelRational {
  const p = question.parameters
  switch (question.generatorSlug) {
    case 'distance-from-speed-time': return distanceFromSpeedTime(parseRational(p, 'speed'), parseRational(p, 'time'))
    case 'speed-from-distance-time': return speedFromDistanceTime(parseRational(p, 'distance'), parseRational(p, 'time'))
    case 'time-from-distance-speed': return timeFromDistanceSpeed(parseRational(p, 'distance'), parseRational(p, 'speed'))
    case 'travel-unit-conversions': {
      const value = parseRational(p, 'value'); const conversion = parseString(p, 'conversion')
      if (conversion === 'km-to-m') return kilometersToMeters(value)
      if (conversion === 'h-to-min') return hoursToMinutes(value)
      if (conversion === 'kmh-to-mps') return kilometersPerHourToMetersPerSecond(value)
      if (conversion === 'mps-to-kmh') return metersPerSecondToKilometersPerHour(value)
      throw new Error('Unsupported travel conversion.')
    }
    case 'average-speed': return averageSpeed([
      { distance: parseRational(p, 'firstDistance'), time: parseRational(p, 'firstTime') },
      { distance: parseRational(p, 'secondDistance'), time: parseRational(p, 'secondTime') },
    ])
    case 'same-direction-relative-speed': return catchTimeAfterDeparture(parseRational(p, 'lead'), parseRational(p, 'faster'), parseRational(p, 'slower'))
    case 'opposite-direction-relative-speed': return meetingTime(parseRational(p, 'separation'), parseRational(p, 'firstSpeed'), parseRational(p, 'secondSpeed'))
    case 'meeting-and-overtaking': return catchTimeAfterDeparture(headStartDistance(parseRational(p, 'slower'), parseRational(p, 'delay')), parseRational(p, 'faster'), parseRational(p, 'slower'))
    case 'mixed-distance-speed-time': return averageSpeed([
      { distance: parseRational(p, 'firstDistance'), time: parseRational(p, 'firstTime') },
      { distance: parseRational(p, 'secondDistance'), time: parseRational(p, 'secondTime') },
    ], parseRational(p, 'stopTime'))
    default: throw new Error('Question does not belong to the distance-speed-time generator family.')
  }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const correct = parseRational(question.parameters, 'correct'); const recomputed = recomputeDistanceSpeedTimeAnswer(question)
    const values = question.choices.map((choice) => travelRational(Math.round(choice.numericValue * 1_000_000), 1_000_000))
    const valid = fractionsEqual(correct, recomputed) && isPositiveTravelValue(correct) && question.choices.length === 4 && question.choices.filter((choice) => choice.isCorrect).length === 1 && new Set(question.choices.map((choice) => choice.text)).size === 4 && hasUniqueTravelValues(values) && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null) && question.prompt.length > 20 && question.explanation.steps.length >= 2
    return { valid, reason: valid ? null : 'The generated travel question failed exact validation.' }
  } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid travel question.' } }
}

function formulaGenerator(slug: 'distance-from-speed-time' | 'speed-from-distance-time' | 'time-from-distance-speed'): QuestionGenerator {
  return { slug, version, title: slug.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '), supportedDifficulties, generate(input) {
    const random = randomFor(input.seed, slug, input.difficulty); const speed = travelRational(random.integer(6, 18) * 5); const time = travelRational(random.integer(2, 6)); const distance = distanceFromSpeedTime(speed, time)
    const requested = slug === 'distance-from-speed-time' ? distance : slug === 'speed-from-distance-time' ? speed : time
    const unit: TravelAnswerUnit = slug === 'distance-from-speed-time' ? 'kilometers' : slug === 'speed-from-distance-time' ? 'km/h' : 'hours'
    const prompt = slug === 'distance-from-speed-time' ? `A vehicle travels at ${speed.numerator} km/h for ${time.numerator} hours. How far does it travel?` : slug === 'speed-from-distance-time' ? `A vehicle covers ${distance.numerator} kilometers in ${time.numerator} hours. What is its speed?` : `A vehicle covers ${distance.numerator} kilometers at ${speed.numerator} km/h. How long does the trip take?`
    return build({ slug, ...input, prompt, correct: requested, unit, context: 'formula', parameters: { speed, time, distance }, steps: [`Use ${slug === 'distance-from-speed-time' ? 'distance = speed × time' : slug === 'speed-from-distance-time' ? 'speed = distance ÷ time' : 'time = distance ÷ speed'}.`, `Substitute the compatible kilometer and hour values to obtain ${formatTravelAnswer(requested, unit)}.`], signature: `${slug}|${speed.numerator}|${time.numerator}` })
  }, validate: validateQuestion }
}

const conversionGenerator: QuestionGenerator = { slug: 'travel-unit-conversions', version, title: 'Travel Unit Conversions', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'travel-unit-conversions', input.difficulty); const kind = random.integer(0, 3)
  const specs = kind === 0 ? { conversion: 'km-to-m', value: travelRational(random.integer(2, 15)), unit: 'meters' as const, source: 'kilometers', correct: kilometersToMeters(travelRational(random.integer(2, 15))) } : null
  let value: TravelRational; let correct: TravelRational; let unit: TravelAnswerUnit; let conversion: string; let prompt: string
  if (specs !== null) { value = specs.value; correct = kilometersToMeters(value); unit = specs.unit; conversion = specs.conversion; prompt = `Convert ${value.numerator} kilometers to meters.` }
  else if (kind === 1) { value = travelRational(random.integer(2, 8)); correct = hoursToMinutes(value); unit = 'minutes'; conversion = 'h-to-min'; prompt = `Convert ${value.numerator} hours to minutes.` }
  else if (kind === 2) { value = travelRational(random.integer(2, 8) * 18); correct = kilometersPerHourToMetersPerSecond(value); unit = 'm/s'; conversion = 'kmh-to-mps'; prompt = `Convert ${value.numerator} km/h to m/s.` }
  else { value = travelRational(random.integer(2, 12) * 5); correct = metersPerSecondToKilometersPerHour(value); unit = 'km/h'; conversion = 'mps-to-kmh'; prompt = `Convert ${value.numerator} m/s to km/h.` }
  return build({ slug: 'travel-unit-conversions', ...input, prompt, correct, unit, context: 'conversion', parameters: { value, conversion }, steps: ['Apply the exact unit conversion factor before calculating.', `The converted value is ${formatTravelAnswer(correct, unit)}.`], signature: `conversion|${conversion}|${value.numerator}` })
}, validate: validateQuestion }

const averageSpeedGenerator: QuestionGenerator = { slug: 'average-speed', version, title: 'Average Speed', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'average-speed', input.difficulty); const firstTime = travelRational(random.integer(1, 4)); const secondTime = travelRational(random.integer(1, 4)); const firstSpeed = travelRational(random.integer(4, 9) * 10); const secondSpeed = travelRational(random.integer(5, 11) * 10); const firstDistance = distanceFromSpeedTime(firstSpeed, firstTime); const secondDistance = distanceFromSpeedTime(secondSpeed, secondTime); const correct = averageSpeed([{ distance: firstDistance, time: firstTime }, { distance: secondDistance, time: secondTime }])
  return build({ slug: 'average-speed', ...input, prompt: `A traveler moves for ${firstTime.numerator} hours at ${firstSpeed.numerator} km/h and then ${secondTime.numerator} hours at ${secondSpeed.numerator} km/h. What is the average speed for the whole trip?`, correct, unit: 'km/h', context: 'average', parameters: { firstDistance, firstTime, secondDistance, secondTime }, steps: ['Find each leg distance, then add all distances and all elapsed times.', `Average speed = total distance ÷ total time = ${formatTravelAnswer(correct, 'km/h')}; do not take an unweighted mean of the speeds.`], signature: `average|${firstSpeed.numerator}|${firstTime.numerator}|${secondSpeed.numerator}|${secondTime.numerator}` })
}, validate: validateQuestion }

const sameDirectionGenerator: QuestionGenerator = { slug: 'same-direction-relative-speed', version, title: 'Same-Direction Relative Speed', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'same-direction-relative-speed', input.difficulty); const slower = travelRational(random.integer(4, 7) * 10); const difference = travelRational(random.integer(1, 3) * 10); const faster = addFractions(slower, difference); const intendedTime = travelRational(random.integer(2, 5)); const lead = distanceFromSpeedTime(difference, intendedTime); const correct = catchTimeAfterDeparture(lead, faster, slower)
  return build({ slug: 'same-direction-relative-speed', ...input, prompt: `A slower vehicle at ${slower.numerator} km/h is ${lead.numerator} kilometers ahead. A faster vehicle at ${faster.numerator} km/h follows in the same direction. How long will it take to catch up?`, correct, unit: 'hours', context: 'same', parameters: { lead, faster, slower }, steps: [`Same-direction closing speed = ${faster.numerator} − ${slower.numerator} = ${sameDirectionRelativeSpeed(faster, slower).numerator} km/h.`, `Catch time = lead ÷ closing speed = ${formatTravelAnswer(correct, 'hours')}.`], signature: `same|${slower.numerator}|${faster.numerator}|${lead.numerator}` })
}, validate: validateQuestion }

const oppositeDirectionGenerator: QuestionGenerator = { slug: 'opposite-direction-relative-speed', version, title: 'Opposite-Direction Relative Speed', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'opposite-direction-relative-speed', input.difficulty); const firstSpeed = travelRational(random.integer(4, 8) * 10); const secondSpeed = travelRational(random.integer(5, 9) * 10); const intendedTime = travelRational(random.integer(2, 5)); const separation = distanceFromSpeedTime(addFractions(firstSpeed, secondSpeed), intendedTime); const correct = meetingTime(separation, firstSpeed, secondSpeed)
  return build({ slug: 'opposite-direction-relative-speed', ...input, prompt: `Two vehicles are ${separation.numerator} kilometers apart and move toward each other at ${firstSpeed.numerator} km/h and ${secondSpeed.numerator} km/h. When will they meet?`, correct, unit: 'hours', context: 'opposite', parameters: { separation, firstSpeed, secondSpeed }, steps: [`Opposite-direction closing speed = ${firstSpeed.numerator} + ${secondSpeed.numerator} km/h.`, `Meeting time = separation ÷ closing speed = ${formatTravelAnswer(correct, 'hours')}.`], signature: `opposite|${firstSpeed.numerator}|${secondSpeed.numerator}|${separation.numerator}` })
}, validate: validateQuestion }

const meetingOvertakingGenerator: QuestionGenerator = { slug: 'meeting-and-overtaking', version, title: 'Meeting and Overtaking', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'meeting-and-overtaking', input.difficulty); const slower = travelRational(random.integer(4, 6) * 10); const difference = travelRational(random.integer(1, 2) * 10); const faster = addFractions(slower, difference); const delay = travelRational(random.integer(1, 3)); const correct = catchTimeAfterDeparture(headStartDistance(slower, delay), faster, slower)
  return build({ slug: 'meeting-and-overtaking', ...input, prompt: `A bus leaves at ${slower.numerator} km/h. After ${delay.numerator} hour${delay.numerator === 1 ? '' : 's'}, a car leaves the same point at ${faster.numerator} km/h. How many hours after the car leaves will it overtake the bus?`, correct, unit: 'hours', context: 'head-start', parameters: { slower, faster, delay }, steps: [`The bus head start is ${slower.numerator} × ${delay.numerator} kilometers.`, `Divide that head start by the same-direction closing speed ${faster.numerator} − ${slower.numerator}; the requested time starts when the car leaves.`], signature: `overtake|${slower.numerator}|${faster.numerator}|${delay.numerator}` })
}, validate: validateQuestion }

const mixedGenerator: QuestionGenerator = { slug: 'mixed-distance-speed-time', version, title: 'Mixed Distance, Speed, and Time', supportedDifficulties, generate(input) {
  const random = randomFor(input.seed, 'mixed-distance-speed-time', input.difficulty); const firstTime = travelRational(random.integer(1, 3)); const secondTime = travelRational(random.integer(1, 3)); const stopTime = travelRational(random.integer(1, 2), 2); const firstSpeed = travelRational(random.integer(4, 8) * 10); const secondSpeed = travelRational(random.integer(5, 9) * 10); const firstDistance = distanceFromSpeedTime(firstSpeed, firstTime); const secondDistance = distanceFromSpeedTime(secondSpeed, secondTime); const correct = averageSpeed([{ distance: firstDistance, time: firstTime }, { distance: secondDistance, time: secondTime }], stopTime)
  return build({ slug: 'mixed-distance-speed-time', ...input, prompt: `A vehicle travels ${firstTime.numerator} hours at ${firstSpeed.numerator} km/h, stops for ${stopTime.numerator}/${stopTime.denominator} hour, then travels ${secondTime.numerator} hours at ${secondSpeed.numerator} km/h. What is its average speed for the entire elapsed trip?`, correct, unit: 'km/h', context: 'mixed', parameters: { firstDistance, firstTime, secondDistance, secondTime, stopTime }, steps: ['Add both travel distances and include the stopped interval in total elapsed time.', `Average speed = total distance ÷ total elapsed time = ${formatTravelAnswer(correct, 'km/h')}.`], signature: `mixed|${firstSpeed.numerator}|${firstTime.numerator}|${stopTime.numerator}/${stopTime.denominator}|${secondSpeed.numerator}|${secondTime.numerator}` })
}, validate: validateQuestion }

export const distanceSpeedTimeGenerators = [
  formulaGenerator('distance-from-speed-time'), formulaGenerator('speed-from-distance-time'), formulaGenerator('time-from-distance-speed'), conversionGenerator, averageSpeedGenerator, sameDirectionGenerator, oppositeDirectionGenerator, meetingOvertakingGenerator, mixedGenerator,
] as const satisfies readonly QuestionGenerator[]
