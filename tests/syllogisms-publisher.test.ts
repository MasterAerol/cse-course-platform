import { describe, expect, it } from 'vitest'
import { blocksFor, fixedQuestion, generatedByLesson, lessonSpecs, mixedQuestions, quizQuestions, topicDescription, topicSlug, validateQuestions } from '../scripts/syllogisms-topic-content.mjs'
import { findUniqueBySlug, rollbackStatusChanges } from '../scripts/logical-reasoning-publisher-helpers.mjs'
import { getGenerator } from '../src/worker/generators/generator.registry'

describe('Syllogisms publisher content', () => {
  it('defines the seventh Analytical Ability topic and twelve ordered lessons', () => {
    expect(topicSlug).toBe('syllogisms')
    expect(topicDescription).toBe('A structured course on evaluating conclusions from categorical premises using quantifiers, set relationships, possibility reasoning, and Venn-diagram logic.')
    expect(lessonSpecs).toHaveLength(12)
    expect(new Set(lessonSpecs.map((lesson) => lesson.slug)).size).toBe(12)
    expect(new Set(lessonSpecs.map((lesson) => lesson.position))).toEqual(new Set(Array.from({ length: 12 }, (_, index) => index + 1)))
    expect(lessonSpecs.map((lesson) => lesson.lessonType)).toEqual(['reading', ...Array.from({ length: 10 }, () => 'practice'), 'quiz'])
  })

  it('provides substantial safe teaching blocks before every practice', () => {
    for (const lesson of lessonSpecs) {
      const blocks = blocksFor(lesson.slug)
      expect(blocks.length).toBeGreaterThanOrEqual(10)
      expect(JSON.stringify(blocks)).not.toMatch(/<[a-z][^>]*>/iu)
      expect(blocks.some((block) => block.blockType === 'example')).toBe(true)
      expect(blocks.some((block) => block.blockType === 'summary')).toBe(true)
    }
    const introduction = blocksFor('understanding-premises-and-conclusions')
    expect(introduction).toHaveLength(14)
    expect(introduction.filter((block) => block.blockType === 'formula')).toHaveLength(4)
    expect(JSON.stringify(introduction)).toContain('Universal premises have no existential import')
  })

  it('maps nine practice lessons to registered version-one generators', () => {
    expect(Object.keys(generatedByLesson)).toHaveLength(9)
    for (const slug of Object.values(generatedByLesson)) {
      const generator = getGenerator(slug as Parameters<typeof getGenerator>[0], 1)
      expect(generator).not.toBeNull()
      expect(generator?.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('defines exactly eight fixed questions and fifteen quiz questions', () => {
    const practice = mixedQuestions.map((item, index) => fixedQuestion(item, index + 1))
    const quiz = quizQuestions.map((item, index) => fixedQuestion(item, index + 1, true))
    expect(practice).toHaveLength(8)
    expect(quiz).toHaveLength(15)
    expect(validateQuestions('practice', practice, 8)).toEqual([])
    expect(validateQuestions('quiz', quiz, 15)).toEqual([])
    for (const question of [...practice, ...quiz]) {
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
      expect(question.explanation).toContain('Distractors model')
    }
  })

  it('rejects duplicate records and rolls publication status changes back in reverse', async () => {
    expect(() => findUniqueBySlug([{ id: 1, slug: topicSlug }, { id: 2, slug: topicSlug }], topicSlug, 'topic')).toThrow('Duplicate')
    const order: number[] = []
    await rollbackStatusChanges([
      () => { order.push(1); return Promise.resolve() },
      () => { order.push(2); return Promise.resolve() },
      () => { order.push(3); return Promise.resolve() },
    ])
    expect(order).toEqual([3, 2, 1])
  })
})
