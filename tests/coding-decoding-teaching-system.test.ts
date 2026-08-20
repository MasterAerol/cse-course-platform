import { describe, expect, it } from 'vitest'
import { codingDecodingLessonSpecs } from '../scripts/lib/coding-decoding-teaching-system-content.mjs'
import { generatedByLesson } from '../scripts/coding-decoding-topic-content.mjs'
import topicSource from '../scripts/coding-decoding-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/coding-decoding/coding-decoding-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(codingDecodingLessonSpecs.find((item) => item.slug === slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-coding-and-decoding','reading',16],['letter-shift-codes','practice',15],
  ['reverse-alphabet-codes','practice',15],['letter-position-number-codes','practice',15],
  ['word-substitution-codes','practice',15],['symbol-replacement-codes','practice',15],
  ['mixed-letter-and-number-codes','practice',16],['inferring-an-unknown-coding-rule','practice',18],
  ['multi-step-coding-rules','practice',18],['mixed-coding-and-decoding-problems','practice',20],
  ['mixed-coding-and-decoding-practice','practice',20],['coding-and-decoding-topic-quiz','quiz',25],
]

describe('Coding and Decoding Teaching System v1', () => {
  it('preserves the authoritative fifth Analytical topic and exact lesson contract', () => {
    expect(codingDecodingLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic blocks and two text-first coding boards per lesson', () => {
    expect(codingDecodingLessonSpecs).toHaveLength(12)
    for (const item of codingDecodingLessonSpecs) {
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
  it('teaches exact mappings, rule families, inference, ordered transformations, and decoding', () => {
    for (const value of ['explicit transformations','every input-output pair','shifted +1','reverse alphabet']) expect(lesson('understanding-coding-and-decoding')).toContain(value)
    for (const value of ['stated amount','a=1 through z=26','wrap only when stated']) expect(lesson('letter-shift-codes')).toContain(value)
    for (const value of ['a with z','replace letters','preserve their order']) expect(lesson('reverse-alphabet-codes')).toContain(value)
    for (const value of ['a=1 through z=26','separators','original order']) expect(lesson('letter-position-number-codes')).toContain(value)
    for (const value of ['whole words','one-to-one table','supplied']) expect(lesson('word-substitution-codes')).toContain(value)
    for (const value of ['symbol','preserve the letter sequence']) expect(lesson('symbol-replacement-codes')).toContain(value)
    for (const value of ['letter rule','number component','before attaching']) expect(lesson('mixed-letter-and-number-codes')).toContain(value)
    for (const value of ['fits every example','test a candidate rule against all examples']) expect(lesson('inferring-an-unknown-coding-rule')).toContain(value)
    for (const value of ['written order','intermediate value','undo the final step first']) expect(lesson('multi-step-coding-rules')).toContain(value)
  })
  it('adds the coding method, why-based memory rule, Common Mistakes, and unchanged practice CTA', () => {
    for (const item of codingDecodingLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Identify Code Family → Map Inputs to Outputs → Apply in Order → Reverse if Decoding → Test All Examples → Verify')
      expect(content).toContain('Memory rule — Write every intermediate code')
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
    expect(recoverySource).toContain("topicSlug: 'coding-and-decoding'")
    expect(mockSource).toContain('makeSubject(analyticalAbilityBlueprintV1')
    expect(topicSource).toContain("'mixed-coding-and-decoding-practice'")
    expect(topicSource).toContain("'coding-and-decoding-topic-quiz'")
    expect(topicSource).toContain('export const quizQuestions')
  })
})
