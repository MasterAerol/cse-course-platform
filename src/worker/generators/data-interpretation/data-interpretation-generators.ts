import { selectDataDistractors } from '../../domain/data-interpretation/data-interpretation-distractors'
import { isValidDataDisplay, hasUniqueDataChoices } from '../../domain/data-interpretation/data-display-validation'
import { accessibleDataText, dataNumericValue, formatDataAnswer } from '../../domain/data-interpretation/data-interpretation-format'
import { absoluteDifference, arithmeticMean, percentChange, percentageShare, ratioValue, sum, weightedMean } from '../../domain/data-interpretation/data-interpretation-math'
import type { DataDisplay, DataMistakeType, DataOperation, DataScenario } from '../../domain/data-interpretation/data-interpretation.types'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const
const categoryPool = ['North', 'South', 'East', 'West', 'Central', 'Branch A', 'Branch B', 'Branch C', 'Branch D', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4'] as const
const monthPool = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'] as const
type Random = ReturnType<typeof createSeededRandom>

function display(input: Omit<DataDisplay, 'accessibleText'>): DataDisplay {
  const accessibleText = accessibleDataText(input)
  return { ...input, accessibleText }
}

function valueAt(data: DataDisplay, series: number, category: number): number {
  const value = data.series[series]?.values[category]
  if (value === undefined) throw new Error('Data operation references a missing value.')
  return value
}

export function recomputeDataAnswer(data: DataDisplay, operation: DataOperation): number {
  if (operation.kind === 'lookup') return valueAt(data, operation.series, operation.category)
  if (operation.kind === 'sum-series') return sum(data.series[operation.series]?.values ?? [])
  if (operation.kind === 'difference') return absoluteDifference(valueAt(data, operation.series, operation.first), valueAt(data, operation.series, operation.second))
  if (operation.kind === 'maximum-category') return Math.max(...(data.series[operation.series]?.values ?? []))
  if (operation.kind === 'percentage-share') { const values = data.series[operation.series]?.values ?? []; return percentageShare(valueAt(data, operation.series, operation.category), sum(values)) }
  if (operation.kind === 'percent-change') return percentChange(valueAt(data, operation.series, operation.first), valueAt(data, operation.series, operation.second))
  if (operation.kind === 'ratio') return ratioValue(valueAt(data, operation.series, operation.first), valueAt(data, operation.series, operation.second))
  if (operation.kind === 'mean') return arithmeticMean(data.series[operation.series]?.values ?? [])
  if (operation.kind === 'weighted-mean') return weightedMean(data.series[operation.valueSeries]?.values ?? [], data.series[operation.weightSeries]?.values ?? [])
  return sum(data.series[operation.firstSeries]?.values ?? []) + sum(data.series[operation.secondSeries]?.values ?? [])
}

function scenarioBase(data: DataDisplay, operation: DataOperation, question: string, answerSuffix: string, answerDecimals: number, wrong: readonly [number, DataMistakeType][], steps: readonly string[], signature: string): DataScenario {
  return { display: data, operation, question, answerSuffix, answerDecimals, distractors: wrong.map(([value, mistakeType]) => ({ value, mistakeType })), steps, signature }
}

function categories(random: Random, count = 4): string[] { return random.shuffle(categoryPool).slice(0, count) }
function offset(random: Random): number { return random.integer(2, 9) * 10 }

function tableScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random); const base = offset(random)
  const data = display({ type: 'table', title: 'Quarterly office transactions', unit: 'transactions', categories: labels, series: [{ name: 'Quarter 1', values: [base, base + 10, base + 20, base + 30] }, { name: 'Quarter 2', values: [base + 5, base + 15, base + 25, base + 35] }], legend: ['Quarter 1', 'Quarter 2'] })
  const category = difficulty === 'easy' ? 2 : random.integer(0, 3); const operation: DataOperation = { kind: 'lookup', series: 0, category }; const correct = recomputeDataAnswer(data, operation)
  return scenarioBase(data, operation, `What is the Quarter 1 value for ${labels[category]}?`, '', 0, [[valueAt(data, 0, (category + 1) % 4), 'data_wrong_row'], [valueAt(data, 1, category), 'data_wrong_column'], [sum(data.series[0]?.values ?? []), 'data_total_not_average']], [`Read the ${labels[category]} row.`, 'Move to the Quarter 1 column.', `The intersecting value is ${correct}.`], `table|${labels.join('|')}|${base}|${category}`)
}

function barScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random); const base = offset(random); const values = [base, base + 20, base + 50, base + 80]
  const grouped = difficulty !== 'easy'; const second = [base + 10, base + 40, base + 60, base + 100]; const series = grouped ? [{ name: 'Morning', values }, { name: 'Afternoon', values: second }] : [{ name: 'Visitors', values }]; const selected = grouped ? 1 : 0; const selectedValues = series[selected]?.values ?? []
  const data = display({ type: 'bar', title: 'Visitors by office', unit: 'visitors', categories: labels, series, axis: { minimum: 0, maximum: base + 110, interval: 10 }, legend: series.map(({ name }) => name) })
  const operation: DataOperation = { kind: 'difference', series: selected, first: 0, second: 3 }; const correct = recomputeDataAnswer(data, operation)
  return scenarioBase(data, operation, `In the ${series[selected]?.name} series, by how many visitors does ${labels[3]} exceed ${labels[0]}?`, '', 0, [[grouped ? 80 : selectedValues[3] ?? 0, grouped ? 'data_wrong_series' : 'data_wrong_category'], [sum([selectedValues[0] ?? 0, selectedValues[3] ?? 0]), 'data_added_instead_subtracted'], [correct + 10, 'data_misread_scale']], [`Use the ${series[selected]?.name} series and read ${selectedValues[3]} and ${selectedValues[0]}.`, `Subtract: ${selectedValues[3]} − ${selectedValues[0]} = ${correct}.`, 'Use the requested series and absolute difference.'], `bar|${labels.join('|')}|${base}|${difficulty}`)
}

function lineScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const start = random.integer(0, 4); const labels = monthPool.slice(start, start + 4); const base = random.integer(4, 200) * 5; const values = [base, base + 10, base + 35, base + 50]; const twoSeries = difficulty !== 'easy'; const second = [base + 5, base + 20, base + 30, base + 70]; const series = twoSeries ? [{ name: 'Team A', values }, { name: 'Team B', values: second }] : [{ name: 'Completed', values }]; const selected = twoSeries ? 1 : 0; const selectedValues = series[selected]?.values ?? []
  const data = display({ type: 'line', title: 'Monthly project completions', unit: 'projects', categories: labels, series, axis: { minimum: 0, maximum: base + 80, interval: 5 }, legend: series.map(({ name }) => name) })
  const operation: DataOperation = { kind: 'difference', series: selected, first: 1, second: 2 }; const correct = recomputeDataAnswer(data, operation)
  return scenarioBase(data, operation, `For ${series[selected]?.name}, what was the increase from ${labels[1]} to ${labels[2]}?`, '', 0, [[twoSeries ? 25 : 50, twoSeries ? 'data_wrong_series' : 'data_wrong_category'], [twoSeries ? 65 : 10, 'data_wrong_row'], [arithmeticMean(selectedValues), 'data_total_not_average']], [`Use ${series[selected]?.name}: read ${selectedValues[1]} at ${labels[1]} and ${selectedValues[2]} at ${labels[2]}.`, `Subtract ${selectedValues[2]} − ${selectedValues[1]} = ${correct}.`, 'This is the requested interval and series, not the endpoint change.'], `line|${labels.join('|')}|${base}|${difficulty}`)
}

function pieScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random); const values = random.shuffle([10, 20, 30, 40]); const data = display({ type: 'pie', title: 'Survey response shares', unit: 'percent', categories: labels, series: [{ name: 'Share', values }], legend: ['Share'] })
  const category = values.indexOf(30); const operation: DataOperation = { kind: 'lookup', series: 0, category }; const correct = 30
  return scenarioBase(data, operation, `What percentage belongs to ${labels[category]}?`, '%', 0, [[108, 'data_degree_as_percent'], [20, 'data_wrong_category'], [70, 'data_part_to_whole_confusion']], [`All sectors sum to ${sum(values)}%.`, `Read the exact label for ${labels[category]}.`, `${labels[category]} represents ${correct}%.`], `pie|${labels.join('|')}|${values.join('|')}|${difficulty}`)
}

function percentageScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random, 3); const values = random.shuffle([20, 30, 50]); const data = display({ type: 'table', title: 'Task status distribution', unit: 'tasks', categories: labels, series: [{ name: 'Tasks', values }], legend: ['Tasks'] })
  const category = values.indexOf(30)
  if (difficulty === 'hard') { const second = values.indexOf(20); const operation: DataOperation = { kind: 'ratio', series: 0, first: category, second }; const correct = recomputeDataAnswer(data, operation); return scenarioBase(data, operation, `What is the ratio of ${labels[category]} to ${labels[second]}, expressed as a number to 1?`, ':1', 2, [[ratioValue(20, 30), 'data_reversed_ratio'], [percentageShare(30, 100) / 100, 'data_part_to_whole_confusion'], [ratioValue(50, 20), 'data_wrong_category']], [`Use the requested order: 30 to 20.`, `Divide both terms by 20: 1.5 to 1.`, `The ratio is ${correct}:1.`], `ratio|${labels.join('|')}|${values.join('|')}`) }
  const operation: DataOperation = { kind: 'percentage-share', series: 0, category }; const correct = recomputeDataAnswer(data, operation)
  return scenarioBase(data, operation, `What percentage of all tasks belongs to ${labels[category]}?`, '%', 0, [[60, 'data_wrong_denominator'], [0.3, 'data_omitted_times_100'], [20, 'data_wrong_category']], [`Total tasks: ${values.join(' + ')} = 100.`, `Share: 30 ÷ 100 × 100 = ${correct}%.`, 'Use the grand total as denominator.'], `percentage|${labels.join('|')}|${values.join('|')}|${difficulty}`)
}

function totalsScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random); const base = offset(random); const first = [base, base + 10, base + 20, base + 30]; const second = [base + 5, base + 15, base + 25, base + 35]
  const data = display({ type: 'bar', title: 'Department output by period', unit: 'units', categories: labels, series: [{ name: 'Period A', values: first }, { name: 'Period B', values: second }], axis: { minimum: 0, maximum: base + 50, interval: 5 }, legend: ['Period A', 'Period B'] })
  const operation: DataOperation = { kind: 'combined-total', firstSeries: 0, secondSeries: 1 }; const correct = recomputeDataAnswer(data, operation); const firstTotal = sum(first); const secondTotal = sum(second)
  return scenarioBase(data, operation, 'What is the combined total for both periods and all departments?', '', 0, [[firstTotal, 'data_ignored_component'], [secondTotal, 'data_wrong_series'], [Math.abs(firstTotal - secondTotal), 'data_reversed_subtraction']], [`Period A total is ${firstTotal}.`, `Period B total is ${secondTotal}.`, `Combined total: ${firstTotal} + ${secondTotal} = ${correct}.`], `totals|${labels.join('|')}|${base}|${difficulty}`)
}

function averageScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random); const shift = random.integer(0, 4) * 5; const scores = [60 + shift, 70 + shift, 80 + shift, 90 + shift]; const weights = [1, 2, 3, 4]
  const data = display({ type: 'table', title: 'Department scores and group sizes', unit: 'score and employees', categories: labels, series: [{ name: 'Average score', values: scores }, { name: 'Employees', values: weights }], legend: ['Average score', 'Employees'] })
  const operation: DataOperation = difficulty === 'easy' ? { kind: 'mean', series: 0 } : { kind: 'weighted-mean', valueSeries: 0, weightSeries: 1 }; const correct = recomputeDataAnswer(data, operation); const simple = arithmeticMean(scores); const weightedTotal = scores.reduce((total, score, index) => total + score * (weights[index] ?? 0), 0)
  return scenarioBase(data, operation, difficulty === 'easy' ? 'What is the simple mean of the four average scores?' : 'What is the employee-weighted average score?', '', 1, [[difficulty === 'easy' ? sum(scores) : simple, difficulty === 'easy' ? 'data_total_not_average' : 'data_simple_not_weighted'], [weightedTotal, 'data_total_not_average'], [correct + 1, 'data_rounded_early']], [difficulty === 'easy' ? `Add the scores: ${sum(scores)}.` : `Multiply each score by its employee count; weighted total is ${weightedTotal}.`, difficulty === 'easy' ? 'Divide by 4.' : `Total employees: ${sum(weights)}.`, `The required average is ${formatDataAnswer(correct, '', 1)}.`], `average|${labels.join('|')}|${shift}|${difficulty}`)
}

