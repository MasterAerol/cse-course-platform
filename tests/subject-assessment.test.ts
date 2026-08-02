import { describe, expect, it } from 'vitest'

import {
  generateSubjectAssessmentQuestions,
  isGeneratorAllowedForTopic,
  numericalAbilityBlueprintV1,
  validateSubjectAssessmentBlueprint,
} from '../src/worker/domain/subject-assessment-blueprint'
import { calculateSubjectAssessmentBreakdown } from '../src/worker/domain/subject-assessment-results'
import { scoreAssessment } from '../src/worker/domain/assessment-scoring'

describe('Numerical Ability subject assessment quality gate', () => {
  it('validates the versioned 50-question, ten-topic blueprint', () => {
    expect(validateSubjectAssessmentBlueprint(numericalAbilityBlueprintV1)).toEqual({ valid: true, errors: [] })
    expect(numericalAbilityBlueprintV1.topics).toHaveLength(10)
    for (const topic of numericalAbilityBlueprintV1.topics) {
      expect(topic.count).toBe(5)
      expect(topic.difficulty).toEqual({ easy: 2, medium: 2, hard: 1 })
      expect(topic.generators.length).toBeGreaterThan(1)
    }
  })

  it('rejects duplicate topics, invalid counts, and unregistered generator versions', () => {
    const duplicate = { ...numericalAbilityBlueprintV1, topics: [...numericalAbilityBlueprintV1.topics.slice(0, 9), numericalAbilityBlueprintV1.topics[0]!] }
    expect(validateSubjectAssessmentBlueprint(duplicate).valid).toBe(false)
    const invalidCount = { ...numericalAbilityBlueprintV1, totalQuestions: 49 }
    expect(validateSubjectAssessmentBlueprint(invalidCount).valid).toBe(false)
    const invalidVersion = { ...numericalAbilityBlueprintV1, topics: numericalAbilityBlueprintV1.topics.map((topic, index) => index === 0 ? { ...topic, generators: topic.generators.map((generator, generatorIndex) => generatorIndex === 0 ? { ...generator, version: 999 } : generator) } : topic) }
    expect(validateSubjectAssessmentBlueprint(invalidVersion).valid).toBe(false)
  })

  it('generates 200 valid attempts (10,000 questions) without duplicate prompts or cross-topic generators', () => {
    for (let attempt = 1; attempt <= 200; attempt += 1) {
      const questions = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, `quality-gate-${attempt}`)
      expect(questions).toHaveLength(50)
      expect(new Set(questions.map((item) => item.question.prompt.toLocaleLowerCase().trim())).size).toBe(50)
      expect(new Set(questions.map((item) => item.question.seed)).size).toBe(50)
      for (const topic of numericalAbilityBlueprintV1.topics) {
        const selected = questions.filter((question) => question.topicSlug === topic.topicSlug)
        expect(selected).toHaveLength(5)
        expect(selected.filter((item) => item.question.difficulty === 'easy')).toHaveLength(2)
        expect(selected.filter((item) => item.question.difficulty === 'medium')).toHaveLength(2)
        expect(selected.filter((item) => item.question.difficulty === 'hard')).toHaveLength(1)
        expect(selected.every((item) => isGeneratorAllowedForTopic(topic.topicSlug, item.question.generatorSlug))).toBe(true)
      }
    }
  }, 30_000)

  it('is deterministic for a seed and changes snapshots for a retry seed', () => {
    const first = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'learner-attempt-1')
    const resumed = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'learner-attempt-1')
    const retry = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'learner-attempt-2')
    expect(resumed).toEqual(first)
    expect(retry.map((item) => item.question.prompt)).not.toEqual(first.map((item) => item.question.prompt))
  })

  it('scores selected snapshot choices server-side and reports deterministic strongest/weakest ties', () => {
    const generated = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'scoring-attempt')
    const questions = generated.map((item, index) => ({ id: index + 1, points: 1, choices: item.question.choices.map((choice, choiceIndex) => ({ id: index * 4 + choiceIndex + 1, isCorrect: choice.isCorrect })) }))
    const answers = questions.map((question) => ({ question_id: question.id, selected_choice_id: question.choices.find((choice) => choice.isCorrect)!.id }))
    const score = scoreAssessment(questions, answers, 70)
    expect(score).toMatchObject({ earnedPoints: 50, totalPoints: 50, scorePercent: 100, passed: true })
    const breakdown = calculateSubjectAssessmentBreakdown(generated.map((item) => ({ topicSlug: item.topicSlug, topicTitle: item.topicTitle, topicPosition: item.topicPosition, selectedChoiceId: 1, isCorrect: item.topicSlug === 'percentages' })))
    expect(breakdown.strongestTopic.topicTitle).toBe('Percentages')
    expect(breakdown.weakestTopic.topicTitle).toBe('Fractions')
    expect(breakdown.topics).toHaveLength(10)
  })

  it('enforces the 35/50 passing boundary and unanswered scoring', () => {
    const generated = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'boundary-attempt')
    const questions = generated.map((item, index) => ({ id: index + 1, points: 1, choices: item.question.choices.map((choice, choiceIndex) => ({ id: index * 4 + choiceIndex + 1, isCorrect: choice.isCorrect })) }))
    const answerFor = (question: (typeof questions)[number], correct: boolean) => ({ question_id: question.id, selected_choice_id: question.choices.find((choice) => choice.isCorrect === correct)!.id })
    expect(scoreAssessment(questions, questions.map((question, index) => answerFor(question, index < 35)), 70)).toMatchObject({ earnedPoints: 35, scorePercent: 70, passed: true })
    expect(scoreAssessment(questions, questions.map((question, index) => answerFor(question, index < 34)), 70)).toMatchObject({ earnedPoints: 34, scorePercent: 68, passed: false })
    expect(scoreAssessment(questions, [], 70)).toMatchObject({ earnedPoints: 0, scorePercent: 0, passed: false })
  })
})
