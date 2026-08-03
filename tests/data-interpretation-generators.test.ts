import { describe, expect, it } from 'vitest'
import { accessibleDataText } from '../src/worker/domain/data-interpretation/data-interpretation-format'
import { isValidDataDisplay, validateDataDisplay } from '../src/worker/domain/data-interpretation/data-display-validation'
import { absoluteDifference, arithmeticMean, percentChange, percentageShare, pieDegrees, piePercentage, simplifiedRatio, sum, weightedMean } from '../src/worker/domain/data-interpretation/data-interpretation-math'
import type { DataDisplay } from '../src/worker/domain/data-interpretation/data-interpretation.types'
import { recomputeDataAnswer } from '../src/worker/generators/data-interpretation/data-interpretation-generators'
import { generateValidatedQuestion, getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorDifficulty, GeneratorSlug } from '../src/worker/generators/generator.types'

const slugs = ['table-interpretation', 'bar-chart-interpretation', 'line-graph-interpretation', 'pie-chart-interpretation', 'percentage-ratio-data', 'totals-differences-comparisons', 'average-weighted-data', 'multi-step-data-interpretation', 'mixed-data-interpretation'] as const satisfies readonly GeneratorSlug[]
const validDisplay: DataDisplay = { type: 'table', title: 'Output', unit: 'items', categories: ['A', 'B', 'C'], series: [{ name: 'Week 1', values: [10, 20, 30] }, { name: 'Week 2', values: [20, 30, 40] }], legend: ['Week 1', 'Week 2'], accessibleText: 'Output table' }

describe('Data Interpretation pure utilities', () => {
  it('computes lookup, totals, differences, shares, changes, ratios, and means', () => {
    expect(sum([10, 20, 30])).toBe(60)
    expect(absoluteDifference(20, 55)).toBe(35)
    expect(percentageShare(30, 120)).toBe(25)
    expect(percentChange(80, 100)).toBe(25)
    expect(simplifiedRatio(18, 24)).toEqual([3, 4])
    expect(arithmeticMean([10, 20, 30])).toBe(20)
    expect(weightedMean([70, 90], [1, 3])).toBe(85)
    expect(pieDegrees(25)).toBe(90)
    expect(piePercentage(90)).toBe(25)
    expect(recomputeDataAnswer(validDisplay, { kind: 'sum-series', series: 0 })).toBe(60)
    expect(recomputeDataAnswer(validDisplay, { kind: 'difference', series: 1, first: 0, second: 2 })).toBe(20)
  })

  it('validates dimensions, scales, pie totals, and accessible text', () => {
    expect(isValidDataDisplay(validDisplay)).toBe(true)
    expect(accessibleDataText({ ...validDisplay, accessibleText: undefined } as never)).toContain('Category | Week 1 | Week 2')
    expect(validateDataDisplay({ ...validDisplay, series: [{ name: 'Broken', values: [1] }] }).length).toBeGreaterThan(0)
    expect(validateDataDisplay({ ...validDisplay, accessibleText: '' })).toContain('Accessible text is required.')
    expect(validateDataDisplay({ ...validDisplay, type: 'pie', series: [{ name: 'Share', values: [20, 20, 20] }], legend: ['Share'] })).toContain('Pie values must sum to exactly 100 percent.')
    expect(validateDataDisplay({ ...validDisplay, axis: { minimum: 10, maximum: 100, interval: 10 } })).toContain('Axis scale is invalid.')
  })
})

describe('Data Interpretation generator registry', () => {
  it.each(slugs)('registers %s version 1', (slug) => expect(getGenerator(slug, 1)?.supportedDifficulties).toEqual(['easy', 'medium', 'hard']))

  it('stress-validates 1,000 deterministic questions per generator', () => {
    for (const slug of slugs) {
      const generator = getGenerator(slug, 1); if (generator === null) throw new Error(`Missing ${slug}`); const prompts = new Set<string>()
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty: GeneratorDifficulty = (['easy', 'medium', 'hard'] as const)[index % 3] ?? 'easy'; const input = { seed: `data-${slug}-${index}`, difficulty }; const question = generator.generate(input)
        expect(generator.generate(input)).toEqual(question)
        const validation = generator.validate(question); if (!validation.valid) throw new Error(`${slug} failed seed ${index}: ${validation.reason ?? 'unknown'}`)
        const display = question.parameters.display as DataDisplay
        expect(isValidDataDisplay(display)).toBe(true)
        expect(question.prompt).toContain(display.accessibleText)
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map(({ text }) => text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter(({ isCorrect }) => isCorrect)).toHaveLength(1)
        expect(question.choices.filter(({ isCorrect }) => !isCorrect).every(({ mistakeType, derivation }) => mistakeType?.startsWith('data_') === true && derivation !== null)).toBe(true)
        if (index < 25) prompts.add(question.prompt.trim().toLowerCase())
      }
      if (prompts.size !== 25) throw new Error(`${slug} produced only ${prompts.size} unique prompts in the first 25 seeds.`)
    }
  }, 180_000)

  it.each(slugs)('creates five immutable unique questions for %s', (slug) => {
    const signatures = new Set<string>(); const prompts = new Set<string>()
    for (let position = 1; position <= 5; position += 1) { const difficulty: GeneratorDifficulty = position <= 2 ? 'easy' : position <= 4 ? 'medium' : 'hard'; const question = generateValidatedQuestion({ attemptSeed: `data-attempt-${slug}`, generatorSlug: slug, generatorVersion: 1, difficulty, position, existingSignatures: signatures, existingPrompts: prompts }); signatures.add(question.metadata.canonicalSignature); prompts.add(question.prompt.trim().toLowerCase()) }
    expect(signatures.size).toBe(5); expect(prompts.size).toBe(5)
  })
})
