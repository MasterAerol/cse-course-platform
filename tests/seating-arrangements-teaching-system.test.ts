import { describe, expect, it } from 'vitest'
import { seatingArrangementsLessonSpecs } from '../scripts/lib/seating-arrangements-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/seating-arrangements-topic-content.mjs'
import topicSource from '../scripts/seating-arrangements-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/seating-arrangements/seating-arrangement-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(seatingArrangementsLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-arrangements-and-positions','reading',18],['linear-seating-in-one-row','practice',16],
  ['left-right-and-immediate-neighbors','practice',16],['people-between-and-fixed-gaps','practice',17],
  ['circular-seating-fundamentals','practice',18],['facing-toward-or-away-from-center','practice',18],
  ['position-swaps-and-rearrangements','practice',17],['scheduling-and-time-slot-arrangements','practice',18],
  ['object-and-shelf-arrangements','practice',16],['mixed-seating-and-arrangement-problems','practice',20],
  ['mixed-seating-and-arrangement-practice','practice',20],['seating-and-arrangement-topic-quiz','quiz',25],
]

describe('Seating and Arrangement Problems Teaching System v1', () => {
  it('preserves the authoritative eighth Analytical topic and exact lesson contract', () => {
    expect(seatingArrangementsLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first arrangement boards per lesson', () => {
    expect(seatingArrangementsLessonSpecs).toHaveLength(12)
    for (const item of seatingArrangementsLessonSpecs) {
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
  it('teaches rows, direction, exact gaps, circles, facing, swaps, schedules, and shelves', () => {
    for (const value of ['perspective','immediately left','n people between','opposite','strongest clues first']) expect(lesson('understanding-arrangements-and-positions')).toContain(value)
    for (const value of ['fixed seats','viewer perspective','a – b – c']) expect(lesson('linear-seating-in-one-row')).toContain(value)
    for (const value of ['adjacent','two places right','one neighbor']) expect(lesson('left-right-and-immediate-neighbors')).toContain(value)
    for (const value of ['n + 1','do not count either endpoint']) expect(lesson('people-between-and-fixed-gaps')).toContain(value)
    for (const value of ['wrap around','rotations','anchor','clockwise']) expect(lesson('circular-seating-fundamentals')).toContain(value)
    for (const value of ['facing the center','facing outward','orientation']) expect(lesson('facing-toward-or-away-from-center')).toContain(value)
    for (const value of ['swap exchanges','before and after','shift']) expect(lesson('position-swaps-and-rearrangements')).toContain(value)
    for (const value of ['slots','earlier means left','not-first']) expect(lesson('scheduling-and-time-slot-arrangements')).toContain(value)
    for (const value of ['shelf','object labels remain distinct','never infer']) expect(lesson('object-and-shelf-arrangements')).toContain(value)
  })
  it('adds the arrangement method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of seatingArrangementsLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Create Slots → Fix Perspective → Place Fixed Rules → Apply Restrictions → Test Remaining Layouts → Verify')
      expect(content).toContain('Memory rule — Fixed positions first')
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
    expect(recoverySource).toContain("topicSlug: 'seating-and-arrangement-problems'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-seating-and-arrangement-practice'")
    expect(topicSource).toContain("'seating-and-arrangement-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
