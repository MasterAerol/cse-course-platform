import { describe, expect, it } from 'vitest'

import { contextCluesBankV1 } from '../src/worker/domain/context-clues/context-clues-bank'
import { hasTwoSentenceSupport, partOfSpeechMatches, replacementFits, senseIsDisambiguated, senseMatches, signalMatches, validSentenceTemplate } from '../src/worker/domain/context-clues/context-clues-rules'
import { uniqueContextAnswer, uniqueContextChoices, validateContextCluesBank } from '../src/worker/domain/context-clues/context-clues-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['definition-context-clue', 'synonym-context-clue', 'antonym-contrast-clue', 'example-illustration-clue', 'cause-effect-context-clue', 'general-sense-context-clue', 'multiple-meaning-context-clue', 'two-sentence-context-clue', 'mixed-context-clues'] as const satisfies readonly GeneratorSlug[]

describe('Context Clues pure utilities', () => {
  it('keeps the curated bank internally consistent', () => {
    expect(contextCluesBankV1).toHaveLength(8)
    expect(validateContextCluesBank()).toEqual([])
    expect(new Set(contextCluesBankV1.map((item) => item.target)).size).toBe(contextCluesBankV1.length)
    expect(contextCluesBankV1.every(validSentenceTemplate)).toBe(true)
    expect(contextCluesBankV1.every((item) => signalMatches(item.clueType, item.signal))).toBe(true)
    expect(contextCluesBankV1.every((item) => senseIsDisambiguated(item.target))).toBe(true)
  })

  it('validates senses, grammar, replacement frames, and two-sentence support', () => {
    expect(senseMatches('file', 'submit-v')).toBe(true)
    expect(partOfSpeechMatches('file', 'verb')).toBe(true)
    expect(replacementFits('file', 'submit')).toBe(true)
    expect(hasTwoSentenceSupport('obsolete')).toBe(true)
    expect(uniqueContextChoices(['one', 'two', 'three', 'four'])).toBe(true)
    expect(uniqueContextAnswer(['one', 'two', 'three', 'four'], 'three')).toBe(true)
  })
})

describe('Context Clues generator registry', () => {
  it.each(slugs)('registers %s version 1 for all difficulties', (slug) => {
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
        const input = { seed: `context-clues-${slug}-${index}`, difficulty }
        const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} seed ${index}: ${validation.reason ?? 'unknown'}`)
        expect(question.prompt).not.toMatch(/undefined|NaN|â€œ|â€/u)
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('context_') === true && choice.derivation !== null)).toBe(true)
      }
    }
  }, 120_000)

  it.each(slugs)('creates five unique immutable snapshots for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `context-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
