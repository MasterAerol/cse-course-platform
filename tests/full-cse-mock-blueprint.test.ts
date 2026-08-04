import { describe, expect, it } from 'vitest'

import {
  fullCseMockBlueprintV1,
  generateMockExamQuestions,
  validateMockExamBlueprint,
} from '../src/worker/domain/mock-exam-blueprint'
import { calculateMockBreakdowns, mockScore, strongestAndWeakest } from '../src/worker/domain/mock-exam-results'

describe('Full CSE Professional mock blueprint v1', () => {
  it('validates the exact course, subject, topic, and difficulty allocation', () => {
    expect(validateMockExamBlueprint(fullCseMockBlueprintV1)).toEqual({ valid: true, errors: [] })
    expect(fullCseMockBlueprintV1.subjects.map(({ subjectSlug, count, difficulty }) => ({ subjectSlug, count, difficulty }))).toEqual([
      { subjectSlug: 'verbal-ability', count: 50, difficulty: { easy: 15, medium: 25, hard: 10 } },
      { subjectSlug: 'numerical-ability', count: 40, difficulty: { easy: 12, medium: 20, hard: 8 } },
      { subjectSlug: 'analytical-ability', count: 40, difficulty: { easy: 12, medium: 20, hard: 8 } },
      { subjectSlug: 'general-information', count: 20, difficulty: { easy: 6, medium: 10, hard: 4 } },
    ])
    expect(fullCseMockBlueprintV1.subjects.map((subject) => subject.topics.map((topic) => topic.count))).toEqual([
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [5, 5, 4, 4, 4, 4, 5, 4, 5],
      [5, 5, 5, 5],
    ])
  })

  it('generates 150 safe deterministic questions with exact allocations', () => {
    const first = generateMockExamQuestions(fullCseMockBlueprintV1, 'mock-focused-seed')
    const second = generateMockExamQuestions(fullCseMockBlueprintV1, 'mock-focused-seed')
    expect(second).toEqual(first)
    expect(first).toHaveLength(150)
    expect(new Set(first.map((item) => item.question.prompt.trim().toLowerCase())).size).toBe(150)
    expect(new Set(first.map((item) => item.question.metadata.canonicalSignature)).size).toBe(150)
    expect(Object.fromEntries(fullCseMockBlueprintV1.subjects.map((subject) => [subject.subjectSlug, first.filter((item) => item.subjectSlug === subject.subjectSlug).length]))).toEqual({ 'verbal-ability': 50, 'numerical-ability': 40, 'analytical-ability': 40, 'general-information': 20 })
    expect({
      easy: first.filter((item) => item.question.difficulty === 'easy').length,
      medium: first.filter((item) => item.question.difficulty === 'medium').length,
      hard: first.filter((item) => item.question.difficulty === 'hard').length,
    }).toEqual({ easy: 45, medium: 75, hard: 30 })
    for (const item of first) {
      expect(item.question.choices).toHaveLength(4)
      expect(new Set(item.question.choices.map((choice) => choice.text)).size).toBe(4)
      expect(item.question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
    }
  })

  it('generates 100 complete attempts (15,000 questions) through every quality gate', () => {
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const questions = generateMockExamQuestions(fullCseMockBlueprintV1, `stress-${attempt}`)
      expect(questions).toHaveLength(150)
      expect(new Set(questions.map((item) => item.question.prompt.trim().toLowerCase())).size).toBe(150)
      expect(new Set(questions.map((item) => item.question.metadata.canonicalSignature)).size).toBe(150)
      expect(questions.every((item) => item.question.choices.length === 4 && new Set(item.question.choices.map((choice) => choice.text)).size === 4 && item.question.choices.filter((choice) => choice.isCorrect).length === 1)).toBe(true)
      for (const subject of fullCseMockBlueprintV1.subjects) {
        const selected = questions.filter((item) => item.subjectSlug === subject.subjectSlug)
        expect(selected).toHaveLength(subject.count)
        for (const topic of subject.topics) expect(selected.filter((item) => item.topicSlug === topic.topicSlug)).toHaveLength(topic.count)
      }
    }
  }, 60_000)
  it.each([
    [150, 100, true], [120, 80, true], [119, 79.33, false], [0, 0, false],
  ])('scores %i of 150 as %f percent with pass=%s', (correct, percentage, passed) => {
    expect(mockScore(correct)).toEqual({ rawScore: correct, percentage, passed })
  })

  it('builds deterministic subject and topic results', () => {
    const items = [
      { subjectSlug: 'a', subjectTitle: 'A', subjectPosition: 1, topicSlug: 'a1', topicTitle: 'A1', topicPosition: 1, isCorrect: true },
      { subjectSlug: 'a', subjectTitle: 'A', subjectPosition: 1, topicSlug: 'a1', topicTitle: 'A1', topicPosition: 1, isCorrect: false },
      { subjectSlug: 'b', subjectTitle: 'B', subjectPosition: 2, topicSlug: 'b1', topicTitle: 'B1', topicPosition: 1, isCorrect: null },
    ]
    const result = calculateMockBreakdowns(items)
    expect(result.subjects.map(({ title, percentage, status }) => ({ title, percentage, status }))).toEqual([
      { title: 'A', percentage: 50, status: 'Needs Review' },
      { title: 'B', percentage: 0, status: 'Needs Review' },
    ])
    expect(strongestAndWeakest(result.subjects)).toMatchObject({ strongest: { slug: 'a' }, weakest: { slug: 'b' } })
  })
})
