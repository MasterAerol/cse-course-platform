import { syllogismDistractor, selectSyllogismDistractors } from '../../domain/syllogisms/syllogism-distractors'
import { classificationText, formatPremises, formatStatement, syllogismNumericValue } from '../../domain/syllogisms/syllogism-format'
import { classifyConclusion, isEntailed, isSatisfiable, isValidEitherOrPair } from '../../domain/syllogisms/syllogism-model'
import { statement } from '../../domain/syllogisms/syllogism-rules'
import type { CategoricalStatement, SyllogismScenario } from '../../domain/syllogisms/syllogism.types'
import { hasExactlyOneSyllogismAnswer, hasUniqueSyllogismChoices, uniqueEntailedConclusion } from '../../domain/syllogisms/syllogism-validation'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const
const categoryPool = ['employees', 'supervisors', 'clerks', 'reports', 'folders', 'vehicles', 'plants', 'animals', 'books', 'tools', 'students', 'teachers', 'artists', 'musicians'] as const
type Random = ReturnType<typeof createSeededRandom>

const d = (text: string, mistakeType: Parameters<typeof syllogismDistractor>[1]) => syllogismDistractor(text, mistakeType)
const s = statement

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty): Random {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function categories(random: Random, count = 4): readonly [string, string, string, string] {
  const selected = random.shuffle(categoryPool).slice(0, count)
  if (selected.length < 4) selected.push(...categoryPool.filter((item) => !selected.includes(item)).slice(0, 4 - selected.length))
  return selected as unknown as readonly [string, string, string, string]
}

function entailedScenario(input: {
  label: string
  premises: readonly CategoricalStatement[]
  conclusions: readonly [CategoricalStatement, CategoricalStatement, CategoricalStatement, CategoricalStatement]
  mistakes: readonly [Parameters<typeof syllogismDistractor>[1], Parameters<typeof syllogismDistractor>[1], Parameters<typeof syllogismDistractor>[1]]
  steps: readonly string[]
}): SyllogismScenario {
  const correctIndex = uniqueEntailedConclusion(input.premises, input.conclusions)
  if (correctIndex === null) throw new Error(`${input.label} does not have exactly one entailed conclusion.`)
  const correctConclusion = input.conclusions[correctIndex]
  if (correctConclusion === undefined) throw new Error('Missing entailed conclusion.')
  const wrong = input.conclusions.filter((_, index) => index !== correctIndex)
  return {
    prompt: `Premises:\n${formatPremises(input.premises)}\n\nWhich conclusion definitely follows?`,
    premises: input.premises,
    correct: formatStatement(correctConclusion),
    choices: wrong.map((conclusion, index) => d(formatStatement(conclusion), input.mistakes[index] ?? 'syllogism_unsupported_overlap')),
    steps: input.steps,
    signature: `${input.label}|${input.premises.map(formatStatement).join('|')}`,
    validation: { kind: 'entailed-choice', conclusions: input.conclusions },
  }
}

function universalAffirmative(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c] = categories(random)
  return entailedScenario({ label: `ua|${difficulty}`, premises: [s('all', a, b), s('all', b, c)], conclusions: [s('all', a, c), s('all', c, a), s('some', a, c), s('all', b, a)], mistakes: ['syllogism_converse_error', 'syllogism_unsupported_existence', 'syllogism_reversed_subset'], steps: [`${a} is contained in ${b}.`, `${b} is contained in ${c}.`, `Therefore ${a} is contained in ${c}; no existence is assumed.`] })
}

function universalNegative(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c] = categories(random)
  return entailedScenario({ label: `un|${difficulty}`, premises: [s('no', a, b), s('all', c, a)], conclusions: [s('no', c, b), s('some-not', c, b), s('all', b, c), s('no', c, a)], mistakes: ['syllogism_unsupported_existence', 'syllogism_reversed_subset', 'syllogism_unsupported_disjointness'], steps: [`${a} and ${b} are disjoint.`, `${c} lies inside ${a}.`, `So ${c} cannot overlap ${b}; this does not prove that ${c} exists.`] })
}

