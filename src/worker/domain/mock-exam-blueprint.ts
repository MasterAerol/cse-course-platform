import {
  analyticalAbilityBlueprintV1,
  generalInformationBlueprintV1,
  isGeneratorAllowedForTopic,
  numericalAbilityBlueprintV1,
  verbalAbilityBlueprintV1,
  type SubjectAssessmentBlueprint,
  type SubjectAssessmentGeneratorConfig,
} from './subject-assessment-blueprint'
import { generateValidatedQuestion, getGenerator } from '../generators/generator.registry'
import { createSeededRandom } from '../generators/generator-random'
import type { GeneratedQuestion, GeneratorDifficulty } from '../generators/generator.types'

export const fullCseMockSlug = 'full-cse-professional-mock-examination'
export const fullCseMockBlueprintLabel = 'Platform-Designed Subject Distribution v1'

export interface MockExamTopicConfig {
  topicSlug: string
  topicTitle: string
  position: number
  count: number
  difficulty: Record<GeneratorDifficulty, number>
  generators: SubjectAssessmentGeneratorConfig[]
}

export interface MockExamSubjectConfig {
  subjectSlug: 'verbal-ability' | 'numerical-ability' | 'analytical-ability' | 'general-information'
  subjectTitle: string
  position: number
  count: number
  difficulty: Record<GeneratorDifficulty, number>
  assessmentSlug: string
  topics: MockExamTopicConfig[]
}

export interface MockExamBlueprint {
  version: number
  label: string
  totalQuestions: number
  passingScorePercent: number
  timedDurationMinutes: number
  difficulty: Record<GeneratorDifficulty, number>
  subjects: MockExamSubjectConfig[]
}

const topicDifficulties: Record<string, Array<[number, number, number]>> = {
  'verbal-ability': [
    [2, 2, 1], [2, 2, 1], [2, 2, 1], [2, 2, 1], [2, 2, 1],
    [1, 3, 1], [1, 3, 1], [1, 3, 1], [1, 3, 1], [1, 3, 1],
  ],
  'numerical-ability': [
    [2, 1, 1], [2, 1, 1], [1, 2, 1], [1, 2, 1], [1, 2, 1],
    [1, 2, 1], [1, 2, 1], [1, 2, 1], [1, 3, 0], [1, 3, 0],
  ],
  'analytical-ability': [
    [2, 2, 1], [2, 2, 1], [1, 2, 1], [1, 2, 1], [1, 2, 1],
    [1, 2, 1], [2, 2, 1], [0, 4, 0], [2, 2, 1],
  ],
  'general-information': [[2, 2, 1], [2, 2, 1], [1, 3, 1], [1, 3, 1]],
}

function repeatCount(value: number, length: number): number[] {
  return Array.from({ length }, () => value)
}

function makeSubject(
  source: SubjectAssessmentBlueprint,
  subjectTitle: string,
  position: number,
  assessmentSlug: string,
  counts: number[],
  difficulty: [number, number, number],
): MockExamSubjectConfig {
  const plans = topicDifficulties[source.subjectSlug]
  if (plans === undefined) throw new Error(`Missing mock topic plan for ${source.subjectSlug}.`)
  return {
    subjectSlug: source.subjectSlug,
    subjectTitle,
    position,
    assessmentSlug,
    count: counts.reduce((sum, count) => sum + count, 0),
    difficulty: { easy: difficulty[0], medium: difficulty[1], hard: difficulty[2] },
    topics: source.topics.map((topic, index) => {
      const plan = plans[index]
      const count = counts[index]
      if (plan === undefined || count === undefined) throw new Error(`Incomplete mock plan for ${source.subjectSlug}.`)
      return {
        topicSlug: topic.topicSlug,
        topicTitle: topic.topicTitle,
        position: topic.position,
        count,
        difficulty: { easy: plan[0], medium: plan[1], hard: plan[2] },
        generators: topic.generators,
      }
    }),
  }
}

export const fullCseMockBlueprintV1: MockExamBlueprint = {
  version: 1,
  label: fullCseMockBlueprintLabel,
  totalQuestions: 150,
  passingScorePercent: 80,
  timedDurationMinutes: 190,
  difficulty: { easy: 45, medium: 75, hard: 30 },
  subjects: [
    makeSubject(verbalAbilityBlueprintV1, 'Verbal Ability', 1, 'verbal-ability-subject-assessment', repeatCount(5, 10), [15, 25, 10]),
    makeSubject(numericalAbilityBlueprintV1, 'Numerical Ability', 2, 'numerical-ability-subject-assessment', repeatCount(4, 10), [12, 20, 8]),
    makeSubject(analyticalAbilityBlueprintV1, 'Analytical Ability', 3, 'analytical-ability-subject-assessment', [5, 5, 4, 4, 4, 4, 5, 4, 5], [12, 20, 8]),
    makeSubject(generalInformationBlueprintV1, 'General Information', 4, 'general-information-subject-assessment', repeatCount(5, 4), [6, 10, 4]),
  ],
}

export interface MockBlueprintValidationResult { valid: boolean; errors: string[] }

