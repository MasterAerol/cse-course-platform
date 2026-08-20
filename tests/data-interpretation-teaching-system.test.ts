import { describe, expect, it } from 'vitest'
import { dataInterpretationLessonSpecs } from '../scripts/lib/data-interpretation-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/data-interpretation-topic-content.mjs'
import topicSource from '../scripts/data-interpretation-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/data-interpretation/data-interpretation-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(dataInterpretationLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-data-displays','reading',18],['reading-tables','practice',16],
  ['bar-chart-interpretation','practice',17],['line-graph-interpretation','practice',17],
  ['pie-chart-interpretation','practice',18],['percentages-and-ratios-in-data','practice',18],
  ['totals-differences-and-comparisons','practice',17],['average-and-weighted-data','practice',18],
  ['multi-step-data-questions','practice',19],['mixed-data-interpretation-problems','practice',20],
  ['mixed-data-interpretation-practice','practice',20],['data-interpretation-topic-quiz','quiz',25],
]

describe('Data Interpretation Teaching System v1', () => {
  it('preserves the authoritative ninth Analytical topic and exact lesson contract', () => {
    expect(dataInterpretationLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first data boards per lesson', () => {
    expect(dataInterpretationLessonSpecs).toHaveLength(12)
    for (const item of dataInterpretationLessonSpecs) {
      expect(item.blocks.length).toBeGreaterThanOrEqual(12)
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}})
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block) => block.blockType === 'illustrated-guided-teaching')).toBe(false)
      const visuals = item.blocks.flatMap((block) => block.content.visual === undefined ? [] : [block.content.visual])
      expect(visuals).toHaveLength(2)
      for (const visual of visuals) {
        const board = visual as {ariaLabel:string;stages:unknown[];transitions:Array<{whatChanged:string;why:string;source:string}>;memoryTip:{reason:string}}
        expect(board.ariaLabel.length).toBeGreaterThan(50)
        expect(board.transitions).toHaveLength(board.stages.length - 1)
        expect(board.transitions.every((step) => step.whatChanged.length > 0 && step.why.length > 0 && step.source.length > 0)).toBe(true)
        expect(board.memoryTip.reason.length).toBeGreaterThan(30)
      }
      for (const block of item.blocks) expect(() => validateLessonBlockContent(block.blockType, block.content)).not.toThrow()
    }
  })
  it('teaches metadata, tables, charts, shares, comparisons, weighted data, and multi-step verification', () => {
    for (const value of ['title','unit','legend','scale','time period','common base']) expect(lesson('understanding-data-displays')).toContain(value)
    for (const value of ['row label','column heading','named in the question']) expect(lesson('reading-tables')).toContain(value)
    for (const value of ['labeled scale','correct series','original value as denominator']) expect(lesson('bar-chart-interpretation')).toContain(value)
    for (const value of ['labeled time points','displayed intervals','named points']) expect(lesson('line-graph-interpretation')).toContain(value)
    for (const value of ['100%','360 degrees','same whole']) expect(lesson('pie-chart-interpretation')).toContain(value)
    for (const value of ['correct whole','stated order','percent change']) expect(lesson('percentages-and-ratios-in-data')).toContain(value)
    for (const value of ['requested categories','direction stated','like units']) expect(lesson('totals-differences-and-comparisons')).toContain(value)
    for (const value of ['equal weight','group sizes','weighted mean']) expect(lesson('average-and-weighted-data')).toContain(value)
    for (const value of ['intermediate results','full precision','round only']) expect(lesson('multi-step-data-questions')).toContain(value)
  })
  it('adds the data method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of dataInterpretationLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Read Title and Units → Select Values → Choose Operation → Calculate Exactly → Compare → Verify')
      expect(content).toContain('Memory rule — Units before arithmetic')
      expect(content).toContain('Common mistake')
      if (item.lessonType !== 'reading') expect(content).toContain('existing route, generator or fixed questions, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged')
    }
  })
  it('preserves generators, practice, quiz, Smart Recovery, assessment ownership, and Full Mock allocation', () => {
    for (const slug of Object.values(generatedByLesson)) {
      expect(topicSource).toContain(slug)
      expect(generatorSource).toContain(slug)
      expect(assessmentSource).toContain(slug)
    }
    expect(recoverySource).toContain("topicSlug: 'data-interpretation'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-data-interpretation-practice'")
    expect(topicSource).toContain("'data-interpretation-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
