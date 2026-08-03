import { describe, expect, it } from 'vitest'

import { subjectVerbAgreementBankV1 } from '../src/worker/domain/subject-verb-agreement/subject-verb-agreement-bank'
import { agreementAnswerMatches, agreementSentenceValid, classifyIndefinitePronoun, classifySubjectNumber, classifySubjectPerson, collectiveQuantityValid, compoundSubjectValid, indefinitePronounValid, interveningPhraseValid, invertedSubjectValid, proximityAgreementValid, reconstructAgreementSentence, selectSimplePresentForm, specialCaseValid, verbFormValid } from '../src/worker/domain/subject-verb-agreement/subject-verb-agreement-rules'
import { uniqueAgreementAnswer, uniqueAgreementChoices, validateSubjectVerbAgreementBank } from '../src/worker/domain/subject-verb-agreement/subject-verb-agreement-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['basic-subject-verb-agreement', 'compound-subject-agreement', 'either-or-neither-nor-agreement', 'indefinite-pronoun-agreement', 'collective-quantity-agreement', 'intervening-phrase-agreement', 'inverted-sentence-agreement', 'special-case-agreement', 'mixed-subject-verb-agreement'] as const satisfies readonly GeneratorSlug[]

describe('Subject–Verb Agreement pure utilities', () => {
  it('keeps the 24-entry bank complete and internally consistent', () => {
    expect(subjectVerbAgreementBankV1).toHaveLength(24)
    expect(validateSubjectVerbAgreementBank()).toEqual([])
    expect(new Set(subjectVerbAgreementBankV1.map((entry) => entry.id)).size).toBe(24)
    expect(new Set(subjectVerbAgreementBankV1.map((entry) => entry.skill)).size).toBe(8)
    for (const skill of new Set(subjectVerbAgreementBankV1.map((entry) => entry.skill))) expect(new Set(subjectVerbAgreementBankV1.filter((entry) => entry.skill === skill).map((entry) => entry.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']))
  })

  it('selects regular, be, have, and do forms by number and person', () => {
    expect(selectSimplePresentForm('submit', 'singular', 'third')).toBe('submits')
    expect(selectSimplePresentForm('submit', 'plural', 'third')).toBe('submit')
    expect(selectSimplePresentForm('be', 'singular', 'third')).toBe('is')
    expect(selectSimplePresentForm('be', 'plural', 'third')).toBe('are')
    expect(selectSimplePresentForm('have', 'singular', 'third')).toBe('has')
    expect(selectSimplePresentForm('do', 'singular', 'third')).toBe('does')
  })

  it('validates basic, compound, proximity, and indefinite agreement', () => {
    const basic = subjectVerbAgreementBankV1.find((entry) => entry.id === 'basic-applicant-easy')!
    expect(classifySubjectNumber(basic)).toBe('singular')
    expect(classifySubjectPerson(basic)).toBe('third')
    expect(verbFormValid(basic)).toBe(true)
    expect(reconstructAgreementSentence(basic, 'submits')).toBe(basic.completedSentence)
    expect(agreementAnswerMatches(basic, 'submits')).toBe(true)
    expect(compoundSubjectValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'compound-every-medium')!)).toBe(true)
    expect(proximityAgreementValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'proximity-plural-medium')!)).toBe(true)
    expect(classifyIndefinitePronoun('Each')).toBe('singular')
    expect(classifyIndefinitePronoun('Several')).toBe('plural')
    expect(classifyIndefinitePronoun('Some')).toBe('context')
    expect(indefinitePronounValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'indefinite-some-water-hard')!)).toBe(true)
  })

  it('validates collective, quantity, intervening, inverted, and special rules', () => {
    expect(collectiveQuantityValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'collective-committee-easy')!)).toBe(true)
    expect(collectiveQuantityValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'quantity-half-files-hard')!)).toBe(true)
    expect(interveningPhraseValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'intervening-along-hard')!)).toBe(true)
    expect(invertedSubjectValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'inverted-several-medium')!)).toBe(true)
    expect(specialCaseValid(subjectVerbAgreementBankV1.find((entry) => entry.id === 'special-number-hard')!)).toBe(true)
    expect(subjectVerbAgreementBankV1.every(agreementSentenceValid)).toBe(true)
    expect(uniqueAgreementChoices(['is', 'are', 'was', 'be'])).toBe(true)
    expect(uniqueAgreementAnswer(['is', 'are', 'was', 'be'], 'is')).toBe(true)
  })
})

describe('Subject–Verb Agreement generator registry', () => {
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
        const input = { seed: `agreement-${slug}-${index}`, difficulty }
        const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question)
        if (!validation.valid) throw new Error(`${slug} seed ${index}: ${validation.reason ?? 'unknown'}`)
        expect(question.prompt).toContain('____')
        expect(question.prompt).not.toMatch(/undefined|NaN|â/iu)
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('agreement_') === true && choice.derivation !== null)).toBe(true)
        expect(question.explanation.steps.join(' ')).toContain('grammatical subject')
      }
    }
  }, 120_000)

  it.each(slugs)('creates five unique immutable snapshots for %s', (slug) => {
    const signatures = new Set<string>()
    const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) {
      const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'
      const question = generateValidatedQuestion({ attemptSeed: `agreement-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())
    }
    expect(signatures.size).toBe(5)
    expect(prompts.size).toBe(5)
  })
})
