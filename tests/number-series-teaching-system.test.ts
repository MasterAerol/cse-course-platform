import { describe, expect, it } from 'vitest'
import { numberSeriesLessonSpecs } from '../scripts/lib/number-series-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/number-series-topic-content.mjs'
import topicSource from '../scripts/number-series-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/number-series/number-series-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(numberSeriesLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-number-patterns','reading',14],['addition-and-subtraction-series','practice',13],
  ['multiplication-and-division-series','practice',13],['alternating-operation-series','practice',14],
  ['increasing-and-decreasing-differences','practice',15],['squares-cubes-and-power-patterns','practice',14],
  ['fibonacci-type-and-recursive-series','practice',15],['interleaved-and-two-pattern-series','practice',15],
  ['missing-term-number-series','practice',15],['mixed-number-series-problems','practice',18],
  ['mixed-number-series-practice','practice',20],['number-series-topic-quiz','quiz',25],
]

describe('Number Series Teaching System v1', () => {
  it('preserves the authoritative third Analytical topic and exact lesson contract', () => {
    expect(numberSeriesLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first sequence boards per lesson', () => {
    expect(numberSeriesLessonSpecs).toHaveLength(12)
    for (const item of numberSeriesLessonSpecs) {
      expect(item.blocks.length).toBeGreaterThanOrEqual(11)
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
  it('teaches complete-pattern verification across every authoritative series family', () => {
    for (const value of ['every visible transition','differences','ratios','odd and even positions','verify the complete rule']) expect(lesson('understanding-number-patterns')).toContain(value)
    for (const value of ['signed differences','preserve the sign','every transition']) expect(lesson('addition-and-subtraction-series')).toContain(value)
    for (const value of ['constant ratio','divide each term','entire list']) expect(lesson('multiplication-and-division-series')).toContain(value)
    for (const value of ['operation cycle','cycle boundary','next operation']) expect(lesson('alternating-operation-series')).toContain(value)
    for (const value of ['first-difference row','differences change']) expect(lesson('increasing-and-decreasing-differences')).toContain(value)
    for (const value of ['term positions','same exponent and offset']) expect(lesson('squares-cubes-and-power-patterns')).toContain(value)
    for (const value of ['previous two','at least three generated terms']) expect(lesson('fibonacci-type-and-recursive-series')).toContain(value)
    for (const value of ['odd positions','even positions','both subseries']) expect(lesson('interleaved-and-two-pattern-series')).toContain(value)
    for (const value of ['both sides of the blank','both adjacent transitions']) expect(lesson('missing-term-number-series')).toContain(value)
  })
  it('adds the sequence method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of numberSeriesLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Observe → Compare → Build Differences or Ratios → Test Pattern → Continue → Verify')
      expect(content).toContain('Memory rule — Test the pattern twice')
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
    expect(recoverySource).toContain("topicSlug: 'number-series'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-number-series-practice'")
    expect(topicSource).toContain("'number-series-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
