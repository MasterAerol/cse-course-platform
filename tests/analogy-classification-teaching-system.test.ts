import { describe, expect, it } from 'vitest'
import { analogyClassificationLessonSpecs } from '../scripts/lib/analogy-classification-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/analogy-classification-topic-content.mjs'
import topicSource from '../scripts/analogy-classification-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/analogy-classification/analogy-classification-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(analogyClassificationLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-analogies','reading',13],['synonym-and-antonym-relationships','practice',13],
  ['part-to-whole-relationships','practice',13],['function-and-purpose-relationships','practice',14],
  ['cause-and-effect-relationships','practice',14],['degree-and-intensity-relationships','practice',14],
  ['symbol-and-number-analogies','practice',15],['finding-the-odd-one-out','practice',13],
  ['category-and-classification-rules','practice',14],['mixed-analogy-and-classification-problems','practice',17],
  ['mixed-analogy-and-classification-practice','practice',18],['analogy-and-classification-topic-quiz','quiz',22],
]

describe('Analogy and Classification Teaching System v1', () => {
  it('preserves the authoritative second Analytical topic and exact lesson contract', () => {
    expect(analogyClassificationLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first relationship boards per lesson', () => {
    expect(analogyClassificationLessonSpecs).toHaveLength(12)
    for (const item of analogyClassificationLessonSpecs) {
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
  it('teaches exact relationship, direction, form, category, outlier, and transformation reasoning', () => {
    for (const value of ['same kind of connection','direction','part of speech','specificity']) expect(lesson('understanding-analogies')).toContain(value)
    for (const value of ['synonyms','antonyms','grammatical role']) expect(lesson('synonym-and-antonym-relationships')).toContain(value)
    for (const value of ['part-to-whole','direction explicitly','structural component']) expect(lesson('part-to-whole-relationships')).toContain(value)
    for (const value of ['primary action or purpose','object-to-action direction']) expect(lesson('function-and-purpose-relationships')).toContain(value)
    for (const value of ['direct result','preserve that direction']) expect(lesson('cause-and-effect-relationships')).toContain(value)
    for (const value of ['intensity scale','preserve direction']) expect(lesson('degree-and-intensity-relationships')).toContain(value)
    for (const value of ['one visible transformation','test one exact operation']) expect(lesson('symbol-and-number-analogies')).toContain(value)
    for (const value of ['single item outside','verify exactly one item violates']) expect(lesson('finding-the-odd-one-out')).toContain(value)
    for (const value of ['objective categories','test each item directly']) expect(lesson('category-and-classification-rules')).toContain(value)
  })
  it('adds the topic method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of analogyClassificationLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Identify Relationship → Check Direction → Match Form → Test Options → Eliminate → Verify')
      expect(content).toContain('Memory rule — Name the relationship before choosing')
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
    expect(recoverySource).toContain("topicSlug: 'analogy-and-classification'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-analogy-and-classification-practice'")
    expect(topicSource).toContain("'analogy-and-classification-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