export function validateMockExamBlueprint(input: MockExamBlueprint): MockBlueprintValidationResult {
  const errors: string[] = []
  const required = ['verbal-ability', 'numerical-ability', 'analytical-ability', 'general-information']
  if (input.version !== 1) errors.push('Mock exam blueprint version must be 1.')
  if (input.label !== fullCseMockBlueprintLabel) errors.push(`Blueprint label must be ${fullCseMockBlueprintLabel}.`)
  if (input.totalQuestions !== 150) errors.push('The mock exam must contain exactly 150 scored questions.')
  if (input.passingScorePercent !== 80) errors.push('The passing score must be 80 percent.')
  if (input.timedDurationMinutes !== 190) errors.push('Timed mode must last 190 minutes.')
  if (input.subjects.length !== 4) errors.push('The blueprint must contain exactly four subjects.')
  const seenSubjects = new Set<string>()
  for (const subject of input.subjects) {
    if (seenSubjects.has(subject.subjectSlug)) errors.push(`Subject ${subject.subjectSlug} is duplicated.`)
    seenSubjects.add(subject.subjectSlug)
    if (!required.includes(subject.subjectSlug)) errors.push(`Unsupported subject ${subject.subjectSlug}.`)
    if (subject.count <= 0) errors.push(`Subject ${subject.subjectSlug} cannot have zero questions.`)
    const topicTotal = subject.topics.reduce((sum, topic) => sum + topic.count, 0)
    if (topicTotal !== subject.count) errors.push(`${subject.subjectSlug} topic counts must total ${subject.count}.`)
    for (const topic of subject.topics) {
      const total = topic.difficulty.easy + topic.difficulty.medium + topic.difficulty.hard
      if (total !== topic.count) errors.push(`${topic.topicSlug} difficulty counts must total ${topic.count}.`)
      if (topic.generators.length === 0) errors.push(`${topic.topicSlug} needs at least one generator.`)
      for (const config of topic.generators) {
        if (!isGeneratorAllowedForTopic(topic.topicSlug, config.slug, subject.subjectSlug)) errors.push(`${config.slug} does not belong to ${topic.topicSlug}.`)
        const generator = getGenerator(config.slug, config.version)
        if (generator === null) errors.push(`${config.slug}@${config.version} is not registered.`)
        else for (const level of ['easy', 'medium', 'hard'] as const) if (topic.difficulty[level] > 0 && !generator.supportedDifficulties.includes(level)) errors.push(`${config.slug}@${config.version} does not support ${level}.`)
      }
    }
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const actual = subject.topics.reduce((sum, topic) => sum + topic.difficulty[level], 0)
      if (actual !== subject.difficulty[level]) errors.push(`${subject.subjectSlug} ${level} count must be ${subject.difficulty[level]}.`)
    }
  }
  for (const slug of required) if (!seenSubjects.has(slug)) errors.push(`Required subject ${slug} is missing.`)
  if (input.subjects.reduce((sum, subject) => sum + subject.count, 0) !== input.totalQuestions) errors.push('Subject counts must total 150.')
  for (const level of ['easy', 'medium', 'hard'] as const) {
    const actual = input.subjects.reduce((sum, subject) => sum + subject.difficulty[level], 0)
    if (actual !== input.difficulty[level]) errors.push(`Overall ${level} count must be ${input.difficulty[level]}.`)
  }
  return { valid: errors.length === 0, errors }
}

export interface GeneratedMockExamQuestion {
  position: number
  subjectSlug: MockExamSubjectConfig['subjectSlug']
  subjectTitle: string
  subjectPosition: number
  topicSlug: string
  topicTitle: string
  topicPosition: number
  question: GeneratedQuestion
}

function difficultyPlan(topic: MockExamTopicConfig): GeneratorDifficulty[] {
  return [...Array<GeneratorDifficulty>(topic.difficulty.easy).fill('easy'), ...Array<GeneratorDifficulty>(topic.difficulty.medium).fill('medium'), ...Array<GeneratorDifficulty>(topic.difficulty.hard).fill('hard')]
}

export function generateMockExamQuestions(input: MockExamBlueprint, attemptSeed: string): GeneratedMockExamQuestion[] {
  const validation = validateMockExamBlueprint(input)
  if (!validation.valid) throw new Error(`Invalid mock exam blueprint: ${validation.errors.join(' ')}`)
  const signatures = new Set<string>()
  const prompts = new Set<string>()
  const generated: GeneratedMockExamQuestion[] = []
  for (const subject of [...input.subjects].sort((a, b) => a.position - b.position)) {
    for (const topic of [...subject.topics].sort((a, b) => a.position - b.position)) {
      const rotation = createSeededRandom(`${attemptSeed}|${subject.subjectSlug}|${topic.topicSlug}|rotation`).shuffle([...topic.generators].sort((a, b) => a.rotationPosition - b.rotationPosition))
      const difficulties = createSeededRandom(`${attemptSeed}|${topic.topicSlug}|difficulty`).shuffle(difficultyPlan(topic))
      for (let index = 0; index < topic.count; index += 1) {
        const config = rotation[index % rotation.length]
        const difficulty = difficulties[index]
        if (config === undefined || difficulty === undefined) throw new Error(`Incomplete generator plan for ${topic.topicSlug}.`)
        const question = generateValidatedQuestion({ attemptSeed: `${attemptSeed}|${subject.subjectSlug}|${topic.topicSlug}`, generatorSlug: config.slug, generatorVersion: config.version, difficulty, position: index + 1, existingSignatures: signatures, existingPrompts: prompts, maxRetries: 100 })
        signatures.add(question.metadata.canonicalSignature)
        prompts.add(question.prompt.trim().toLowerCase())
        generated.push({ position: 0, subjectSlug: subject.subjectSlug, subjectTitle: subject.subjectTitle, subjectPosition: subject.position, topicSlug: topic.topicSlug, topicTitle: topic.topicTitle, topicPosition: topic.position, question: { ...question, choices: createSeededRandom(`${attemptSeed}|${topic.topicSlug}|${index + 1}|choices`).shuffle(question.choices) } })
      }
    }
  }
  return createSeededRandom(`${attemptSeed}|mock-question-order`).shuffle(generated).map((item, index) => ({ ...item, position: index + 1 }))
}