function particularAffirmative(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c] = categories(random)
  return entailedScenario({ label: `pa|${difficulty}`, premises: [s('some', a, b), s('all', b, c)], conclusions: [s('some', a, c), s('all', a, c), s('some-not', c, a), s('no', a, c)], mistakes: ['syllogism_quantifier_strengthening', 'syllogism_lost_existential_witness', 'syllogism_ignored_negative_premise'], steps: [`The 'some' premise supplies a real member shared by ${a} and ${b}.`, `Every ${b} is a ${c}, so that same witness is also a ${c}.`, `Therefore some ${a} are ${c}; the conclusion remains particular.`] })
}

function mixedQuantifier(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c, fourth] = categories(random)
  if (difficulty === 'hard') return entailedScenario({ label: 'mq|hard', premises: [s('some', a, b), s('all', b, c), s('no', c, fourth)], conclusions: [s('some-not', a, fourth), s('all', a, c), s('some', a, fourth), s('no', a, fourth)], mistakes: ['syllogism_quantifier_strengthening', 'syllogism_ignored_negative_premise', 'syllogism_quantifier_weakening'], steps: [`A witnessed ${a} is a ${b}.`, `That witness enters ${c}, which is disjoint from ${fourth}.`, `The same witnessed ${a} is therefore not a ${fourth}.`] })
  return entailedScenario({ label: `mq|${difficulty}`, premises: [s('some-not', a, b), s('all', a, c)], conclusions: [s('some-not', c, b), s('all', c, a), s('some', b, c), s('no', c, b)], mistakes: ['syllogism_converse_error', 'syllogism_unsupported_overlap', 'syllogism_quantifier_strengthening'], steps: [`The particular premise supplies an ${a} outside ${b}.`, `Every ${a} lies inside ${c}.`, `That witness proves that some ${c} are not ${b}.`] })
}

function pairAnswer(follows: readonly [boolean, boolean]): string {
  if (follows[0] && follows[1]) return 'Both conclusions follow.'
  if (follows[0]) return 'Only conclusion I follows.'
  if (follows[1]) return 'Only conclusion II follows.'
  return 'Neither conclusion follows.'
}

function validConclusionScenario(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c, fourth] = categories(random)
  const variant = random.integer(0, 2)
  const premises = variant === 0 ? [s('all', a, b), s('all', b, c)] : variant === 1 ? [s('some', a, b), s('all', b, c), s('no', c, fourth)] : [s('all', a, b)]
  const conclusions: readonly [CategoricalStatement, CategoricalStatement] = variant === 0 ? [s('all', a, c), s('some', a, c)] : variant === 1 ? [s('some', a, c), s('some-not', a, fourth)] : [s('some', a, b), s('all', b, a)]
  const follows = [isEntailed(premises, conclusions[0]), isEntailed(premises, conclusions[1])] as const
  const correct = pairAnswer(follows)
  const allAnswers = ['Only conclusion I follows.', 'Only conclusion II follows.', 'Both conclusions follow.', 'Neither conclusion follows.']
  const mistakes = ['syllogism_possible_as_definite', 'syllogism_converse_error', 'syllogism_unsupported_existence'] as const
  return { prompt: `Premises:\n${formatPremises(premises)}\n\nConclusion I: ${formatStatement(conclusions[0])}\nConclusion II: ${formatStatement(conclusions[1])}\n\nWhich option is correct?`, premises, correct, choices: allAnswers.filter((answer) => answer !== correct).map((answer, index) => d(answer, mistakes[index] ?? 'syllogism_skipped_relation')), steps: ['Test conclusion I against every valid region model.', 'Test conclusion II independently.', `${correct} Possibility alone is not enough.`], signature: `pair|${difficulty}|${variant}|${premises.map(formatStatement).join('|')}`, validation: { kind: 'conclusion-pair', conclusions, follows } }
}

function vennScenario(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c] = categories(random)
  return entailedScenario({ label: `venn|${difficulty}`, premises: [s('all', a, b), s('no', b, c)], conclusions: [s('no', a, c), s('all', b, a), s('some', a, b), s('all', c, b)], mistakes: ['syllogism_reversed_subset', 'syllogism_unsupported_existence', 'syllogism_ignored_negative_premise'], steps: [`Place ${a} entirely inside ${b}.`, `Keep ${b} separate from ${c}.`, `The ${a} region must therefore also be separate from ${c}; no marker is added.`] })
}

