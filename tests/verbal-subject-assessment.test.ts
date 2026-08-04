import { describe, expect, it } from 'vitest'

import { scoreAssessment } from '../src/worker/domain/assessment-scoring'
import {
  generateSubjectAssessmentQuestions,
  isGeneratorAllowedForTopic,
  validateSubjectAssessmentBlueprint,
  verbalAbilityAssessmentSlug,
  verbalAbilityBlueprintV1,
  verbalAbilitySubjectSlug,
} from '../src/worker/domain/subject-assessment-blueprint'
import { calculateSubjectAssessmentBreakdown } from '../src/worker/domain/subject-assessment-results'
import { getRegisteredGenerators } from '../src/worker/generators/generator.registry'
import { verbalAbilityBlueprintV1 as publisherBlueprint } from '../scripts/verbal-ability-assessment-blueprint.mjs'

describe('Verbal Ability subject assessment blueprint', () => {
  it('defines the exact v1 identity, ten topics, distribution, and registered ownership', () => {
    expect(verbalAbilityAssessmentSlug).toBe('verbal-ability-subject-assessment')
    expect(verbalAbilityBlueprintV1).toEqual(publisherBlueprint)
    expect(validateSubjectAssessmentBlueprint(verbalAbilityBlueprintV1)).toEqual({ valid: true, errors: [] })
    expect(verbalAbilityBlueprintV1).toMatchObject({ subjectSlug: verbalAbilitySubjectSlug, version: 1, totalQuestions: 50, passingScorePercent: 70 })
    expect(verbalAbilityBlueprintV1.topics).toHaveLength(10)
    const registered = new Set(getRegisteredGenerators().map((generator) => `${generator.slug}@${generator.version}`))
    for (const topic of verbalAbilityBlueprintV1.topics) {
      expect(topic.count).toBe(5)
      expect(topic.difficulty).toEqual({ easy: 2, medium: 2, hard: 1 })
      expect(topic.generators).toHaveLength(9)
      expect(new Set(topic.generators.map((generator) => generator.slug)).size).toBe(9)
      for (const generator of topic.generators) {
        expect(registered.has(`${generator.slug}@${generator.version}`)).toBe(true)
        expect(isGeneratorAllowedForTopic(topic.topicSlug, generator.slug, verbalAbilitySubjectSlug)).toBe(true)
      }
    }
  })

  it('rejects invalid counts, duplicate topics, missing topics, invalid difficulty, and cross-topic generators', () => {
    const duplicate = { ...verbalAbilityBlueprintV1, topics: [...verbalAbilityBlueprintV1.topics.slice(0, 9), verbalAbilityBlueprintV1.topics[0]] }
    const missing = { ...verbalAbilityBlueprintV1, topics: verbalAbilityBlueprintV1.topics.slice(0, 9) }
    const wrongTotal = { ...verbalAbilityBlueprintV1, totalQuestions: 49 }
    const wrongDifficulty = { ...verbalAbilityBlueprintV1, topics: verbalAbilityBlueprintV1.topics.map((topic, index) => index === 0 ? { ...topic, difficulty: { easy: 3, medium: 1, hard: 1 } } : topic) }
    const wrongGenerator = { ...verbalAbilityBlueprintV1, topics: verbalAbilityBlueprintV1.topics.map((topic, index) => index === 0 ? { ...topic, generators: [{ ...topic.generators[0], slug: 'basic-synonym' as const }] } : topic) }
    for (const invalid of [duplicate, missing, wrongTotal, wrongDifficulty, wrongGenerator]) expect(validateSubjectAssessmentBlueprint(invalid).valid).toBe(false)
  })
})

