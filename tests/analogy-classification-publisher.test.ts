import { describe, expect, it } from 'vitest'

import { blocksFor, fixedQuestion, generatedByLesson, lessonSpecs, mixedQuestions, quizQuestions, topicSlug, validateQuestions } from '../scripts/analogy-classification-topic-content.mjs'
import { findUniqueBySlug, rollbackStatusChanges } from '../scripts/logical-reasoning-publisher-helpers.mjs'
import { getGenerator } from '../src/worker/generators/generator.registry'

describe('Analogy and Classification publisher content', () => {
  it('defines the exact second-topic identity and 12 uniquely positioned lessons', () => {
    expect(topicSlug).toBe('analogy-and-classification')
    expect(lessonSpecs).toHaveLength(12)
    expect(new Set(lessonSpecs.map((lesson) => lesson.slug)).size).toBe(12)
    expect(new Set(lessonSpecs.map((lesson) => lesson.position))).toEqual(new Set(Array.from({ length: 12 }, (_, index) => index + 1)))
    expect(lessonSpecs.map((lesson) => lesson.lessonType)).toEqual(['reading', ...Array.from({ length: 10 }, () => 'practice'), 'quiz'])
  })

  it('provides meaningful mobile-safe teaching blocks for every lesson', () => {
    for (const lesson of lessonSpecs) {
      const blocks = blocksFor(lesson.slug)
      expect(blocks.length).toBeGreaterThanOrEqual(9)
      expect(JSON.stringify(blocks)).not.toMatch(/<\/?[a-z][^>]*>/iu)
    }
    expect(blocksFor('understanding-analogies').length).toBeGreaterThanOrEqual(10)
    expect(blocksFor('understanding-analogies').length).toBeLessThanOrEqual(14)
  })

  it('maps all nine generated practices to registered version-1 generators', () => {
    expect(Object.keys(generatedByLesson)).toHaveLength(9)
    for (const slug of Object.values(generatedByLesson)) expect(getGenerator(slug as Parameters<typeof getGenerator>[0], 1)).not.toBeNull()
  })

  it('defines valid fixed practice and quiz assessments with deterministic scoring', () => {
    const practice = mixedQuestions.map((item, index) => fixedQuestion(item, index + 1))
    const quiz = quizQuestions.map((item, index) => fixedQuestion(item, index + 1, true))
    expect(validateQuestions('Mixed practice', practice, 8)).toEqual([])
    expect(validateQuestions('Topic quiz', quiz, 15)).toEqual([])
    for (const question of [...practice, ...quiz]) {
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
      expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.isCorrect === false)).toBe(true)
    }
    expect(practice.filter((question) => question.choices.some((choice) => choice.isCorrect)).length / practice.length * 100).toBe(100)
    expect(quiz.filter((question) => question.choices.some((choice) => choice.isCorrect)).length / quiz.length * 100).toBe(100)
  })

  it('reuses an existing topic and rejects duplicates instead of creating another', () => {
    const existing = { id: 7, slug: topicSlug, position: 2 }
    expect(findUniqueBySlug([existing], topicSlug, 'topic')).toBe(existing)
    expect(() => findUniqueBySlug([existing, { ...existing, id: 8 }], topicSlug, 'topic')).toThrow('Duplicate')
  })

  it('rolls publication status changes back in reverse order', async () => {
    const order: number[] = []
    await rollbackStatusChanges([
      () => { order.push(1); return Promise.resolve() },
      () => { order.push(2); return Promise.resolve() },
      () => { order.push(3); return Promise.resolve() },
    ])
    expect(order).toEqual([3, 2, 1])
  })
})
