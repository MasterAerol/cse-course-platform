import { logicalDistractor, selectLogicalDistractors } from '../../domain/logical-reasoning/logical-reasoning-distractors'
import { isClosedWorldPrompt, hasExactlyOneIntendedAnswer, hasUniqueVisibleChoices } from '../../domain/logical-reasoning/logical-reasoning-validation'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const

interface Scenario {
  prompt: string
  correct: string
  distractors: ReturnType<typeof logicalDistractor>[]
  steps: string[]
  signature: string
  rule: string
}

const nouns = ['analysts', 'clerks', 'editors', 'guides', 'inspectors', 'mentors', 'planners', 'reviewers'] as const
const classes = ['amber', 'blue', 'calm', 'diligent', 'focused', 'green', 'patient', 'trained'] as const

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty) {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function distinctWords(random: ReturnType<typeof randomFor>) {
  const [subject, middle, last] = random.shuffle(classes).slice(0, 3) as [string, string, string]
  const noun = random.pick(nouns)
  return { subject, middle, last, noun }
}

function conditionalScenario(random: ReturnType<typeof randomFor>, mode: 'conditional' | 'necessary' | 'equivalence'): Scenario {
  const { subject: a, middle: b, last: c, noun } = distinctWords(random)
  if (mode === 'necessary') {
    return {
      prompt: `Use only this rule: being ${a} is sufficient for a ${noun.slice(0, -1)} to be ${b}. Which statement expresses the rule correctly?`,
      correct: `If a ${noun.slice(0, -1)} is ${a}, then it is ${b}.`,
      distractors: [
        logicalDistractor(`If a ${noun.slice(0, -1)} is ${b}, then it is ${a}.`, 'reversed_necessary_sufficient'),
        logicalDistractor(`A ${noun.slice(0, -1)} is ${a} only if it is not ${b}.`, 'misread_only_if'),
        logicalDistractor(`Every ${noun.slice(0, -1)} is both ${a} and ${b}.`, 'used_unnecessarily_strong_assumption'),
      ], steps: ['“A is sufficient for B” means A guarantees B.', 'Write the sufficient condition after if.', 'Do not reverse the arrow.'],
      signature: `necessary|${noun}|${a}|${b}`, rule: 'sufficient-condition',
    }
  }
  if (mode === 'equivalence') {
    return {
      prompt: `Use only this rule: if a ${noun.slice(0, -1)} is ${a}, then it is ${b}. Which statement is logically equivalent to the rule?`,
      correct: `If a ${noun.slice(0, -1)} is not ${b}, then it is not ${a}.`,
      distractors: [
        logicalDistractor(`If a ${noun.slice(0, -1)} is ${b}, then it is ${a}.`, 'chose_converse'),
        logicalDistractor(`If a ${noun.slice(0, -1)} is not ${a}, then it is not ${b}.`, 'chose_inverse'),
        logicalDistractor(`If a ${noun.slice(0, -1)} is ${a}, then it is not ${b}.`, 'negated_both_sides_incorrectly'),
      ], steps: ['Represent the rule as A → B.', 'Its contrapositive is not-B → not-A.', 'The converse and inverse are not equivalent.'],
      signature: `equivalence|${noun}|${a}|${b}`, rule: 'contrapositive',
    }
  }
  return {
    prompt: `Use only these facts: if a ${noun.slice(0, -1)} is ${a}, then it is ${b}; Rina is ${a}. What must follow?`,
    correct: `Rina is ${b}.`,
    distractors: [
      logicalDistractor(`Rina is ${c}.`, 'used_outside_knowledge'),
      logicalDistractor(`Rina is not ${b}.`, 'negated_both_sides_incorrectly'),
      logicalDistractor(`Every ${b} ${noun.slice(0, -1)} is ${a}.`, 'affirmed_the_consequent'),
    ], steps: ['The rule has the form A → B.', 'Rina satisfies A.', 'Modus ponens therefore gives B.'],
    signature: `conditional|${noun}|${a}|${b}|rina`, rule: 'modus-ponens',
  }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): Scenario {
  const random = randomFor(seed, slug, difficulty)
  const { subject: a, middle: b, last: c, noun } = distinctWords(random)
  const singular = noun.slice(0, -1)
  switch (slug) {
    case 'statement-classification': {
      const kind = random.integer(0, 2)
      const sentence = kind === 0 ? `All ${noun} are ${a}.` : kind === 1 ? `Are all ${noun} ${a}?` : `List the ${a} ${noun}.`
      const correct = kind === 0 ? 'A declarative proposition' : kind === 1 ? 'A question, not a proposition' : 'A command, not a proposition'
      const mistakenStatement = kind === 0 ? 'A question, not a proposition' : 'A declarative proposition'
      return { prompt: `Classify the following sentence by its logical form only: “${sentence}”`, correct, distractors: [logicalDistractor('A compound proposition', 'confused_compound_grammar_with_logic'), logicalDistractor(mistakenStatement, kind === 1 ? 'classified_question_as_statement' : 'classified_command_as_statement'), logicalDistractor('A conclusion proved by outside facts', 'used_outside_knowledge')], steps: ['Check whether the sentence asserts something truth-valued.', 'Questions and commands do not assert truth values.', `The sentence is ${correct.toLowerCase()}.`], signature: `classification|${kind}|${noun}|${a}`, rule: `classification-${kind}` }
    }
    case 'fact-opinion-conclusion':
      return { prompt: `For this item, a fact is explicitly given evidence and an opinion is a personal judgment. Given: “The log lists ${random.integer(4, 12)} ${a} ${noun}.” Which option is the fact?`, correct: `The log lists ${a} ${noun}.`, distractors: [logicalDistractor(`The ${a} ${noun} are excellent.`, 'confused_opinion_with_evidence'), logicalDistractor(`All ${noun} should be ${a}.`, 'overgeneralized_conclusion'), logicalDistractor(`The ${noun} prefer being ${a}.`, 'used_outside_knowledge')], steps: ['Use the definition supplied in the prompt.', 'The log entry is explicit evidence.', 'Judgments and unsupported preferences are not facts here.'], signature: `fact|${noun}|${a}`, rule: 'explicit-fact' }
    case 'valid-conclusion':
      return { prompt: `Use only these premises: all ${a} ${noun} are ${b}; every ${b} ${singular} is ${c}; Lio is an ${a} ${singular}. Which conclusion must be true?`, correct: `Lio is ${c}.`, distractors: [logicalDistractor(`Every ${c} ${singular} is ${a}.`, 'reversed_universal_relation'), logicalDistractor(`Lio is not ${b}.`, 'skipped_required_inference'), logicalDistractor(`All ${noun} are ${c}.`, 'overgeneralized_conclusion')], steps: ['Place Lio in the first class.', `Follow ${a} → ${b} → ${c}.`, 'Conclude only what the chain guarantees.'], signature: `conclusion|${noun}|${a}|${b}|${c}`, rule: 'two-step-deduction' }
    case 'assumption-identification':
      return { prompt: `Argument: “The rule should require every ${singular} to be ${a}, because this will ensure every ${singular} is ${b}.” Which assumption is necessary for that conclusion?`, correct: `Requiring ${a} will ensure ${b}.`, distractors: [logicalDistractor(`Every ${singular} is already ${a}.`, 'chose_irrelevant_background'), logicalDistractor(`${a} is the best possible quality.`, 'used_unnecessarily_strong_assumption'), logicalDistractor(`The conclusion is that every ${singular} is ${b}.`, 'restated_conclusion_as_assumption')], steps: ['Identify the gap between the proposal and its claimed effect.', 'The argument needs the proposed requirement to cause that effect.', 'A stronger value judgment is unnecessary.'], signature: `assumption|${noun}|${a}|${b}`, rule: 'bridge-assumption' }
    case 'conditional-reasoning': return conditionalScenario(random, 'conditional')
    case 'necessary-sufficient-condition': return conditionalScenario(random, 'necessary')
    case 'negation-contradiction':
      return { prompt: `Which option is the exact logical negation of “All ${a} ${noun} are ${b}”?`, correct: `At least one ${a} ${singular} is not ${b}.`, distractors: [logicalDistractor(`No ${a} ${noun} are ${b}.`, 'used_wrong_quantifier_negation'), logicalDistractor(`At least one ${a} ${singular} is ${b}.`, 'partially_negated_statement'), logicalDistractor(`Some ${b} ${noun} are not ${a}.`, 'chose_contrary_not_contradiction')], steps: ['Negating “all” requires one counterexample.', 'Keep the original subject class.', 'Negate the predicate for at least one member.'], signature: `negation|${noun}|${a}|${b}`, rule: 'negate-all' }
    case 'basic-deduction':
      return { prompt: `Use only these rules: ${a} implies ${b}; ${b} implies ${c}. Nia is ${a}. What follows after completing the chain?`, correct: `Nia is ${c}.`, distractors: [logicalDistractor(`Nia is not ${b}.`, 'skipped_required_inference'), logicalDistractor(`${c} implies ${a}.`, 'reversed_deduction_relation'), logicalDistractor(`Everyone is ${c}.`, 'overgeneralized_conclusion')], steps: [`Start with Nia being ${a}.`, `Apply ${a} → ${b}, then ${b} → ${c}.`, `Therefore Nia is ${c}.`], signature: `deduction|${a}|${b}|${c}|nia`, rule: 'two-step-deduction' }
    case 'logical-equivalence': return conditionalScenario(random, 'equivalence')
    case 'mixed-logical-reasoning': {
      const variant = random.integer(0, 2)
      if (variant === 0) return conditionalScenario(random, 'equivalence')
      if (variant === 1) return conditionalScenario(random, 'conditional')
      return { prompt: `Use only these premises: either Nia is ${a} or Nia is ${b}; Nia is not ${a}. What must follow?`, correct: `Nia is ${b}.`, distractors: [logicalDistractor(`Nia is ${a}.`, 'selected_may_be_true'), logicalDistractor(`Nia is neither ${a} nor ${b}.`, 'confused_not_both_with_neither'), logicalDistractor(`Nia is ${c}.`, 'used_outside_knowledge')], steps: ['One of the two stated alternatives must hold.', 'The first alternative is explicitly denied.', 'Therefore the second alternative holds.'], signature: `mixed-or|${a}|${b}|${c}`, rule: 'disjunctive-syllogism' }
    }
    default: throw new Error(`Unsupported logical generator: ${slug}`)
  }
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty)
  const distractors = selectLogicalDistractors(scenario.correct, scenario.distractors)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([
    { text: scenario.correct, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: 1 },
    ...distractors.map((choice, index) => ({ text: choice.text, isCorrect: false, distractorType: choice.mistakeType, mistakeType: choice.mistakeType, derivation: { operation: choice.mistakeType, inputs: [index + 1] }, qualityScore: 0.9, numericValue: index + 2 })),
  ])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { rule: scenario.rule, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Logical reasoning solution', steps: scenario.steps, finalAnswer: scenario.correct }, metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const recomputed = buildScenario(question.generatorSlug, question.seed, question.difficulty)
    const correct = question.choices.find((choice) => choice.isCorrect)
    const valid = question.generatorVersion === version && isClosedWorldPrompt(question.prompt) && question.prompt === recomputed.prompt && question.parameters.recomputedCorrect === recomputed.correct && question.choices.length === 4 && hasExactlyOneIntendedAnswer(question.choices) && hasUniqueVisibleChoices(question.choices.map((choice) => choice.text)) && correct?.text === recomputed.correct && question.explanation.finalAnswer === recomputed.correct && question.explanation.steps.length >= 3 && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)
    return { valid, reason: valid ? null : 'The generated logical-reasoning question failed recomputation or structural validation.' }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Invalid logical-reasoning question.' }
  }
}

const definitions = [
  ['statement-classification', 'Statement Classification'],
  ['fact-opinion-conclusion', 'Fact, Opinion, and Conclusion'],
  ['valid-conclusion', 'Valid Conclusions'],
  ['assumption-identification', 'Assumption Identification'],
  ['conditional-reasoning', 'Conditional Reasoning'],
  ['necessary-sufficient-condition', 'Necessary and Sufficient Conditions'],
  ['negation-contradiction', 'Negation and Contradiction'],
  ['basic-deduction', 'Basic Deduction'],
  ['logical-equivalence', 'Logical Equivalence'],
  ['mixed-logical-reasoning', 'Mixed Logical Reasoning'],
] as const satisfies readonly (readonly [GeneratorSlug, string])[]

export const logicalReasoningGenerators = definitions.map(([slug, title]) => ({
  slug, version, title, supportedDifficulties,
  generate(input) { return buildQuestion(slug, input) },
  validate: validateQuestion,
})) satisfies readonly QuestionGenerator[]
