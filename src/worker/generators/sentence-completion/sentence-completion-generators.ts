import { findSentenceCompletionEntry, sentenceCompletionBankV1 } from '../../domain/sentence-completion/sentence-completion-bank'
import { selectSentenceCompletionDistractors, sentenceCompletionDistractor } from '../../domain/sentence-completion/sentence-completion-distractors'
import { displaySentenceCompletion, sentenceCompletionNumericValue, sentenceSkillLabel } from '../../domain/sentence-completion/sentence-completion-format'
import { blankPositionsValid, doubleBlankPairValid, naturalCompletedSentence, parallelFormValid, semanticCompatibility, transitionRelationshipValid } from '../../domain/sentence-completion/sentence-completion-rules'
import { uniqueSentenceAnswer, uniqueSentenceChoices } from '../../domain/sentence-completion/sentence-completion-validation'
import type { SentenceCompletionSkill } from '../../domain/sentence-completion/sentence-completion.types'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const slugs = ['grammar-fit-completion', 'meaning-fit-completion', 'transition-word-completion', 'cause-effect-completion', 'contrast-comparison-completion', 'parallel-idea-completion', 'tone-formality-completion', 'double-blank-completion', 'mixed-sentence-completion'] as const satisfies readonly GeneratorSlug[]
const skills = ['grammar_fit', 'meaning_fit', 'transition', 'cause_effect', 'contrast_comparison', 'parallel', 'tone_formality', 'double_blank'] as const satisfies readonly SentenceCompletionSkill[]
const promptFrames = [
  (template: string) => `Choose the best completion: "${template}"`,
  (template: string) => `Which option completes this sentence correctly and logically? "${template}"`,
  (template: string, skill: string) => `Apply ${skill} reasoning to complete: "${template}"`,
] as const

function scenarioPool(slug: GeneratorSlug, difficulty: GeneratorDifficulty) { const index = slugs.indexOf(slug as (typeof slugs)[number]); const entries = (index === 8 ? sentenceCompletionBankV1 : sentenceCompletionBankV1.filter((entry) => entry.skill === skills[index])).filter((entry) => entry.difficulty === difficulty); return entries.flatMap((entry) => promptFrames.map((frame, variant) => ({ entry, variant, prompt: frame(entry.sentenceTemplate, sentenceSkillLabel(entry.skill)) }))) }

function build(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const random = createSeededRandom(`${input.seed}|${slug}|1|${input.difficulty}`)
  const scenario = random.pick(scenarioPool(slug, input.difficulty))
  const entry = scenario.entry
  const distractors = selectSentenceCompletionDistractors(entry.correctCompletion, entry.distractors.map((item) => sentenceCompletionDistractor(item.text, item.mistakeType)))
  const choices = random.shuffle([
    { text: displaySentenceCompletion(entry.correctCompletion), raw: entry.correctCompletion, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1 },
    ...distractors.map((item) => ({ text: displaySentenceCompletion(item.text), raw: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [sentenceCompletionNumericValue(item.text)] }, qualityScore: item.qualityScore })),
  ]).map(({ raw, ...choice }) => ({ ...choice, numericValue: sentenceCompletionNumericValue(raw) }))
  return {
    generatorSlug: slug,
    generatorVersion: 1,
    difficulty: input.difficulty,
    seed: input.seed,
    prompt: scenario.prompt,
    parameters: { entryId: entry.id, skill: entry.skill, blankCount: entry.blankCount, recomputedCorrect: displaySentenceCompletion(entry.correctCompletion), scenarioSignature: `${entry.id}|${scenario.variant}` },
    choices,
    explanation: { title: 'Sentence Completion solution', steps: [`The primary skill is ${sentenceSkillLabel(entry.skill)}.`, entry.explanationRationale, `The completed sentence is: "${entry.completedSentence}"`, 'Each rejected choice models a documented grammar, logic, transition, parallelism, tone, or paired-blank mistake.'], finalAnswer: displaySentenceCompletion(entry.correctCompletion) },
    metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${entry.id}|${scenario.variant}` },
  }
}

function validate(question: GeneratedQuestion): GeneratorValidationResult { const entryId = question.parameters.entryId; const answer = question.parameters.recomputedCorrect; const entry = typeof entryId === 'string' ? findSentenceCompletionEntry(entryId) : null; const choices = question.choices.map((choice) => choice.text); const rawAnswer = entry?.correctCompletion ?? ''; const valid = entry !== null && typeof answer === 'string' && answer === displaySentenceCompletion(rawAnswer) && blankPositionsValid(entry) && naturalCompletedSentence(entry) && semanticCompatibility(entry, rawAnswer) && transitionRelationshipValid(entry) && parallelFormValid(entry) && doubleBlankPairValid(entry, rawAnswer) && uniqueSentenceChoices(choices) && uniqueSentenceAnswer(choices, answer) && question.choices.filter((choice) => choice.isCorrect).length === 1 && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('sentence_') === true && choice.derivation !== null); return { valid, reason: valid ? null : 'Sentence completion validation failed.' } }

const make = (slug: GeneratorSlug): QuestionGenerator => ({ slug, version: 1, title: slug.replaceAll('-', ' '), supportedDifficulties: ['easy', 'medium', 'hard'], generate: (input) => build(slug, input), validate })
export const sentenceCompletionGenerators = slugs.map(make)

