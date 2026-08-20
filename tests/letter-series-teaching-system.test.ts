import { describe, expect, it } from 'vitest'
import { letterSeriesLessonSpecs } from '../scripts/lib/letter-series-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/letter-series-topic-content.mjs'
import topicSource from '../scripts/letter-series-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/letter-series/letter-series-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(letterSeriesLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-alphabet-positions','reading',14],['forward-letter-patterns','practice',13],
  ['backward-letter-patterns','practice',13],['skipping-letter-patterns','practice',13],
  ['alternating-letter-patterns','practice',15],['increasing-and-decreasing-letter-gaps','practice',15],
  ['paired-and-grouped-letter-series','practice',15],['letter-and-number-combination-series','practice',15],
  ['missing-term-letter-series','practice',15],['mixed-letter-series-problems','practice',18],
  ['mixed-letter-series-practice','practice',20],['letter-series-topic-quiz','quiz',25],
]

describe('Letter Series Teaching System v1', () => {
  it('preserves the authoritative fourth Analytical topic and exact lesson contract', () => {
    expect(letterSeriesLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first alphabet boards per lesson', () => {
    expect(letterSeriesLessonSpecs).toHaveLength(12)
    for (const item of letterSeriesLessonSpecs) {
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
  it('teaches measurable alphabet reasoning across every authoritative letter-series family', () => {
    for (const value of ['a = 1','z = 26','signed gaps','wrap only when stated','every transition']) expect(lesson('understanding-alphabet-positions')).toContain(value)
    for (const value of ['positive gap','from the beginning','wraparound']) expect(lesson('forward-letter-patterns')).toContain(value)
    for (const value of ['negative sign','every transition','backward']) expect(lesson('backward-letter-patterns')).toContain(value)
    for (const value of ['skip describes','step describes','measure positions']) expect(lesson('skipping-letter-patterns')).toContain(value)
    for (const value of ['two signed gaps','complete cycle repeats']) expect(lesson('alternating-letter-patterns')).toContain(value)
    for (const value of ['signed gaps','change','latest term']) expect(lesson('increasing-and-decreasing-letter-gaps')).toContain(value)
    for (const value of ['align the terms in columns','character position independently']) expect(lesson('paired-and-grouped-letter-series')).toContain(value)
    for (const value of ['two independent','separate the letter column','recombine']) expect(lesson('letter-and-number-combination-series')).toContain(value)
    for (const value of ['both sides','verify that it produces the next visible term']) expect(lesson('missing-term-letter-series')).toContain(value)
  })
  it('adds the alphabet method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of letterSeriesLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Translate Letters → Measure Signed Gaps → Separate Patterns → Test Twice → Continue → Verify')
      expect(content).toContain('Memory rule — Positions before guesses')
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
    expect(recoverySource).toContain("topicSlug: 'letter-series'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-letter-series-practice'")
    expect(topicSource).toContain("'letter-series-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