function possibilityScenario(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c] = categories(random)
  const variant = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : random.integer(0, 2)
  const premises = variant === 0 ? [s('all', a, b), s('some', b, c)] : variant === 1 ? [s('all', a, b), s('no', b, c)] : [s('some', a, b), s('all', b, c)]
  const conclusion = s('some', a, c)
  const classification = classifyConclusion(premises, conclusion)
  const correct = classificationText(classification)
  const candidates = [d(classificationText('definite'), 'syllogism_possible_as_definite'), d(classificationText('possible'), 'syllogism_not_definite_as_impossible'), d(classificationText('impossible'), 'syllogism_ignored_negative_premise'), d('The premises are inconsistent.', 'syllogism_unsupported_disjointness')]
  return { prompt: `Premises:\n${formatPremises(premises)}\n\nConclusion: ${formatStatement(conclusion)}\n\nHow should the conclusion be classified?`, premises, correct, choices: selectSyllogismDistractors(correct, candidates), steps: [`The premises are ${isSatisfiable(premises) ? 'consistent' : 'inconsistent'}.`, `Check whether every, at least one, or no valid region model satisfies the conclusion.`, classificationText(classification)], signature: `possibility|${difficulty}|${variant}|${premises.map(formatStatement).join('|')}`, validation: { kind: 'classification', conclusion, classification } }
}

function eitherOrScenario(random: Random, difficulty: GeneratorDifficulty): SyllogismScenario {
  const [a, b, c] = categories(random)
  const premises = [s('all', a, c)]
  const pair: readonly [CategoricalStatement, CategoricalStatement] = difficulty === 'hard' ? [s('all', a, b), s('some-not', a, b)] : [s('some', a, b), s('no', a, b)]
  if (!isValidEitherOrPair(premises, pair[0], pair[1])) throw new Error('Generated either-or pair failed formal validation.')
  const correct = 'Yes, the conclusions form a valid either-or pair.'
  return { prompt: `Premise:\n${formatPremises(premises)}\n\nConclusion I: ${formatStatement(pair[0])}\nConclusion II: ${formatStatement(pair[1])}\n\nDo the conclusions form a valid either-or pair?`, premises, correct, choices: [d('No, conclusion I already follows independently.', 'syllogism_either_or_one_follows'), d('No, both conclusions can be false together.', 'syllogism_either_or_not_exhaustive'), d('No, the conclusions use unrelated category pairs.', 'syllogism_invalid_either_or_pair')], steps: ['Neither conclusion follows independently from the premise.', 'The conclusions are exact logical complements about the same categories.', 'They cannot both be true and cannot both be false, so the pair is valid either-or.'], signature: `either-or|${difficulty}|${premises.map(formatStatement).join('|')}`, validation: { kind: 'either-or', pair } }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): SyllogismScenario {
  const random = randomFor(seed, slug, difficulty)
  if (slug === 'universal-affirmative-syllogism') return universalAffirmative(random, difficulty)
  if (slug === 'universal-negative-syllogism') return universalNegative(random, difficulty)
  if (slug === 'particular-affirmative-syllogism') return particularAffirmative(random, difficulty)
  if (slug === 'mixed-quantifier-syllogism') return mixedQuantifier(random, difficulty)
  if (slug === 'valid-conclusion-syllogism') return validConclusionScenario(random, difficulty)
  if (slug === 'venn-diagram-syllogism') return vennScenario(random, difficulty)
  if (slug === 'possibility-conclusion-syllogism') return possibilityScenario(random, difficulty)
  if (slug === 'either-or-syllogism') return eitherOrScenario(random, difficulty)
  if (slug === 'mixed-syllogism') {
    const variants = ['universal-affirmative-syllogism', 'universal-negative-syllogism', 'particular-affirmative-syllogism', 'mixed-quantifier-syllogism', 'valid-conclusion-syllogism', 'venn-diagram-syllogism', 'possibility-conclusion-syllogism', 'either-or-syllogism'] as const
    const selected = random.pick(variants)
    const scenario = buildScenario(selected, `${seed}|mixed`, difficulty)
    return { ...scenario, signature: `mixed|${selected}|${scenario.signature}` }
  }
  throw new Error(`Unsupported Syllogisms generator: ${slug}`)
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty)
  const distractors = selectSyllogismDistractors(scenario.correct, scenario.choices)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([
    { text: scenario.correct, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: syllogismNumericValue(scenario.correct) },
    ...distractors.map((item) => ({ text: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [syllogismNumericValue(item.text)] }, qualityScore: 0.95, numericValue: syllogismNumericValue(item.text) })),
  ])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { premises: scenario.premises, validation: scenario.validation, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Syllogism solution', steps: [...scenario.steps], finalAnswer: scenario.correct }, metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function isStatement(value: unknown): value is CategoricalStatement {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (item.quantifier === 'all' || item.quantifier === 'no' || item.quantifier === 'some' || item.quantifier === 'some-not') && typeof item.subject === 'string' && typeof item.predicate === 'string'
}

