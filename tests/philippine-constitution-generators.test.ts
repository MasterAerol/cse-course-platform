import { describe, expect, it } from 'vitest'
import { philippineConstitutionBankV1 } from '../src/worker/domain/philippine-constitution/philippine-constitution-bank'
import { amendmentProcessValid, commissionRoleValid, rejectsCurrentPoliticalContent, rightClassificationValid, sourceMetadataComplete, validArticleSection } from '../src/worker/domain/philippine-constitution/philippine-constitution-rules'
import { validateConstitutionBank } from '../src/worker/domain/philippine-constitution/philippine-constitution-validation'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['constitution-structure-principles','bill-of-rights','citizenship-suffrage','legislative-department','executive-department','judicial-department','constitutional-commissions','public-officer-accountability','local-government-economy-amendments','mixed-philippine-constitution'] as const satisfies readonly GeneratorSlug[]
const difficulties = ['easy','medium','hard'] as const satisfies readonly GeneratorDifficulty[]

describe('source-locked Philippine Constitution bank', () => {
  it('requires complete authoritative metadata and valid Article/Section identifiers', () => {
    expect(validateConstitutionBank()).toEqual([])
    expect(philippineConstitutionBankV1).toHaveLength(27)
    expect(new Set(philippineConstitutionBankV1.map((entry) => entry.id)).size).toBe(27)
    for (const entry of philippineConstitutionBankV1) {
      expect(sourceMetadataComplete(entry.source)).toBe(true)
      expect(validArticleSection(entry.article, entry.section)).toBe(true)
      expect(entry.paraphrase).toBe(entry.source.paraphrasedRule)
      expect(entry.source.sourceUrl).toBe('https://lawphil.net/consti/cons1987.html')
      expect(rejectsCurrentPoliticalContent(JSON.stringify(entry))).toBe(true)
      expect(rightClassificationValid(entry)).toBe(true)
      expect(commissionRoleValid(entry)).toBe(true)
      expect(amendmentProcessValid(entry)).toBe(true)
    }
  })

  it('rejects unsourced and current-political content', () => {
    expect(sourceMetadataComplete({ ...philippineConstitutionBankV1[0].source, provisionId: '' })).toBe(false)
    expect(rejectsCurrentPoliticalContent('The current officeholder decides the constitutional rule.')).toBe(false)
    expect(rejectsCurrentPoliticalContent('A proposed amendment is already settled law.')).toBe(false)
  })
})

describe('Dynamic Constitution Generator Engine v1', () => {
  it('registers all ten generators at version 1 for every difficulty', () => {
    for (const slug of slugs) expect(getGenerator(slug, 1)?.supportedDifficulties).toEqual(difficulties)
  })

  it('generates 1,000 deterministic source-verified questions per generator, 10,000 total', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1)!
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const input = { seed: `constitution-stress-${slug}-${index}`, difficulty }
        const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        expect(generator.validate(question)).toEqual({ valid: true, reason: null })
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('constitution_') === true && choice.derivation !== null)).toBe(true)
        expect(sourceMetadataComplete(question.parameters.source as typeof philippineConstitutionBankV1[number]['source'])).toBe(true)
        expect(question.explanation.steps.some((step) => step.includes(String(question.parameters.article)) && step.includes(String(question.parameters.section)))).toBe(true)
        expect(rejectsCurrentPoliticalContent(`${question.prompt} ${question.choices.map((choice) => choice.text).join(' ')}`)).toBe(true)
      }
    }
  }, 180_000)

  it('creates unique 2/2/1 five-question practice attempts for every focused generator', () => {
    for (const slug of slugs.slice(0, 9)) {
      const signatures = new Set<string>(); const prompts = new Set<string>(); const plan: GeneratorDifficulty[] = ['easy','easy','medium','medium','hard']
      const questions = plan.map((difficulty, index) => { const question = generateValidatedQuestion({ attemptSeed: `practice-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position: index + 1, existingSignatures: signatures, existingPrompts: prompts, maxRetries: 40 }); signatures.add(question.metadata.canonicalSignature); prompts.add(question.prompt.trim().toLowerCase()); return question })
      expect(questions).toHaveLength(5)
      expect(signatures.size).toBe(5)
      expect(prompts.size).toBe(5)
    }
  })
})