import { describe, expect, it } from 'vitest'

import { blocksFor, fixedQuestion, generatedByLesson, lessonSpecs, mixedQuestions, quizQuestions, subjectSlug, topicDescription, topicSlug, validateQuestions } from '../scripts/pronouns-modifiers-topic-content.mjs'
import { findUniqueBySlug, rollbackStatusChanges } from '../scripts/logical-reasoning-publisher-helpers.mjs'
import { getGenerator } from '../src/worker/generators/generator.registry'

describe('Pronouns and Modifiers publisher content', () => {
  it('defines the seventh Verbal topic and exactly twelve ordered lessons', () => {
    expect(subjectSlug).toBe('verbal-ability')
    expect(topicSlug).toBe('pronouns-and-modifiers')
    expect(topicDescription).toBe('A structured course on pronoun reference and agreement, pronoun case, possessive and reflexive forms, adjective and adverb modifiers, misplaced modifiers, dangling modifiers, and clear sentence meaning.')
    expect(lessonSpecs).toHaveLength(12)
    expect(new Set(lessonSpecs.map((item) => item.slug)).size).toBe(12)
    expect(new Set(lessonSpecs.map((item) => item.position))).toEqual(new Set(Array.from({ length: 12 }, (_, index) => index + 1)))
    expect(lessonSpecs.map((item) => item.lessonType)).toEqual(['reading', ...Array.from({ length: 10 }, () => 'practice'), 'quiz'])
  })

  it('provides mobile-safe instructional blocks and nine registered practices', () => {
    for (const lesson of lessonSpecs) {
      const blocks = blocksFor(lesson.slug)
      expect(blocks.length).toBeGreaterThanOrEqual(9)
      expect(JSON.stringify(blocks)).not.toMatch(/<\/?[a-z][^>]*>/iu)
      for (const block of blocks) expect(JSON.stringify(block).length).toBeLessThan(1_500)
    }
    expect(blocksFor('understanding-pronouns-and-modifiers')).toHaveLength(12)
    expect(Object.keys(generatedByLesson)).toHaveLength(9)
    expect(new Set(Object.values(generatedByLesson)).size).toBe(9)
    for (const slug of Object.values(generatedByLesson)) expect(getGenerator(slug as Parameters<typeof getGenerator>[0], 1)).not.toBeNull()
  })

  it('defines eight fixed and fifteen quiz questions with backend-scoreable choices', () => {
    const practice = mixedQuestions.map((item, index) => fixedQuestion(item, index + 1))
    const quiz = quizQuestions.map((item, index) => fixedQuestion(item, index + 1, true))
    expect(practice).toHaveLength(8)
    expect(quiz).toHaveLength(15)
    expect(validateQuestions('practice', practice, 8)).toEqual([])
    expect(validateQuestions('quiz', quiz, 15)).toEqual([])
    for (const question of [...practice, ...quiz]) {
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices.map((choice) => choice.text.toLowerCase())).size).toBe(4)
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
      expect(question.explanation).toContain('Distractors model')
    }
  })

  it('rejects duplicate topics and rolls status changes back in reverse order', async () => {
    expect(() => findUniqueBySlug([{ id: 1, slug: topicSlug }, { id: 2, slug: topicSlug }], topicSlug, 'topic')).toThrow('Duplicate')
    const order: number[] = []
    await rollbackStatusChanges([() => { order.push(1); return Promise.resolve() }, () => { order.push(2); return Promise.resolve() }])
    expect(order).toEqual([2, 1])
  })
})
