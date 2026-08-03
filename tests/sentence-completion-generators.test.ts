import { describe, expect, it } from 'vitest'

import { sentenceCompletionBankV1 } from '../src/worker/domain/sentence-completion/sentence-completion-bank'
import { blankPositionsValid, countSentenceBlanks, doubleBlankPairValid, naturalCompletedSentence, parallelFormValid, partOfSpeechMatches, reconstructSentence, semanticCompatibility, tenseAndNumberMatch, toneAndFormalityMatch, transitionRelationshipValid } from '../src/worker/domain/sentence-completion/sentence-completion-rules'
import { uniqueSentenceAnswer, uniqueSentenceChoices, validateSentenceCompletionBank } from '../src/worker/domain/sentence-completion/sentence-completion-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['grammar-fit-completion', 'meaning-fit-completion', 'transition-word-completion', 'cause-effect-completion', 'contrast-comparison-completion', 'parallel-idea-completion', 'tone-formality-completion', 'double-blank-completion', 'mixed-sentence-completion'] as const satisfies readonly GeneratorSlug[]

describe('Sentence Completion pure utilities', () => {
  it('keeps the versioned bank complete and internally consistent', () => {
    expect(sentenceCompletionBankV1).toHaveLength(24)
    expect(validateSentenceCompletionBank()).toEqual([])
    expect(new Set(sentenceCompletionBankV1.map((entry) => entry.id)).size).toBe(24)
    expect(sentenceCompletionBankV1.every(blankPositionsValid)).toBe(true)
    expect(sentenceCompletionBankV1.every(naturalCompletedSentence)).toBe(true)
    expect(new Set(sentenceCompletionBankV1.map((entry) => entry.skill)).size).toBe(8)
    for (const skill of new Set(sentenceCompletionBankV1.map((entry) => entry.skill))) expect(new Set(sentenceCompletionBankV1.filter((entry) => entry.skill === skill).map((entry) => entry.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']))
  })

  it('validates blank positions, reconstruction, part of speech, tense, and number', () => {
    const grammar = sentenceCompletionBankV1.find((entry) => entry.id === 'grammar-past-hard')!
    expect(countSentenceBlanks(grammar.sentenceTemplate)).toBe(1)
    expect(reconstructSentence(grammar.sentenceTemplate, grammar.correctCompletion)).toBe(grammar.completedSentence)
    expect(partOfSpeechMatches(grammar, 'verb')).toBe(true)
    expect(tenseAndNumberMatch(grammar, 'past', 'singular')).toBe(true)
    expect(semanticCompatibility(grammar, 'reviewed')).toBe(true)
  })

  it('validates transitions, parallelism, tone, formality, and double-blank pairs', () => {
    const transition = sentenceCompletionBankV1.find((entry) => entry.id === 'transition-contrast-medium')!
    const parallel = sentenceCompletionBankV1.find((entry) => entry.id === 'parallel-gerunds-easy')!
    const tone = sentenceCompletionBankV1.find((entry) => entry.id === 'tone-requested-easy')!
    const pair = sentenceCompletionBankV1.find((entry) => entry.id === 'double-road-hard')!
    expect(transitionRelationshipValid(transition)).toBe(true)
    expect(parallelFormValid(parallel)).toBe(true)
    expect(toneAndFormalityMatch(tone, 'courteous', 'formal')).toBe(true)
    expect(doubleBlankPairValid(pair, 'slippery | cautiously')).toBe(true)
    expect(doubleBlankPairValid(pair, 'slippery | rapidly')).toBe(false)
    expect(uniqueSentenceChoices(['one', 'two', 'three', 'four'])).toBe(true)
    expect(uniqueSentenceAnswer(['one', 'two', 'three', 'four'], 'two')).toBe(true)
  })
})

describe('Sentence Completion generator registry', () => {
  it.each(slugs)('registers %s version 1 for every difficulty', (slug) => {
    const generator = getGenerator(slug, 1)
    expect(generator).not.toBeNull()
    expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
  })

  it('stress-validates 1,000 deterministic questions per generator (9,000 total)', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)
      if (generator === null) throw new Error(`Missing ${slug}`)
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'
        const input = { seed: `sentence-completion-${slug}-${index}`, difficulty }
        const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} seed ${index}: ${validation.reason ?? 'unknown'}`)
        expect(question.prompt).toContain('____')
        expect(question.prompt).not.toMatch(/undefined|NaN|â/iu)
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('sentence_') === true && choice.derivation !== null)).toBe(true)
        expect(question.explanation.steps.join(' ')).toContain('completed sentence')
      }
    }
  }, 120_000)

  it.each(slugs)('creates five unique immutable snapshots for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `sentence-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
