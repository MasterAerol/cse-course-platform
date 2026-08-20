import { describe, expect, it } from 'vitest'
import { syllogismsLessonSpecs } from '../scripts/lib/syllogisms-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/syllogisms-topic-content.mjs'
import topicSource from '../scripts/syllogisms-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/syllogisms/syllogism-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(syllogismsLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-premises-and-conclusions','reading',18],['all-all-statements','practice',16],
  ['all-some-statements','practice',17],['some-some-statements','practice',17],
  ['no-statements','practice',16],['valid-and-invalid-conclusions','practice',18],
  ['venn-diagram-reasoning','practice',18],['possibility-conclusions','practice',18],
  ['either-or-conclusions','practice',19],['mixed-syllogism-problems','practice',20],
  ['mixed-syllogism-practice','practice',20],['syllogisms-topic-quiz','quiz',25],
]

describe('Syllogisms Teaching System v1', () => {
  it('preserves the authoritative seventh Analytical topic and exact lesson contract', () => {
    expect(syllogismsLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first set-reasoning boards per lesson', () => {
    expect(syllogismsLessonSpecs).toHaveLength(12)
    for (const item of syllogismsLessonSpecs) {
      expect(item.blocks.length).toBeGreaterThanOrEqual(13)
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
  it('teaches quantifiers, set models, witnesses, validity, possibility, and either-or rigor', () => {
    for (const value of ['every arrangement','a-form','e-form','i-form','o-form','no existential import']) expect(lesson('understanding-premises-and-conclusions')).toContain(value)
    for (const value of ['inside','stated direction','never reverse']) expect(lesson('all-all-statements')).toContain(value)
    for (const value of ['some premise supplies a witness','same witness','some into all']) expect(lesson('all-some-statements')).toContain(value)
    for (const value of ['different witnesses','do not merge']) expect(lesson('some-some-statements')).toContain(value)
    for (const value of ['disjoint','symmetric','does not prove either set exists']) expect(lesson('no-statements')).toContain(value)
    for (const value of ['every arrangement','independently','quantifier strength']) expect(lesson('valid-and-invalid-conclusions')).toContain(value)
    for (const value of ['universal statements shape regions','existential statements place markers']) expect(lesson('venn-diagram-reasoning')).toContain(value)
    for (const value of ['every valid model','at least one','no valid model','construct one arrangement']) expect(lesson('possibility-conclusions')).toContain(value)
    for (const value of ['exact logical complements','same relationship','cannot both']) expect(lesson('either-or-conclusions')).toContain(value)
  })
  it('adds the syllogism method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of syllogismsLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Translate Quantifiers → Describe Regions → Place Witnesses → Test Every Valid Model → Classify → Verify')
      expect(content).toContain('Memory rule — Universal rules shape; Some places a witness')
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
    expect(recoverySource).toContain("topicSlug: 'syllogisms'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-syllogism-practice'")
    expect(topicSource).toContain("'syllogisms-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
