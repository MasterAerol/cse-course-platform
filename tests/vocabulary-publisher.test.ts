import { describe, expect, it } from 'vitest'
import { blocksFor, fixedQuestion, generatedByLesson, lessonSpecs, mixedQuestions, quizQuestions, subjectDescription, subjectSlug, subjectTitle, topicDescription, topicSlug, validateQuestions } from '../scripts/vocabulary-word-meaning-topic-content.mjs'
import { findUniqueBySlug, rollbackStatusChanges } from '../scripts/logical-reasoning-publisher-helpers.mjs'
import { getGenerator } from '../src/worker/generators/generator.registry'

describe('Vocabulary and Word Meaning publisher content', () => {
  it('defines Verbal Ability and the exact first-topic identity with twelve ordered lessons', () => {
    expect({ subjectTitle, subjectSlug }).toEqual({ subjectTitle: 'Verbal Ability', subjectSlug: 'verbal-ability' })
    expect(subjectDescription.length).toBeGreaterThan(40)
    expect(topicSlug).toBe('vocabulary-and-word-meaning')
    expect(topicDescription.length).toBeGreaterThan(40)
    expect(lessonSpecs).toHaveLength(12)
    expect(new Set(lessonSpecs.map((lesson) => lesson.slug)).size).toBe(12)
    expect(new Set(lessonSpecs.map((lesson) => lesson.position))).toEqual(new Set(Array.from({ length: 12 }, (_, index) => index + 1)))
    expect(lessonSpecs.map((lesson) => lesson.lessonType)).toEqual(['reading', ...Array.from({ length: 10 }, () => 'practice'), 'quiz'])
  })

  it('provides safe teaching blocks and nine registered v1 generated practices', () => {
    for (const lesson of lessonSpecs) {
      const blocks = blocksFor(lesson.slug)
      expect(blocks.length).toBeGreaterThanOrEqual(9)
      expect(JSON.stringify(blocks)).not.toMatch(/<\/?[a-z][^>]*>/iu)
    }
    expect(blocksFor('understanding-vocabulary-and-word-meaning').length).toBeGreaterThanOrEqual(10)
    expect(Object.keys(generatedByLesson)).toHaveLength(9)
    for (const slug of Object.values(generatedByLesson)) expect(getGenerator(slug as Parameters<typeof getGenerator>[0], 1)).not.toBeNull()
  })

  it('defines eight fixed questions and fifteen quiz questions with one correct choice each', () => {
    const practice = mixedQuestions.map((item, index) => fixedQuestion(item, index + 1))
    const quiz = quizQuestions.map((item, index) => fixedQuestion(item, index + 1, true))
    expect(practice).toHaveLength(8)
    expect(quiz).toHaveLength(15)
    expect(validateQuestions('practice', practice, 8)).toEqual([])
    expect(validateQuestions('quiz', quiz, 15)).toEqual([])
    for (const question of [...practice, ...quiz]) {
      expect(question.choices).toHaveLength(4)
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
      expect(question.explanation).toContain('Distractors model')
    }
  })

  it('rejects duplicate subject/topic lookups and rolls publication statuses back in reverse', async () => {
    expect(() => findUniqueBySlug([{ id: 1, slug: subjectSlug }, { id: 2, slug: subjectSlug }], subjectSlug, 'subject')).toThrow('Duplicate')
    expect(() => findUniqueBySlug([{ id: 1, slug: topicSlug }, { id: 2, slug: topicSlug }], topicSlug, 'topic')).toThrow('Duplicate')
    const order: number[] = []
    await rollbackStatusChanges([() => { order.push(1); return Promise.resolve() }, () => { order.push(2); return Promise.resolve() }])
    expect(order).toEqual([2, 1])
  })
})