describe('Verbal Ability full-attempt quality gate', () => {
  it('generates 250 reproducible attempts totaling 12,500 valid immutable-source questions', () => {
    for (let attempt = 1; attempt <= 250; attempt += 1) {
      const seed = `verbal-quality-${attempt}`
      const questions = generateSubjectAssessmentQuestions(verbalAbilityBlueprintV1, seed)
      expect(questions).toHaveLength(50)
      expect(generateSubjectAssessmentQuestions(verbalAbilityBlueprintV1, seed)).toEqual(questions)
      expect(new Set(questions.map(({ question }) => question.seed)).size).toBe(50)
      expect(new Set(questions.map(({ question }) => question.prompt.trim().toLowerCase())).size).toBe(50)
      for (const topic of verbalAbilityBlueprintV1.topics) {
        const selected = questions.filter((item) => item.topicSlug === topic.topicSlug)
        expect(selected).toHaveLength(5)
        expect(selected.filter(({ question }) => question.difficulty === 'easy')).toHaveLength(2)
        expect(selected.filter(({ question }) => question.difficulty === 'medium')).toHaveLength(2)
        expect(selected.filter(({ question }) => question.difficulty === 'hard')).toHaveLength(1)
        expect(selected.every(({ question }) => isGeneratorAllowedForTopic(topic.topicSlug, question.generatorSlug, verbalAbilitySubjectSlug))).toBe(true)
      }
      for (const { topicSlug, question } of questions) {
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size).toBe(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(question.explanation.finalAnswer).toBe(question.choices.find((choice) => choice.isCorrect)?.text)
        if (topicSlug === 'reading-comprehension') {
          expect(typeof question.parameters.passageText).toBe('string')
          expect(question.prompt).toContain(question.parameters.passageText)
          expect((question.parameters.passageText as string).trim().split(/\s+/u).length).toBeGreaterThanOrEqual(80)
        }
        if (topicSlug === 'paragraph-organization') {
          expect(question.parameters.correctOrder).toHaveLength(4)
          expect(new Set(question.parameters.correctOrder as string[]).size).toBe(4)
          expect(question.prompt).toMatch(/A\. .+ B\. .+ C\. .+ D\./u)
        }
      }
    }
  }, 180_000)
})

describe('Verbal Ability scoring and topic results', () => {
  const generated = generateSubjectAssessmentQuestions(verbalAbilityBlueprintV1, 'verbal-boundaries')
  const questions = generated.map((item, index) => ({ id: index + 1, points: 1, choices: item.question.choices.map((choice, choiceIndex) => ({ id: index * 4 + choiceIndex + 1, isCorrect: choice.isCorrect })) }))
  const answers = (correct: number) => questions.map((question, index) => ({ question_id: question.id, selected_choice_id: question.choices.find((choice) => choice.isCorrect === (index < correct))!.id }))

  it('enforces 50/50, 35/50, 34/50, wrong, and unanswered boundaries server-side', () => {
    expect(scoreAssessment(questions, answers(50), 70)).toMatchObject({ earnedPoints: 50, totalPoints: 50, scorePercent: 100, passed: true })
    expect(scoreAssessment(questions, answers(35), 70)).toMatchObject({ earnedPoints: 35, scorePercent: 70, passed: true })
    expect(scoreAssessment(questions, answers(34), 70)).toMatchObject({ earnedPoints: 34, scorePercent: 68, passed: false })
    expect(scoreAssessment(questions, answers(0), 70)).toMatchObject({ earnedPoints: 0, scorePercent: 0, passed: false })
    expect(scoreAssessment(questions, [], 70)).toMatchObject({ earnedPoints: 0, scorePercent: 0, passed: false })
  })

  it('creates ten exact topic results with stable strongest and weakest ties', () => {
    const items = verbalAbilityBlueprintV1.topics.flatMap((topic) => Array.from({ length: 5 }, (_, index) => ({ topicSlug: topic.topicSlug, topicTitle: topic.topicTitle, topicPosition: topic.position, selectedChoiceId: index < 3 ? index + 1 : null, isCorrect: index < 3 })))
    const result = calculateSubjectAssessmentBreakdown(items)
    expect(result.topics).toHaveLength(10)
    expect(result.topics.every((topic) => topic.totalQuestions === 5 && topic.correctCount === 3 && topic.unansweredCount === 2 && topic.percentage === 60 && topic.status === 'Developing')).toBe(true)
    expect(result.strongestTopic.topicSlug).toBe(verbalAbilityBlueprintV1.topics[0].topicSlug)
    expect(result.weakestTopic.topicSlug).toBe(verbalAbilityBlueprintV1.topics[0].topicSlug)
  })
})