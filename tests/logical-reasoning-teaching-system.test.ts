import { describe, expect, it } from 'vitest'
import { logicalReasoningLessonSpecs } from '../scripts/lib/logical-reasoning-teaching-system-content.mjs'
import publisherSource from '../scripts/create-and-publish-logical-reasoning-fundamentals-topic.mjs?raw'
import topicSource from '../scripts/logical-reasoning-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/logical-reasoning/logical-reasoning-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(logicalReasoningLessonSpecs.find((item) => item.slug === slug)?.blocks)
const expected = [
  ['understanding-logical-statements','reading',12],['facts-opinions-and-conclusions','practice',12],
  ['identifying-valid-conclusions','practice',14],['assumptions-and-hidden-premises','practice',14],
  ['if-then-statements','practice',14],['necessary-and-sufficient-conditions','practice',15],
  ['negation-and-contradiction','practice',15],['basic-deductive-reasoning','practice',16],
  ['logical-equivalence','practice',15],['mixed-logical-reasoning-problems','practice',18],
  ['mixed-logical-reasoning-practice','practice',20],['logical-reasoning-fundamentals-topic-quiz','quiz',25],
]

describe('Logical Reasoning Fundamentals Teaching System v1', () => {
  it('preserves the authoritative first Analytical topic and exact lesson contract', () => {
    expect(logicalReasoningLessonSpecs.map(({slug,lessonType,estimatedMinutes}) => [slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides valid deterministic canonical blocks and two text-first reasoning boards per lesson', () => {
    expect(logicalReasoningLessonSpecs).toHaveLength(12)
    for (const item of logicalReasoningLessonSpecs) {
      expect(item.blocks.length).toBeGreaterThanOrEqual(11)
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1}})
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
  it('teaches statements, evidence, conclusions, assumptions, and exact conditional direction', () => {
    for (const value of ['truth-valued claim','use only the given information','questions, commands, and exclamations']) expect(lesson('understanding-logical-statements').toLowerCase()).toContain(value)
    for (const value of ['closed world','stated fact','judgment','must follow']) expect(lesson('facts-opinions-and-conclusions').toLowerCase()).toContain(value)
    for (const value of ['valid conclusion','contrapositive','affirming the consequent','reverse no arrows']) expect(lesson('identifying-valid-conclusions').toLowerCase()).toContain(value)
    for (const value of ['unstated idea','narrow bridge','printer availability contributes']) expect(lesson('assumptions-and-hidden-premises').toLowerCase()).toContain(value)
    for (const value of ['modus ponens','modus tollens','affirming the consequent','denying the antecedent']) expect(lesson('if-then-statements').toLowerCase()).toContain(value)
  })
  it('teaches necessary versus sufficient, negation, deduction, equivalence, elimination, and verification', () => {
    for (const value of ['sufficient condition guarantees','necessary condition is required','only if']) expect(lesson('necessary-and-sufficient-conditions').toLowerCase()).toContain(value)
    for (const value of ['at least one counterexample','inclusive “or','exact contradiction']) expect(lesson('negation-and-contradiction').toLowerCase()).toContain(value)
    for (const value of ['guaranteed','write a chain','merely may be true']) expect(lesson('basic-deductive-reasoning').toLowerCase()).toContain(value)
    for (const value of ['same truth conditions','contrapositive','converse and inverse']) expect(lesson('logical-equivalence').toLowerCase()).toContain(value)
  })
  it('adds a topic-specific method, why-based memory rule, Common Mistakes, and unchanged practice CTAs', () => {
    for (const item of logicalReasoningLessonSpecs) {
      const content = JSON.stringify(item.blocks)
      expect(content).toContain('Read → Classify → Translate → Deduce → Test → Verify')
      expect(content).toContain('Memory rule — Use every premise in its stated direction')
      expect(content).toContain('Common mistake')
      if (item.lessonType !== 'reading') expect(content).toContain('existing route, generator or fixed questions, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged')
    }
  })
  it('preserves generators, practice, quiz, Smart Recovery, assessment ownership, and Full Mock allocation', () => {
    for (const slug of ['statement-classification','fact-opinion-conclusion','valid-conclusion','assumption-identification','conditional-reasoning','necessary-sufficient-condition','negation-contradiction','basic-deduction','logical-equivalence','mixed-logical-reasoning']) {
      expect(topicSource + publisherSource).toContain(slug)
      expect(generatorSource).toContain(slug)
      expect(assessmentSource).toContain(slug)
    }
    expect(recoverySource).toContain("topicSlug: 'logical-reasoning-fundamentals'")
    expect(mockSource).toContain("makeSubject(analyticalAbilityBlueprintV1")
    expect(publisherSource).toContain('questionCount: 5')
    expect(publisherSource).toContain('A 15-question educational quiz')
  })
})
