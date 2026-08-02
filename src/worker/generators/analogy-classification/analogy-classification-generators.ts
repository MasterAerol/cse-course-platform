import { analogyDistractor, selectAnalogyDistractors } from '../../domain/analogy-classification/analogy-classification-distractors'
import { formatAnalogy, repeatSymbol } from '../../domain/analogy-classification/analogy-classification-format'
import { antonymPairs, applyNumericRule, categorySets, causeEffectPairs, functionPairs, intensityPairs, partWholePairs, synonymPairs } from '../../domain/analogy-classification/analogy-classification-rules'
import { hasOneAnalogyAnswer, hasUniqueVisibleAnalogyChoices, validateNumericAnalogy, validateUniqueOutlier } from '../../domain/analogy-classification/analogy-classification-validation'
import type { AnalogyDistractor, CuratedAnalogyPair, NumericRule } from '../../domain/analogy-classification/analogy-classification.types'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

interface Scenario {
  prompt: string
  correct: string
  correctValue: number
  distractors: AnalogyDistractor[]
  steps: string[]
  signature: string
  relationship: string
  parameters: Record<string, unknown>
}

const synonymMistakes = {
  rapid: ['speed', 'slow', 'quickly'], silent: ['sound', 'noisy', 'silence'], begin: ['opening', 'end', 'beginning'], end: ['closing', 'begin', 'ending'], assist: ['support', 'hinder', 'assistance'], select: ['option', 'reject', 'selection'],
} as const
const antonymMistakes = {
  ancient: ['history', 'old', 'age'], scarce: ['supply', 'rare', 'scarcity'], accept: ['decision', 'receive', 'acceptance'], expand: ['size', 'enlarge', 'expansion'], include: ['group', 'contain', 'inclusion'], increase: ['amount', 'raise', 'increase'],
} as const
const verbalMistakes: Readonly<Record<string, readonly [string, string, string]>> = { ...synonymMistakes, ...antonymMistakes }
const locations = ['garage', 'shelf', 'desk', 'garden', 'room', 'office'] as const
const symbols = ['▲', '■', '●', '◆'] as const

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty) {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function pickTwo<T>(random: ReturnType<typeof randomFor>, items: readonly T[]): [T, T] {
  const shuffled = random.shuffle(items)
  const first = shuffled[0]
  const second = shuffled[1]
  if (first === undefined || second === undefined) throw new Error('Curated bank needs at least two entries.')
  return [first, second]
}

function synonymAntonymScenario(random: ReturnType<typeof randomFor>): Scenario {
  const useAntonym = random.integer(0, 1) === 1
  const bank: readonly CuratedAnalogyPair[] = useAntonym ? antonymPairs : synonymPairs
  const [source, target] = pickTwo(random, bank)
  const mistakes = verbalMistakes[target.left]
  if (mistakes === undefined) throw new Error(`No modeled verbal distractors exist for ${target.left}.`)
  return {
    prompt: `Complete the analogy while preserving the ${useAntonym ? 'antonym' : 'synonym'} relationship and grammatical role: ${formatAnalogy(source.left, source.right, target.left)}`,
    correct: target.right, correctValue: 1,
    distractors: [
      analogyDistractor(mistakes[0], 'analogy_associated_not_equivalent'),
      analogyDistractor(mistakes[1], useAntonym ? 'analogy_wrong_relationship' : 'analogy_reversed_direction'),
      analogyDistractor(mistakes[2], 'analogy_grammar_mismatch'),
    ],
    steps: [`${source.left} and ${source.right} are ${useAntonym ? 'opposites' : 'synonyms'}.`, `${target.left} has the same grammatical role as ${source.left}.`, `${target.right} preserves the same relationship.`],
    signature: `${useAntonym ? 'antonym' : 'synonym'}|${source.left}|${target.left}`, relationship: useAntonym ? 'antonym' : 'synonym', parameters: { source, target },
  }
}

function partWholeScenario(random: ReturnType<typeof randomFor>, difficulty: GeneratorDifficulty): Scenario {
  const [source, target] = pickTwo(random, partWholePairs)
  const wholeToPart = difficulty === 'hard' || (difficulty === 'medium' && random.integer(0, 1) === 1)
  const first = wholeToPart ? [source[1], source[0]] : source
  const next = wholeToPart ? target[1] : target[0]
  const correct = wholeToPart ? target[0] : target[1]
  const related = random.pick(locations.filter((item) => item !== correct && item !== next))
  return { prompt: `Complete the structural analogy: ${formatAnalogy(first[0], first[1], next)}`, correct, correctValue: 1, distractors: [analogyDistractor(next, 'part_whole_reversed'), analogyDistractor(related, 'location_instead_of_component'), analogyDistractor(wholeToPart ? 'object' : 'collection', 'category_instead_of_component')], steps: [`${first[0]} is the ${wholeToPart ? 'whole containing' : 'part of'} ${first[1]}.`, 'Keep the direction unchanged.', `${next} therefore pairs with ${correct}.`], signature: `part-whole|${wholeToPart}|${source.join('-')}|${target.join('-')}`, relationship: wholeToPart ? 'whole-to-part' : 'part-to-whole', parameters: { source, target, wholeToPart } }
}

function functionScenario(random: ReturnType<typeof randomFor>): Scenario {
  const [source, target] = pickTwo(random, functionPairs)
  return { prompt: `Complete the analogy by matching each tool, worker, or object to its primary activity: ${formatAnalogy(source[0], source[1], target[0])}`, correct: target[1], correctValue: 1, distractors: [analogyDistractor(target[0], 'analogy_reversed_direction'), analogyDistractor(random.pick(locations), 'function_location_confusion'), analogyDistractor('store', 'secondary_function')], steps: [`The primary activity of ${source[0]} is to ${source[1]}.`, 'Preserve object-to-function direction and verb form.', `The primary matching activity for ${target[0]} is to ${target[1]}.`], signature: `function|${source.join('-')}|${target.join('-')}`, relationship: 'function-purpose', parameters: { source, target } }
}

function causeEffectScenario(random: ReturnType<typeof randomFor>): Scenario {
  const [source, target] = pickTwo(random, causeEffectPairs)
  return { prompt: `Complete the analogy using the direct cause-to-effect relationship: ${formatAnalogy(source[0], source[1], target[0])}`, correct: target[1], correctValue: 1, distractors: [analogyDistractor(target[0], 'cause_effect_reversed'), analogyDistractor(source[1], 'associated_not_caused'), analogyDistractor('a schedule', 'possible_not_characteristic_effect'), analogyDistractor('a category', 'category_instead_of_component'), analogyDistractor('the original cause', 'analogy_reversed_direction')], steps: [`${source[0]} characteristically causes ${source[1]}.`, 'Keep cause before effect.', `${target[0]} characteristically causes ${target[1]}.`], signature: `cause|${source.join('-')}|${target.join('-')}`, relationship: 'cause-effect', parameters: { source, target } }
}

function intensityScenario(random: ReturnType<typeof randomFor>, difficulty: GeneratorDifficulty): Scenario {
  const [source, target] = pickTwo(random, intensityPairs)
  const reverse = difficulty === 'hard' || (difficulty === 'medium' && random.integer(0, 1) === 1)
  const first = reverse ? [source[1], source[0]] : source
  const next = reverse ? target[1] : target[0]
  const correct = reverse ? target[0] : target[1]
  return { prompt: `Complete the analogy by preserving the direction of intensity: ${formatAnalogy(first[0], first[1], next)}`, correct, correctValue: 1, distractors: [analogyDistractor(next, 'intensity_reversed'), analogyDistractor(reverse ? 'extreme' : 'mild', 'equal_strength_synonym'), analogyDistractor(reverse ? 'stronger' : 'opposite', 'analogy_wrong_relationship')], steps: [`${first[0]} is ${reverse ? 'stronger than' : 'weaker than'} ${first[1]}.`, 'Keep the same direction of strength.', `${correct} has the required intensity relative to ${next}.`], signature: `intensity|${reverse}|${source.join('-')}|${target.join('-')}`, relationship: 'degree-intensity', parameters: { source, target, reverse } }
}

function numericSymbolScenario(random: ReturnType<typeof randomFor>, difficulty: GeneratorDifficulty): Scenario {
  const useSymbol = difficulty === 'easy' && random.integer(0, 2) === 0
  if (useSymbol) {
    const [source, target] = pickTwo(random, symbols)
    const correct = repeatSymbol(target, 2)
    return { prompt: `Apply the same visible symbol transformation: ${source} : ${repeatSymbol(source, 2)} :: ${target} : ?`, correct, correctValue: 2, distractors: [analogyDistractor(target, 'numeric_inverse_operation', 1), analogyDistractor(repeatSymbol(target, 3), 'numeric_wrong_constant', 3), analogyDistractor(repeatSymbol(source, 2), 'numeric_reused_first_output', 2)], steps: [`The first symbol is repeated twice.`, 'Apply the same repetition count to the new symbol.', `The result is ${correct}.`], signature: `symbol|${source}|${target}`, relationship: 'repeat-twice', parameters: { source, target, repeat: 2 } }
  }
  const operation = difficulty === 'hard' ? random.pick(['square', 'multiply'] as const) : difficulty === 'medium' ? random.pick(['divide', 'multiply'] as const) : random.pick(['add', 'multiply'] as const)
  const constant = operation === 'square' ? 2 : random.integer(2, 4)
  const rule: NumericRule = { operation, constant }
  const firstInput = operation === 'divide' ? random.integer(2, 6) * constant : random.integer(3, 9)
  const secondInput = operation === 'divide' ? random.integer(7, 12) * constant : random.integer(10, 16)
  const firstOutput = applyNumericRule(firstInput, rule)
  const correctValue = applyNumericRule(secondInput, rule)
  const wrongValues = operation === 'square' ? [secondInput * 2, secondInput + 2, firstOutput, secondInput * secondInput * 2, secondInput - 2] : operation === 'multiply' ? [secondInput + constant, secondInput, firstOutput, secondInput * (constant + 1), secondInput - constant] : operation === 'divide' ? [secondInput * constant, secondInput - constant, firstOutput, Math.floor(secondInput / (constant + 1)), secondInput + constant] : [secondInput * constant, secondInput - constant, firstOutput, secondInput + constant + 1, secondInput]
  const mistakes = operation === 'square' ? ['numeric_square_double_confusion', 'numeric_wrong_constant', 'numeric_reused_first_output', 'numeric_wrong_constant', 'numeric_inverse_operation'] as const : ['numeric_add_instead_of_multiply', 'numeric_inverse_operation', 'numeric_reused_first_output', 'numeric_wrong_constant', 'numeric_inverse_operation'] as const
  return { prompt: `Apply the same arithmetic transformation: ${firstInput} : ${firstOutput} :: ${secondInput} : ?`, correct: String(correctValue), correctValue, distractors: wrongValues.map((value, index) => analogyDistractor(String(value), mistakes[index] ?? 'numeric_wrong_constant', value)), steps: [`The first pair uses ${operation}${operation === 'square' ? '' : ` by ${constant}`}.`, `Apply exactly the same rule to ${secondInput}.`, `The result is ${correctValue}.`], signature: `numeric|${operation}|${constant}|${firstInput}|${secondInput}`, relationship: `numeric-${operation}`, parameters: { rule, firstInput, firstOutput, secondInput, correctValue } }
}

function oddOneOutScenario(random: ReturnType<typeof randomFor>): Scenario {
  const set = random.pick(categorySets)
  const options = random.shuffle([...set.members, set.outlier])
  return { prompt: `Which item is the odd one out? Three items are ${set.category}: ${options.join(', ')}.`, correct: set.outlier, correctValue: 1, distractors: set.members.map((member, index) => analogyDistractor(member, (['odd_one_superficial_feature', 'odd_one_secondary_grouping', 'odd_one_least_familiar'] as const)[index] ?? 'odd_one_secondary_grouping')), steps: [`${set.members.join(', ')} share the category ${set.category}.`, `${set.outlier} is not a member of that category.`, `Therefore ${set.outlier} is the unique outlier.`], signature: `odd|${set.category}|${options.join('-')}`, relationship: 'odd-one-out', parameters: { category: set.category, members: set.members, outlier: set.outlier, options } }
}

function categoryScenario(random: ReturnType<typeof randomFor>): Scenario {
  const target = random.pick(categorySets)
  const correct = random.pick(target.members)
  const otherSets = categorySets.filter((item) => item.category !== target.category)
  const shuffledNonmembers = random.shuffle(otherSets.flatMap((set) => [...set.members, set.outlier])).filter((value, index, all) => value !== correct && all.indexOf(value) === index)
  const distractorValues = shuffledNonmembers.slice(0, 3)
  return { prompt: `Which item belongs to the objective category “${target.category}”?`, correct, correctValue: 1, distractors: [analogyDistractor(distractorValues[0] ?? 'unrelated', 'classification_adjacent_category'), analogyDistractor(distractorValues[1] ?? 'associated', 'classification_function_not_category'), analogyDistractor(distractorValues[2] ?? 'broad item', 'classification_association_not_membership')], steps: [`The stated category is ${target.category}.`, `${correct} is explicitly in the curated member set.`, 'The other choices belong to different objective categories.'], signature: `category|${target.category}|${correct}|${distractorValues.join('-')}`, relationship: 'category-membership', parameters: { category: target.category, members: target.members, correct } }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): Scenario {
  const random = randomFor(seed, slug, difficulty)
  switch (slug) {
    case 'synonym-antonym-analogy': return synonymAntonymScenario(random)
    case 'part-whole-analogy': return partWholeScenario(random, difficulty)
    case 'function-purpose-analogy': return functionScenario(random)
    case 'cause-effect-analogy': return causeEffectScenario(random)
    case 'degree-intensity-analogy': return intensityScenario(random, difficulty)
    case 'symbol-number-analogy': return numericSymbolScenario(random, difficulty)
    case 'odd-one-out': return oddOneOutScenario(random)
    case 'category-classification': return categoryScenario(random)
    case 'mixed-analogy-classification': {
      const variants = ['synonym-antonym-analogy', 'part-whole-analogy', 'function-purpose-analogy', 'cause-effect-analogy', 'degree-intensity-analogy', 'symbol-number-analogy', 'odd-one-out', 'category-classification'] as const
      const selected = random.pick(variants)
      const scenario = buildScenario(selected, `${seed}|mixed`, difficulty)
      return { ...scenario, signature: `mixed|${selected}|${scenario.signature}`, parameters: { ...scenario.parameters, mixedGenerator: selected } }
    }
    default: throw new Error(`Unsupported analogy generator: ${slug}`)
  }
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty)
  const distractors = selectAnalogyDistractors(scenario.correct, scenario.distractors)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([
    { text: scenario.correct, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: scenario.correctValue },
    ...distractors.map((item, index) => ({ text: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [item.numericValue ?? index + 1] }, qualityScore: 0.9, numericValue: item.numericValue ?? index + 1 })),
  ])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { ...scenario.parameters, relationship: scenario.relationship, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Analogy and classification solution', steps: scenario.steps, finalAnswer: scenario.correct }, metadata: { answerKind: slug === 'symbol-number-analogy' && /^\d+$/u.test(scenario.correct) ? 'number' : 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const scenario = buildScenario(question.generatorSlug, question.seed, question.difficulty)
    const correct = question.choices.find((choice) => choice.isCorrect)
    let specialValid = true
    if (scenario.relationship.startsWith('numeric-')) { const p = scenario.parameters; specialValid = typeof p.firstInput === 'number' && typeof p.firstOutput === 'number' && typeof p.secondInput === 'number' && typeof p.correctValue === 'number' && typeof p.rule === 'object' && p.rule !== null && validateNumericAnalogy(p.firstInput, p.firstOutput, p.secondInput, p.correctValue, p.rule as NumericRule) }
    if (scenario.relationship === 'odd-one-out') { const p = scenario.parameters; specialValid = Array.isArray(p.options) && Array.isArray(p.members) && validateUniqueOutlier(p.options.filter((item): item is string => typeof item === 'string'), new Set(p.members.filter((item): item is string => typeof item === 'string'))) }
    const valid = specialValid && question.generatorVersion === version && question.prompt === scenario.prompt && question.parameters.recomputedCorrect === scenario.correct && question.choices.length === 4 && hasOneAnalogyAnswer(question.choices) && hasUniqueVisibleAnalogyChoices(question.choices.map((choice) => choice.text)) && correct?.text === scenario.correct && question.explanation.finalAnswer === scenario.correct && question.explanation.steps.length >= 3 && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)
    return { valid, reason: valid ? null : 'The generated analogy/classification question failed recomputation or ambiguity validation.' }
  } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid analogy/classification question.' } }
}

const definitions = [
  ['synonym-antonym-analogy', 'Synonym and Antonym Analogy'], ['part-whole-analogy', 'Part and Whole Analogy'], ['function-purpose-analogy', 'Function and Purpose Analogy'], ['cause-effect-analogy', 'Cause and Effect Analogy'], ['degree-intensity-analogy', 'Degree and Intensity Analogy'], ['symbol-number-analogy', 'Symbol and Number Analogy'], ['odd-one-out', 'Odd One Out'], ['category-classification', 'Category Classification'], ['mixed-analogy-classification', 'Mixed Analogy and Classification'],
] as const satisfies readonly (readonly [GeneratorSlug, string])[]

export const analogyClassificationGenerators = definitions.map(([slug, title]) => ({ slug, version, title, supportedDifficulties, generate(input) { return buildQuestion(slug, input) }, validate: validateQuestion })) satisfies readonly QuestionGenerator[]
