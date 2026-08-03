import { describe, expect, it } from 'vitest'

import { grammarUsageBankV1 } from '../src/worker/domain/grammar-usage/grammar-usage-bank'
import { articleDeterminerValid, commonUsageValid, comparisonValid, conjunctionRelationshipValid, correlativePairValid, countabilityValid, partOfSpeechMatches, prepositionPatternValid, reconstructGrammarSentence, semanticRuleMatch, sentenceCorrectnessValid, tenseValid, timeMarkerCompatible } from '../src/worker/domain/grammar-usage/grammar-usage-rules'
import { uniqueGrammarAnswer, uniqueGrammarChoices, validateGrammarUsageBank } from '../src/worker/domain/grammar-usage/grammar-usage-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['part-of-speech-usage', 'verb-tense-consistency', 'article-determiner-usage', 'preposition-usage', 'conjunction-usage', 'comparative-superlative-usage', 'commonly-misused-expression', 'correct-sentence-usage', 'mixed-grammar-usage'] as const satisfies readonly GeneratorSlug[]

describe('Grammar and Correct Usage pure utilities', () => {
  it('keeps the versioned bank complete and internally consistent', () => {
    expect(grammarUsageBankV1).toHaveLength(24)
    expect(validateGrammarUsageBank()).toEqual([])
    expect(new Set(grammarUsageBankV1.map((entry) => entry.id)).size).toBe(24)
    expect(grammarUsageBankV1.every(sentenceCorrectnessValid)).toBe(true)
    expect(new Set(grammarUsageBankV1.map((entry) => entry.skill)).size).toBe(8)
    for (const skill of new Set(grammarUsageBankV1.map((entry) => entry.skill))) expect(new Set(grammarUsageBankV1.filter((entry) => entry.skill === skill).map((entry) => entry.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']))
  })

  it('validates part of speech, tense, time markers, and reconstruction', () => {
    const entry = grammarUsageBankV1.find((item) => item.id === 'pos-verb-hard')!
    expect(reconstructGrammarSentence(entry, entry.correctChoice)).toBe(entry.completedSentence)
    expect(partOfSpeechMatches(entry, 'verb')).toBe(true)
    expect(tenseValid(entry, 'past')).toBe(true)
    expect(timeMarkerCompatible(entry)).toBe(true)
    expect(semanticRuleMatch(entry, 'organized')).toBe(true)
  })

  it('validates articles, countability, prepositions, conjunctions, comparisons, and usage', () => {
    expect(articleDeterminerValid(grammarUsageBankV1.find((item) => item.id === 'article-the-medium')!)).toBe(true)
    expect(countabilityValid(grammarUsageBankV1.find((item) => item.id === 'determiner-many-hard')!)).toBe(true)
    expect(prepositionPatternValid(grammarUsageBankV1.find((item) => item.id === 'prep-comply-medium')!)).toBe(true)
    expect(conjunctionRelationshipValid(grammarUsageBankV1.find((item) => item.id === 'conj-result-easy')!)).toBe(true)
    expect(correlativePairValid(grammarUsageBankV1.find((item) => item.id === 'conj-correlative-hard')!)).toBe(true)
    expect(comparisonValid(grammarUsageBankV1.find((item) => item.id === 'comparison-fewer-hard')!)).toBe(true)
    expect(commonUsageValid(grammarUsageBankV1.find((item) => item.id === 'misused-affect-medium')!)).toBe(true)
    expect(uniqueGrammarChoices(['one', 'two', 'three', 'four'])).toBe(true)
    expect(uniqueGrammarAnswer(['one', 'two', 'three', 'four'], 'two')).toBe(true)
  })
})

describe('Grammar and Correct Usage generator registry', () => {
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
        const input = { seed: `grammar-usage-${slug}-${index}`, difficulty }
        const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} seed ${index}: ${validation.reason ?? 'unknown'}`)
        expect(question.prompt).not.toMatch(/undefined|NaN|â/iu)
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('grammar_') === true && choice.derivation !== null)).toBe(true)
        expect(question.explanation.steps.join(' ')).toContain('standard form')
      }
    }
  }, 120_000)

  it.each(slugs)('creates five unique immutable snapshots for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `grammar-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