function validate(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const rawPremises = question.parameters.premises
    const rawValidation = question.parameters.validation
    const correct = question.parameters.recomputedCorrect
    if (!Array.isArray(rawPremises) || !rawPremises.every(isStatement) || typeof rawValidation !== 'object' || rawValidation === null || typeof correct !== 'string') return { valid: false, reason: 'Syllogism metadata is incomplete.' }
    const premises = rawPremises
    const validation = rawValidation as Record<string, unknown>
    let logicalValid = false
    if (validation.kind === 'entailed-choice' && Array.isArray(validation.conclusions) && validation.conclusions.every(isStatement)) {
      const index = uniqueEntailedConclusion(premises, validation.conclusions)
      logicalValid = index !== null && formatStatement(validation.conclusions[index] as CategoricalStatement) === correct
    } else if (validation.kind === 'classification' && isStatement(validation.conclusion) && (validation.classification === 'definite' || validation.classification === 'possible' || validation.classification === 'impossible')) {
      logicalValid = classifyConclusion(premises, validation.conclusion) === validation.classification && classificationText(validation.classification) === correct
    } else if (validation.kind === 'conclusion-pair' && Array.isArray(validation.conclusions) && validation.conclusions.length === 2 && validation.conclusions.every(isStatement)) {
      const follows = [isEntailed(premises, validation.conclusions[0] as CategoricalStatement), isEntailed(premises, validation.conclusions[1] as CategoricalStatement)] as const
      logicalValid = pairAnswer(follows) === correct
    } else if (validation.kind === 'either-or' && Array.isArray(validation.pair) && validation.pair.length === 2 && validation.pair.every(isStatement)) {
      logicalValid = isValidEitherOrPair(premises, validation.pair[0] as CategoricalStatement, validation.pair[1] as CategoricalStatement) && correct.startsWith('Yes,')
    }
    const texts = question.choices.map((choice) => choice.text)
    const valid = isSatisfiable(premises) && logicalValid && premises.every((premise) => question.prompt.includes(formatStatement(premise))) && hasUniqueSyllogismChoices(texts) && hasExactlyOneSyllogismAnswer(texts, correct) && question.choices.filter((choice) => choice.isCorrect).length === 1 && question.choices.find((choice) => choice.isCorrect)?.text === correct && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)
    return { valid, reason: valid ? null : 'Syllogism model validation failed.' }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Invalid Syllogism question.' }
  }
}

function make(slug: GeneratorSlug, title: string): QuestionGenerator {
  return { slug, version, title, supportedDifficulties, generate: (input) => buildQuestion(slug, input), validate }
}

export const syllogismGenerators = [
  ['universal-affirmative-syllogism', 'Universal Affirmative Syllogisms'],
  ['universal-negative-syllogism', 'Universal Negative Syllogisms'],
  ['particular-affirmative-syllogism', 'Particular Affirmative Syllogisms'],
  ['mixed-quantifier-syllogism', 'Mixed Quantifier Syllogisms'],
  ['valid-conclusion-syllogism', 'Valid and Invalid Conclusions'],
  ['venn-diagram-syllogism', 'Venn Diagram Reasoning'],
  ['possibility-conclusion-syllogism', 'Possibility Conclusions'],
  ['either-or-syllogism', 'Either-Or Conclusions'],
  ['mixed-syllogism', 'Mixed Syllogism Problems'],
].map(([slug, title]) => make(slug as GeneratorSlug, title ?? 'Syllogisms'))
