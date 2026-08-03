import { contextCluesBankV1 } from '../../domain/context-clues/context-clues-bank'
import { contextDistractor, selectContextDistractors } from '../../domain/context-clues/context-clues-distractors'
import { clueTypeLabel, contextNumericValue } from '../../domain/context-clues/context-clues-format'
import { uniqueContextAnswer, uniqueContextChoices } from '../../domain/context-clues/context-clues-validation'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const slugs = ['definition-context-clue', 'synonym-context-clue', 'antonym-contrast-clue', 'example-illustration-clue', 'cause-effect-context-clue', 'general-sense-context-clue', 'multiple-meaning-context-clue', 'two-sentence-context-clue', 'mixed-context-clues'] as const satisfies readonly GeneratorSlug[]
const types = ['definition', 'synonym', 'contrast', 'example', 'cause_effect', 'general_sense', 'multiple_meaning', 'two_sentence'] as const
const mistakes = ['context_wrong_sense', 'context_related_not_equivalent', 'context_wrong_part_of_speech'] as const
const promptFrames = [
  (text: string, target: string) => `In "${text}" what does "${target}" mean?`,
  (text: string, target: string, label: string) => `Which meaning is supported for "${target}" by this ${label} clue: "${text}"`,
  (text: string, target: string) => `Read the context: "${text}" Choose the intended meaning of "${target}."`,
  (text: string, target: string) => `Which option best explains "${target}" as it is used here: "${text}"`,
  (text: string, target: string) => `Use the surrounding words in "${text}" to interpret "${target}."`,
  (text: string, target: string) => `What meaning of "${target}" makes the full sentence logical? "${text}"`,
  (text: string, target: string, label: string) => `Apply the ${label} clue in "${text}" What is the meaning of "${target}"?`,
  (text: string, target: string) => `Select the context-supported definition of "${target}" in this passage: "${text}"`,
] as const

const pool = (slug: GeneratorSlug) => {
  const index = slugs.indexOf(slug as (typeof slugs)[number])
  const entries = index === 8 ? contextCluesBankV1 : contextCluesBankV1.filter((entry) => entry.clueType === types[index])
  return entries.flatMap((entry) => promptFrames.map((frame, variant) => ({ entry, variant, prompt: frame(entry.text, entry.target, clueTypeLabel(entry.clueType)) })))
}

function build(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const random = createSeededRandom(`${input.seed}|${slug}|1|${input.difficulty}`)
  const scenario = random.pick(pool(slug))
  const entry = scenario.entry
  const distractors = selectContextDistractors(entry.meaning, [
    contextDistractor(entry.alternateSenses[0] ?? 'a different familiar sense', mistakes[0]),
    contextDistractor(entry.alternateSenses[1] ?? 'a related but unsupported idea', mistakes[1]),
    contextDistractor(`the act connected with ${entry.target}`, mistakes[2]),
  ])
  const choices = random.shuffle([
    { text: entry.meaning, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: contextNumericValue(entry.meaning) },
    ...distractors.map((distractor) => ({ text: distractor.text, isCorrect: false, distractorType: distractor.mistakeType, mistakeType: distractor.mistakeType, derivation: { operation: distractor.mistakeType, inputs: [contextNumericValue(distractor.text)] }, qualityScore: distractor.qualityScore, numericValue: contextNumericValue(distractor.text) })),
  ])
  return {
    generatorSlug: slug,
    generatorVersion: 1,
    difficulty: input.difficulty,
    seed: input.seed,
    prompt: scenario.prompt,
    parameters: { targetWord: entry.target, senseId: entry.senseId, clueType: entry.clueType, recomputedCorrect: entry.meaning, scenarioSignature: `${entry.clueType}|${entry.target}|${scenario.variant}` },
    choices,
    explanation: { title: 'Context Clues solution', steps: [`This is a ${clueTypeLabel(entry.clueType)} clue.`, `The support "${entry.support}" points to "${entry.meaning}."`, 'The other choices represent a different sense, a related but unsupported idea, or the wrong grammatical role.'], finalAnswer: entry.meaning },
    metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${entry.target}|${scenario.variant}` },
  }
}

const validate = (question: GeneratedQuestion): GeneratorValidationResult => {
  const choices = question.choices.map((choice) => choice.text)
  const answer = question.parameters.recomputedCorrect
  const valid = typeof answer === 'string' && uniqueContextChoices(choices) && uniqueContextAnswer(choices, answer) && question.choices.filter((choice) => choice.isCorrect).length === 1 && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('context_') === true && choice.derivation !== null)
  return { valid, reason: valid ? null : 'Context clue validation failed.' }
}

const make = (slug: GeneratorSlug): QuestionGenerator => ({ slug, version: 1, title: slug.replaceAll('-', ' '), supportedDifficulties: ['easy', 'medium', 'hard'], generate: (input) => build(slug, input), validate })
export const contextCluesGenerators = slugs.map(make)

