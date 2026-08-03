import { describe, expect, it } from 'vitest'
import { analyticalAbilityBlueprintV1, analyticalAbilitySubjectSlug, generateSubjectAssessmentQuestions, isGeneratorAllowedForTopic, validateSubjectAssessmentBlueprint } from '../src/worker/domain/subject-assessment-blueprint'
import { scoreAssessment } from '../src/worker/domain/assessment-scoring'
import { isValidDataDisplay } from '../src/worker/domain/data-interpretation/data-display-validation'
import type { DataDisplay } from '../src/worker/domain/data-interpretation/data-interpretation.types'

describe('Analytical Ability assessment quality gate', () => {
  it('validates nine topics and rejects malformed blueprints', () => {
    expect(validateSubjectAssessmentBlueprint(analyticalAbilityBlueprintV1)).toEqual({ valid: true, errors: [] })
    expect(analyticalAbilityBlueprintV1.topics).toHaveLength(9)
    for (const topic of analyticalAbilityBlueprintV1.topics) { expect(topic.count).toBe(5); expect(topic.difficulty).toEqual({ easy: 2, medium: 2, hard: 1 }) }
    const duplicate = { ...analyticalAbilityBlueprintV1, topics: [...analyticalAbilityBlueprintV1.topics.slice(0, 8), analyticalAbilityBlueprintV1.topics[0]] }
    expect(validateSubjectAssessmentBlueprint(duplicate).valid).toBe(false)
    expect(validateSubjectAssessmentBlueprint({ ...analyticalAbilityBlueprintV1, topics: analyticalAbilityBlueprintV1.topics.slice(0, 8) }).valid).toBe(false)
    expect(validateSubjectAssessmentBlueprint({ ...analyticalAbilityBlueprintV1, totalQuestions: 44 }).valid).toBe(false)
  })

  it('generates 250 deterministic attempts totaling 11,250 questions', () => {
    for (let attempt = 1; attempt <= 250; attempt += 1) {
      const seed = `analytical-quality-${attempt}`
      const questions = generateSubjectAssessmentQuestions(analyticalAbilityBlueprintV1, seed)
      expect(questions).toHaveLength(45)
      expect(generateSubjectAssessmentQuestions(analyticalAbilityBlueprintV1, seed)).toEqual(questions)
      expect(new Set(questions.map(({ question }) => question.prompt.trim().toLowerCase())).size).toBe(45)
      expect(new Set(questions.map(({ question }) => question.seed)).size).toBe(45)
      for (const topic of analyticalAbilityBlueprintV1.topics) {
        const selected = questions.filter((item) => item.topicSlug === topic.topicSlug)
        expect(selected).toHaveLength(5)
        expect(selected.filter(({ question }) => question.difficulty === 'easy')).toHaveLength(2)
        expect(selected.filter(({ question }) => question.difficulty === 'medium')).toHaveLength(2)
        expect(selected.filter(({ question }) => question.difficulty === 'hard')).toHaveLength(1)
        expect(selected.every(({ question }) => isGeneratorAllowedForTopic(topic.topicSlug, question.generatorSlug, analyticalAbilitySubjectSlug))).toBe(true)
      }
      for (const item of questions) {
        expect(item.question.choices).toHaveLength(4)
        expect(new Set(item.question.choices.map(({ text }) => text.trim().toLowerCase())).size).toBe(4)
        expect(item.question.choices.filter(({ isCorrect }) => isCorrect)).toHaveLength(1)
        if (item.topicSlug === 'data-interpretation') { const data = item.question.parameters.display as DataDisplay; expect(isValidDataDisplay(data)).toBe(true); expect(item.question.prompt).toContain(data.accessibleText) }
      }
    }
  }, 120_000)

  it('passes at 32/45 and fails at 31/45', () => {
    const generated = generateSubjectAssessmentQuestions(analyticalAbilityBlueprintV1, 'analytical-boundary')
    const questions = generated.map((item, index) => ({ id: index + 1, points: 1, choices: item.question.choices.map((choice, choiceIndex) => ({ id: index * 4 + choiceIndex + 1, isCorrect: choice.isCorrect })) }))
    const answers = (correct: number) => questions.map((question, index) => ({ question_id: question.id, selected_choice_id: question.choices.find((choice) => choice.isCorrect === (index < correct))!.id }))
    expect(scoreAssessment(questions, answers(32), 70)).toMatchObject({ earnedPoints: 32, totalPoints: 45, scorePercent: 71, passed: true })
    expect(scoreAssessment(questions, answers(31), 70)).toMatchObject({ earnedPoints: 31, scorePercent: 69, passed: false })
    expect(scoreAssessment(questions, [], 70)).toMatchObject({ earnedPoints: 0, scorePercent: 0, passed: false })
  })
})
