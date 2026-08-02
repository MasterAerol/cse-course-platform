import { selectSeriesDistractors, seriesDistractor } from '../../domain/number-series/number-series-distractors'
import { formatSeries } from '../../domain/number-series/number-series-format'
import { arithmeticProgression, assertSeriesValue, differenceTable, geometricProgression, interleaveSeries, operationCycle, powerProgression, recoverMissingTerm, recursiveProgression } from '../../domain/number-series/number-series-math'
import type { SeriesDistractor, SeriesOperation, SeriesRuleFamily } from '../../domain/number-series/number-series.types'
import { detectCompetingPatterns, hasExactlyOneNumericAnswer, hasUniqueNumericChoices, isUnambiguousSeries, verifyAllTerms } from '../../domain/number-series/number-series-validation'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

interface Scenario {
  prompt: string
  series: number[]
  visible: (number | null)[]
  correct: number
  intendedFamily: SeriesRuleFamily
  steps: string[]
  signature: string
  parameters: Record<string, unknown>
  distractors: SeriesDistractor[]
}

type Random = ReturnType<typeof createSeededRandom>

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty): Random {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function nextTermScenario(input: Omit<Scenario, 'prompt' | 'visible'>): Scenario {
  const visible = input.series.slice(0, -1)
  return { ...input, visible, prompt: `What number comes next? ${formatSeries([...visible, null])}` }
}

function arithmeticScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  if (difficulty === 'hard') {
    const start = random.integer(8, 30)
    const first = random.integer(3, 7)
    const second = -random.integer(1, 4)
    const operations = [{ kind: 'add', value: first }, { kind: 'add', value: second }] as const
    const series = operationCycle(start, operations, 6)
    const correct = series[series.length - 1] ?? 0
    const previous = series[series.length - 2] ?? 0
    return nextTermScenario({ series, correct, intendedFamily: 'operation-cycle', steps: [`The differences repeat +${first}, ${second}.`, `The last shown transition used +${first}; the next uses ${second}.`, `${previous} − ${Math.abs(second)} = ${correct}.`], signature: `arithmetic-cycle|${start}|${first}|${second}`, parameters: { start, operations }, distractors: [seriesDistractor(previous, 'series_repeated_previous_term'), seriesDistractor(previous + second, 'series_continued_wrong_subseries'), seriesDistractor(previous - first, 'series_reversed_sign'), seriesDistractor(previous + first + second, 'series_skipped_transition'), seriesDistractor(previous + first * 2, 'series_wrong_step'), seriesDistractor(previous + second * 2, 'series_continued_wrong_subseries')] })
  }
  const difference = difficulty === 'easy' ? random.integer(2, 9) : -random.integer(3, 9)
  const start = difficulty === 'easy' ? random.integer(1, 25) : random.integer(35, 90)
  const series = arithmeticProgression(start, difference, 6)
  const correct = series[5] ?? 0
  const previous = series[4] ?? 0
  return nextTermScenario({ series, correct, intendedFamily: 'arithmetic', steps: [`Every consecutive difference is ${difference}.`, `Continue from ${previous} using the same signed difference.`, `${previous} ${difference >= 0 ? '+' : '−'} ${Math.abs(difference)} = ${correct}.`], signature: `arithmetic|${start}|${difference}`, parameters: { start, difference }, distractors: [seriesDistractor(previous, 'series_repeated_previous_term'), seriesDistractor(previous - difference, 'series_reversed_sign'), seriesDistractor(previous + difference + Math.sign(difference), 'series_wrong_step'), seriesDistractor(start + difference * 6, 'series_skipped_transition')] })
}

function geometricScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const divide = difficulty !== 'easy' && random.integer(0, 1) === 1
  const ratio = difficulty === 'hard' ? 3 : 2
  const count = 6
  const series = divide ? Array.from({ length: count }, (_, index) => assertSeriesValue(random.integer(1, 4) * ratio ** (count - index))) : geometricProgression(random.integer(1, 5), ratio, count)
  const correct = series[5] ?? 0
  const previous = series[4] ?? 0
  const factor = divide ? 1 / ratio : ratio
  return nextTermScenario({ series, correct, intendedFamily: 'geometric', steps: [`Each term is ${divide ? `divided by ${ratio}` : `multiplied by ${ratio}`}.`, `Apply that ratio to ${previous}.`, `${previous} ${divide ? '÷' : '×'} ${ratio} = ${correct}.`], signature: `geometric|${series[0]}|${factor}`, parameters: { ratio: factor, divide }, distractors: [seriesDistractor(previous + ratio, 'series_added_ratio'), seriesDistractor(divide ? previous * ratio : Math.trunc(previous / ratio), 'series_inverse_ratio'), seriesDistractor(divide ? previous * ratio * ratio : previous * ratio * ratio, 'series_multiplied_previous_terms'), seriesDistractor(previous, 'series_repeated_previous_term')] })
}

function alternatingScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const add = random.integer(2, 5)
  const multiplier = difficulty === 'hard' ? 3 : 2
  const operations: readonly SeriesOperation[] = difficulty === 'hard' ? [{ kind: 'multiply', value: multiplier }, { kind: 'add', value: -add }, { kind: 'add', value: add + 1 }] : [{ kind: 'add', value: add }, { kind: 'multiply', value: multiplier }]
  const series = operationCycle(random.integer(2, 7), operations, operations.length * 2)
  const correct = series[series.length - 1] ?? 0
  const previous = series[series.length - 2] ?? 0
  const nextOperation = operations[(series.length - 2) % operations.length]
  if (nextOperation === undefined) throw new Error('Alternating scenario is missing its next operation.')
  const lastOperation = operations[(series.length - 3) % operations.length]
  if (lastOperation === undefined) throw new Error('Alternating scenario is missing its prior operation.')
  const repeatLast = lastOperation.kind === 'add' ? previous + lastOperation.value : lastOperation.kind === 'multiply' ? previous * lastOperation.value : previous / lastOperation.value
  return nextTermScenario({ series, correct, intendedFamily: 'operation-cycle', steps: [`The operation cycle is ${operations.map((item) => item.kind === 'add' ? `${item.value >= 0 ? '+' : '−'}${Math.abs(item.value)}` : item.kind === 'multiply' ? `×${item.value}` : `÷${item.value}`).join(', ')}.`, 'The full cycle repeats at least twice.', `Applying the next operation to ${previous} gives ${correct}.`], signature: `alternating|${series[0]}|${JSON.stringify(operations)}`, parameters: { operations }, distractors: [seriesDistractor(assertSeriesValue(repeatLast), 'series_repeated_last_operation'), seriesDistractor(previous + add, 'series_reversed_operation_order'), seriesDistractor(previous * multiplier + add, 'series_applied_both_operations'), seriesDistractor(previous + (series[1] ?? 0) - (series[0] ?? 0), 'series_constant_difference_assumption'), seriesDistractor(previous * multiplier, 'series_repeated_last_operation'), seriesDistractor(previous - add, 'series_reversed_sign'), seriesDistractor(previous + add * 2, 'series_wrong_step')] })
}

function increasingDifferenceScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const start = random.integer(2, 30)
  const firstDifference = difficulty === 'easy' ? random.integer(2, 4) : difficulty === 'medium' ? -random.integer(2, 4) : random.integer(2, 4)
  const growth = difficulty === 'medium' ? -random.integer(1, 3) : difficulty === 'hard' ? random.integer(2, 4) : 1
  const series = [start]
  for (let index = 0; index < 5; index += 1) series.push(assertSeriesValue((series[series.length - 1] ?? 0) + firstDifference + growth * index))
  const correct = series[5] ?? 0
  const previous = series[4] ?? 0
  const lastDifference = (series[4] ?? 0) - (series[3] ?? 0)
  const nextDifference = lastDifference + growth
  return nextTermScenario({ series, correct, intendedFamily: 'increasing-difference', steps: [`First differences are ${(differenceTable(series.slice(0, -1))[1] ?? []).join(', ')}.`, `Those differences change by ${growth} each time, so the next difference is ${nextDifference}.`, `${previous} + (${nextDifference}) = ${correct}.`], signature: `difference|${start}|${firstDifference}|${growth}`, parameters: { start, firstDifference, growth }, distractors: [seriesDistractor(previous + lastDifference, 'series_repeated_last_difference'), seriesDistractor(previous + lastDifference + Math.sign(growth), 'series_wrong_difference_growth'), seriesDistractor((series[3] ?? 0) + nextDifference, 'series_difference_from_wrong_term'), seriesDistractor(nextDifference, 'series_confused_square_cube'), seriesDistractor(previous - nextDifference, 'series_reversed_sign'), seriesDistractor(previous + lastDifference + growth * 2, 'series_wrong_difference_growth'), seriesDistractor((series[2] ?? 0) + nextDifference, 'series_difference_from_wrong_term')] })
}

function powerScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const exponent: 2 | 3 = difficulty === 'medium' ? 3 : 2
  const offset = difficulty === 'hard' ? random.integer(1, 4) : 0
  const startIndex = random.integer(1, 3)
  const count = exponent === 3 ? 6 : random.integer(6, 7)
  const series = powerProgression(startIndex, exponent, offset, count)
  const correct = series[series.length - 1] ?? 0
  const previous = series[series.length - 2] ?? 0
  const nextIndex = startIndex + series.length - 1
  return nextTermScenario({ series, correct, intendedFamily: 'power', steps: [`Term n follows n^${exponent}${offset === 0 ? '' : ` + ${offset}`}.`, `The requested index is ${nextIndex}.`, `${nextIndex}^${exponent}${offset === 0 ? '' : ` + ${offset}`} = ${correct}.`], signature: `power|${startIndex}|${exponent}|${offset}|${series.length}`, parameters: { startIndex, exponent, offset }, distractors: [seriesDistractor(previous * 2, 'series_doubled_instead_of_power'), seriesDistractor(Math.min(10_000, previous ** 2), 'series_squared_previous_term'), seriesDistractor(exponent === 2 ? nextIndex ** 3 + offset : nextIndex ** 2 + offset, 'series_confused_square_cube'), seriesDistractor(nextIndex ** exponent - offset, 'series_incorrect_power_offset'), seriesDistractor((nextIndex + 1) ** exponent + offset, 'series_wrong_step')] })
}

function recursiveScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const first = random.integer(1, 5)
  const second = random.integer(first + 1, first + 5)
  const adjustment = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : -1
  const series = recursiveProgression(first, second, adjustment, 7)
  const correct = series[6] ?? 0
  const previous = series[5] ?? 0
  return nextTermScenario({ series, correct, intendedFamily: 'recursive', steps: [`Each term is the sum of the previous two${adjustment === 0 ? '' : ` ${adjustment > 0 ? 'plus' : 'minus'} ${Math.abs(adjustment)}`}.`, `Use ${series[4]} and ${series[5]}.`, `${series[4]} + ${series[5]} ${adjustment === 0 ? '' : `${adjustment > 0 ? '+' : '−'} ${Math.abs(adjustment)}`} = ${correct}.`], signature: `recursive|${first}|${second}|${adjustment}`, parameters: { first, second, adjustment }, distractors: [seriesDistractor(previous * 2, 'series_doubled_latest_term'), seriesDistractor(previous + (series[3] ?? 0) + adjustment, 'series_added_wrong_recursive_terms'), seriesDistractor(previous + (series[4] ?? 0), 'series_omitted_recursive_adjustment'), seriesDistractor(previous + ((series[5] ?? 0) - (series[4] ?? 0)), 'series_repeated_last_difference'), seriesDistractor(previous - (series[4] ?? 0), 'series_added_wrong_recursive_terms'), seriesDistractor(previous + second, 'series_added_wrong_recursive_terms')] })
}

function interleavedScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const oddStart = random.integer(1, 10)
  const evenStart = random.integer(15, 30)
  const oddStep = random.integer(2, 5)
  const evenStep = difficulty === 'hard' ? -random.integer(2, 4) : random.integer(5, 9)
  const series = interleaveSeries(arithmeticProgression(oddStart, oddStep, 4), arithmeticProgression(evenStart, evenStep, 3))
  const correct = series[6] ?? 0
  const previous = series[5] ?? 0
  return nextTermScenario({ series, correct, intendedFamily: 'interleaved', steps: [`Odd-position terms are ${series.filter((_, index) => index % 2 === 0).slice(0, -1).join(', ')} and change by ${oddStep}.`, `Even-position terms form a separate series changing by ${evenStep}.`, `The requested odd-position term is ${series[4]} + ${oddStep} = ${correct}.`], signature: `interleaved|${oddStart}|${oddStep}|${evenStart}|${evenStep}`, parameters: { oddStart, oddStep, evenStart, evenStep }, distractors: [seriesDistractor(previous + evenStep, 'series_continued_wrong_subseries'), seriesDistractor(previous + oddStep, 'series_swapped_odd_even'), seriesDistractor(previous + ((series[5] ?? 0) - (series[4] ?? 0)), 'series_treated_as_single_progression'), seriesDistractor(Math.trunc(((series[4] ?? 0) + previous) / 2), 'series_inserted_average'), seriesDistractor((series[4] ?? 0) + evenStep, 'series_continued_wrong_subseries'), seriesDistractor((series[4] ?? 0) - oddStep, 'series_reversed_sign'), seriesDistractor(oddStart + oddStep * 4, 'series_skipped_transition'), seriesDistractor(evenStart + evenStep * 3, 'series_continued_wrong_subseries'), seriesDistractor(previous, 'series_repeated_previous_term'), seriesDistractor(series[4] ?? 0, 'series_repeated_previous_term')] })
}

function missingScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const family = difficulty === 'easy' ? 'arithmetic' : difficulty === 'medium' ? 'geometric' : 'increasing-difference'
  let series: number[]
  if (family === 'arithmetic') series = arithmeticProgression(random.integer(2, 20), random.integer(3, 8), 6)
  else if (family === 'geometric') series = geometricProgression(random.integer(1, 4), 2, 6)
  else { const start = random.integer(1, 9); series = [start]; for (let index = 0; index < 5; index += 1) series.push((series[series.length - 1] ?? 0) + 2 + index) }
  const missingIndex = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
  const visible: (number | null)[] = [...series]
  visible[missingIndex] = null
  const correct = recoverMissingTerm(series, missingIndex, visible)
  const left = series[missingIndex - 1] ?? series[0] ?? 0
  const right = series[missingIndex + 1] ?? series[series.length - 1] ?? 0
  return { prompt: `Which number replaces the question mark? ${formatSeries(visible)}`, series, visible, correct, intendedFamily: family, steps: [`The complete series uses a ${family} rule.`, `Terms on both sides of the blank must follow that same rule.`, `The only value satisfying both adjacent transitions is ${correct}.`], signature: `missing|${family}|${series.join('-')}|${missingIndex}`, parameters: { family, missingIndex, completeSeries: series }, distractors: [seriesDistractor(left, 'series_used_left_side_only'), seriesDistractor(right, 'series_used_right_side_only'), seriesDistractor(Math.trunc((left + right) / 2), 'series_inserted_average'), seriesDistractor(left + right, 'series_skipped_transition')] }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): Scenario {
  const random = randomFor(seed, slug, difficulty)
  switch (slug) {
    case 'addition-subtraction-series': return arithmeticScenario(random, difficulty)
    case 'multiplication-division-series': return geometricScenario(random, difficulty)
    case 'alternating-operation-series': return alternatingScenario(random, difficulty)
    case 'increasing-difference-series': return increasingDifferenceScenario(random, difficulty)
    case 'squares-cubes-powers-series': return powerScenario(random, difficulty)
    case 'fibonacci-recursive-series': return recursiveScenario(random, difficulty)
    case 'interleaved-two-pattern-series': return interleavedScenario(random, difficulty)
    case 'missing-term-series': return missingScenario(random, difficulty)
    case 'mixed-number-series': {
      const variants = ['addition-subtraction-series', 'multiplication-division-series', 'alternating-operation-series', 'increasing-difference-series', 'squares-cubes-powers-series', 'fibonacci-recursive-series', 'interleaved-two-pattern-series', 'missing-term-series'] as const
      const selected = random.pick(variants)
      const scenario = buildScenario(selected, `${seed}|mixed`, difficulty)
      return { ...scenario, signature: `mixed|${selected}|${scenario.signature}`, parameters: { ...scenario.parameters, mixedGenerator: selected } }
    }
    default: throw new Error(`Unsupported Number Series generator: ${slug}`)
  }
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty)
  const distractors = selectSeriesDistractors(scenario.correct, scenario.distractors)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([
    { text: String(scenario.correct), isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: scenario.correct },
    ...distractors.map((item) => ({ text: String(item.value), isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [item.value] }, qualityScore: 0.9, numericValue: item.value })),
  ])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { ...scenario.parameters, intendedFamily: scenario.intendedFamily, completeSeries: scenario.series, visibleSeries: scenario.visible, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Number Series solution', steps: scenario.steps, finalAnswer: String(scenario.correct) }, metadata: { answerKind: 'number', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const scenario = buildScenario(question.generatorSlug, question.seed, question.difficulty)
    const correct = question.choices.find((choice) => choice.isCorrect)
    const choiceValues = question.choices.map((choice) => choice.numericValue)
    const nextTermSeries = scenario.visible[scenario.visible.length - 1] === null ? scenario.series.slice(0, -1) : scenario.series.slice(0, -1)
    const ambiguitySafe = scenario.intendedFamily === 'operation-cycle' || scenario.visible.includes(null) || isUnambiguousSeries(nextTermSeries, scenario.intendedFamily, scenario.correct)
    const storedSeries = question.parameters.completeSeries
    const checks: readonly [string, boolean][] = [
      ['version', question.generatorVersion === version],
      ['prompt', question.prompt === scenario.prompt],
      ['series', Array.isArray(storedSeries) && storedSeries.every((value): value is number => typeof value === 'number') && verifyAllTerms(storedSeries, scenario.series)],
      ['ambiguity', ambiguitySafe],
      ['recomputed answer', question.parameters.recomputedCorrect === scenario.correct],
      ['choice count', question.choices.length === 4],
      ['choice uniqueness', hasUniqueNumericChoices(choiceValues)],
      ['single answer', hasExactlyOneNumericAnswer(choiceValues, scenario.correct)],
      ['correct choice', correct?.numericValue === scenario.correct],
      ['explanation', question.explanation.finalAnswer === String(scenario.correct) && question.explanation.steps.length >= 3],
      ['distractor derivations', question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)],
    ]
    const failed = checks.find(([, valid]) => !valid)
    return { valid: failed === undefined, reason: failed === undefined ? null : failed[0] === 'ambiguity' ? `Number Series validation failed: ambiguity ${JSON.stringify(detectCompetingPatterns(nextTermSeries, scenario.intendedFamily, scenario.correct))}.` : `Number Series validation failed: ${failed[0]}.` }
  } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid Number Series question.' } }
}

const definitions = [
  ['addition-subtraction-series', 'Addition and Subtraction Series'],
  ['multiplication-division-series', 'Multiplication and Division Series'],
  ['alternating-operation-series', 'Alternating Operation Series'],
  ['increasing-difference-series', 'Increasing and Decreasing Differences'],
  ['squares-cubes-powers-series', 'Squares, Cubes, and Power Patterns'],
  ['fibonacci-recursive-series', 'Fibonacci-Type and Recursive Series'],
  ['interleaved-two-pattern-series', 'Interleaved and Two-Pattern Series'],
  ['missing-term-series', 'Missing-Term Number Series'],
  ['mixed-number-series', 'Mixed Number Series'],
] as const satisfies readonly (readonly [GeneratorSlug, string])[]

export const numberSeriesGenerators = definitions.map(([slug, title]) => ({ slug, version, title, supportedDifficulties, generate(input) { return buildQuestion(slug, input) }, validate: validateQuestion })) satisfies readonly QuestionGenerator[]
