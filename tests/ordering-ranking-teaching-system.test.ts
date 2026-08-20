import { describe, expect, it } from 'vitest'
import { orderingRankingLessonSpecs } from '../scripts/lib/ordering-ranking-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/ordering-ranking-topic-content.mjs'
import topicSource from '../scripts/ordering-ranking-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/ordering-ranking/ordering-ranking-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(orderingRankingLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-ordering-and-ranking','reading',16],['rank-from-left-or-right','practice',15],
  ['total-persons-from-two-ranks','practice',15],['position-after-rearrangement','practice',16],
  ['comparative-ordering','practice',16],['before-and-after-relationships','practice',16],
  ['middle-position-problems','practice',15],['comparing-multiple-ranks','practice',18],
  ['queue-and-line-problems','practice',18],['mixed-ordering-and-ranking-problems','practice',20],
  ['mixed-ordering-and-ranking-practice','practice',20],['ordering-and-ranking-topic-quiz','quiz',25],
]

describe('Ordering and Ranking Teaching System v1', () => {
  it('preserves the authoritative sixth Analytical topic and exact lesson contract', () => {
    expect(orderingRankingLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first rank boards per lesson', () => {
    expect(orderingRankingLessonSpecs).toHaveLength(12)
    for (const item of orderingRankingLessonSpecs) {
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
  it('teaches direction, overlap, movement, chains, gaps, middle positions, and queue updates', () => {
    for (const value of ['one-based position','named end','direction','total']) expect(lesson('understanding-ordering-and-ranking')).toContain(value)
    for (const value of ['opposite rank','total - known rank + 1','total + 1']) expect(lesson('rank-from-left-or-right')).toContain(value)
    for (const value of ['overlap','front rank + back rank - 1','subtract one']) expect(lesson('total-persons-from-two-ranks')).toContain(value)
    for (const value of ['overtaking improves','being overtaken worsens']) expect(lesson('position-after-rearrangement')).toContain(value)
    for (const value of ['directed chain','every clue','not forced']) expect(lesson('comparative-ordering')).toContain(value)
    for (const value of ['do not include either endpoint','n + 1']) expect(lesson('before-and-after-relationships')).toContain(value)
    for (const value of ['odd totals','even totals','central positions']) expect(lesson('middle-position-problems')).toContain(value)
    for (const value of ['one clue at a time','intermediate rank']) expect(lesson('comparing-multiple-ranks')).toContain(value)
    for (const value of ['join or leave ahead','update the total separately','leaving behind']) expect(lesson('queue-and-line-problems')).toContain(value)
  })
  it('adds the ranking method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of orderingRankingLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Name Direction → Mark Positions → Choose Relationship → Update One Clue at a Time → Check Bounds → Verify')
      expect(content).toContain('Memory rule — Name the counting end first')
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
    expect(recoverySource).toContain("topicSlug: 'ordering-and-ranking'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-ordering-and-ranking-practice'")
    expect(topicSource).toContain("'ordering-and-ranking-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