function multiStepScenario(random: Random, difficulty: GeneratorDifficulty): DataScenario {
  const labels = categories(random, 3); const multiplier = random.integer(1, 4); const values = [20 * multiplier, 30 * multiplier, 50 * multiplier]
  const data = display({ type: 'line', title: 'Inventory received by batch', unit: 'items', categories: labels, series: [{ name: 'Received', values }], axis: { minimum: 0, maximum: 60 * multiplier, interval: 10 * multiplier }, legend: ['Received'] })
  const operation: DataOperation = { kind: 'percentage-share', series: 0, category: 1 }; const correct = recomputeDataAnswer(data, operation)
  return scenarioBase(data, operation, `After finding the total inventory, what percentage came from ${labels[1]}?`, '%', 0, [[60, 'data_wrong_denominator'], [50 * multiplier, 'data_absolute_not_percent'], [0.3, 'data_omitted_times_100']], [`Total: ${values.join(' + ')} = ${sum(values)}.`, `${labels[1]} contributes ${values[1]}.`, `${values[1]} ÷ ${sum(values)} × 100 = ${correct}%.`], `multi|${labels.join('|')}|${multiplier}|${difficulty}`)
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): DataScenario {
  const random = createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
  if (slug === 'table-interpretation') return tableScenario(random, difficulty)
  if (slug === 'bar-chart-interpretation') return barScenario(random, difficulty)
  if (slug === 'line-graph-interpretation') return lineScenario(random, difficulty)
  if (slug === 'pie-chart-interpretation') return pieScenario(random, difficulty)
  if (slug === 'percentage-ratio-data') return percentageScenario(random, difficulty)
  if (slug === 'totals-differences-comparisons') return totalsScenario(random, difficulty)
  if (slug === 'average-weighted-data') return averageScenario(random, difficulty)
  if (slug === 'multi-step-data-interpretation') return multiStepScenario(random, difficulty)
  if (slug === 'mixed-data-interpretation') { const variants = ['table-interpretation', 'bar-chart-interpretation', 'line-graph-interpretation', 'pie-chart-interpretation', 'percentage-ratio-data', 'totals-differences-comparisons', 'average-weighted-data', 'multi-step-data-interpretation'] as const; const selected = random.pick(variants); const scenario = buildScenario(selected, `${seed}|mixed`, difficulty); return { ...scenario, signature: `mixed|${selected}|${scenario.signature}` } }
  throw new Error(`Unsupported Data Interpretation generator: ${slug}`)
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty); if (!isValidDataDisplay(scenario.display)) throw new Error('Generated display failed integrity validation.')
  const correctValue = recomputeDataAnswer(scenario.display, scenario.operation); const correctText = formatDataAnswer(correctValue, scenario.answerSuffix, scenario.answerDecimals)
  const candidates = scenario.distractors.map(({ value, mistakeType }) => ({ value, mistakeType, text: formatDataAnswer(value, scenario.answerSuffix, scenario.answerDecimals) })); const distractors = selectDataDistractors(correctText, candidates)
  const random = createSeededRandom(`${input.seed}|${slug}|choices`); const choices = random.shuffle([{ text: correctText, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: dataNumericValue(correctValue) }, ...distractors.map((item) => ({ text: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [dataNumericValue(item.value)] }, qualityScore: 0.95, numericValue: dataNumericValue(item.value) }))])
  const prompt = `${scenario.display.accessibleText}\n\n${scenario.question}`
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt, parameters: { display: scenario.display, operation: scenario.operation, answerSuffix: scenario.answerSuffix, answerDecimals: scenario.answerDecimals, recomputedCorrect: correctText }, choices, explanation: { title: 'Data Interpretation solution', steps: [...scenario.steps], finalAnswer: correctText }, metadata: { answerKind: scenario.answerSuffix === '%' ? 'percent' : 'number', unit: scenario.display.unit, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validate(question: GeneratedQuestion): GeneratorValidationResult {
  try { const data = question.parameters.display as DataDisplay; const operation = question.parameters.operation as DataOperation; const suffix = question.parameters.answerSuffix; const decimals = question.parameters.answerDecimals; if (typeof suffix !== 'string' || typeof decimals !== 'number' || !isValidDataDisplay(data)) return { valid: false, reason: 'Display metadata is invalid.' }; const recomputed = formatDataAnswer(recomputeDataAnswer(data, operation), suffix, decimals); const correct = question.choices.find((choice) => choice.isCorrect); const valid = question.prompt.includes(data.accessibleText) && question.parameters.recomputedCorrect === recomputed && correct?.text === recomputed && question.explanation.finalAnswer === recomputed && question.choices.length === 4 && question.choices.filter((choice) => choice.isCorrect).length === 1 && hasUniqueDataChoices(question.choices.map(({ text }) => text)) && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('data_') === true && choice.derivation !== null); return { valid, reason: valid ? null : 'Data Interpretation validation failed.' } } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid Data Interpretation question.' } }
}

const make = (slug: GeneratorSlug, title: string): QuestionGenerator => ({ slug, version, title, supportedDifficulties, generate: (input) => buildQuestion(slug, input), validate })
export const dataInterpretationGenerators = [['table-interpretation', 'Table Interpretation'], ['bar-chart-interpretation', 'Bar Chart Interpretation'], ['line-graph-interpretation', 'Line Graph Interpretation'], ['pie-chart-interpretation', 'Pie Chart Interpretation'], ['percentage-ratio-data', 'Percentages and Ratios in Data'], ['totals-differences-comparisons', 'Totals, Differences, and Comparisons'], ['average-weighted-data', 'Average and Weighted Data'], ['multi-step-data-interpretation', 'Multi-Step Data Interpretation'], ['mixed-data-interpretation', 'Mixed Data Interpretation']].map(([slug, title]) => make(slug as GeneratorSlug, title ?? 'Data Interpretation'))
