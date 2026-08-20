import { describe, expect, it } from 'vitest'
import { analogyClassificationLessonSpecs } from '../scripts/lib/analogy-classification-teaching-system-content.mjs'
import { codingDecodingLessonSpecs } from '../scripts/lib/coding-decoding-teaching-system-content.mjs'
import { dataInterpretationLessonSpecs } from '../scripts/lib/data-interpretation-teaching-system-content.mjs'
import { letterSeriesLessonSpecs } from '../scripts/lib/letter-series-teaching-system-content.mjs'
import { logicalReasoningLessonSpecs } from '../scripts/lib/logical-reasoning-teaching-system-content.mjs'
import { numberSeriesLessonSpecs } from '../scripts/lib/number-series-teaching-system-content.mjs'
import { orderingRankingLessonSpecs } from '../scripts/lib/ordering-ranking-teaching-system-content.mjs'
import { seatingArrangementsLessonSpecs } from '../scripts/lib/seating-arrangements-teaching-system-content.mjs'
import { syllogismsLessonSpecs } from '../scripts/lib/syllogisms-teaching-system-content.mjs'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
import { analyticalAbilityBlueprintV1 } from '../src/worker/domain/subject-assessment-blueprint'
import { fixedQuestionSourceManifest } from '../src/worker/domain/smart-recovery-fixed-question-manifest'
import { skillDefinitions } from '../src/worker/domain/smart-recovery-skills'
import { fullCseMockBlueprintV1 } from '../src/worker/domain/mock-exam-blueprint'

const topics = [
  ['logical-reasoning-fundamentals',logicalReasoningLessonSpecs],
  ['analogy-and-classification',analogyClassificationLessonSpecs],
  ['number-series',numberSeriesLessonSpecs],
  ['letter-series',letterSeriesLessonSpecs],
  ['coding-and-decoding',codingDecodingLessonSpecs],
  ['ordering-and-ranking',orderingRankingLessonSpecs],
  ['syllogisms',syllogismsLessonSpecs],
  ['seating-and-arrangement-problems',seatingArrangementsLessonSpecs],
  ['data-interpretation',dataInterpretationLessonSpecs],
] as const
const slugs = topics.map(([slug])=>slug)
const generatorCounts = [10,9,9,9,9,9,9,9,9]
type TeachingBoard = {
  ariaLabel:string
  stages:Array<{expression:Array<{text:string}>}>
  transitions:Array<{whatChanged:string;why:string}>
}

describe('Analytical Ability Teaching System rollout integrity', () => {
  it('covers all nine topics and all 108 authoritative activities in curriculum order', () => {
    expect(analyticalAbilityBlueprintV1.topics.map((topic)=>topic.topicSlug)).toEqual(slugs)
    expect(topics.flatMap(([,lessons])=>lessons)).toHaveLength(108)
    for (const [,lessons] of topics) {
      expect(lessons).toHaveLength(12)
      expect(lessons.map((lesson)=>lesson.position)).toEqual(Array.from({length:12},(_,index)=>index+1))
      expect(lessons[0]?.lessonType).toBe('reading')
      expect(lessons.at(-2)?.lessonType).toBe('practice')
      expect(lessons.at(-1)?.lessonType).toBe('quiz')
      expect(new Set(lessons.map((lesson)=>lesson.slug)).size).toBe(12)
    }
  })
  it('keeps one registered safe publisher and canonical manifest per topic', () => {
    for (const [slug,lessons] of topics) {
      expect(resolveTeachingPublisher(slug)).toMatchObject({topicSlug:slug,capabilityCheck:true})
      expect(lessons.every((lesson)=>lesson.blocks.length>0)).toBe(true)
      expect(lessons.flatMap((lesson)=>lesson.blocks).filter((block)=>block.content.visual!==undefined)).toHaveLength(24)
    }
  })
  it('preserves subject-assessment ownership and exact 45-question distribution', () => {
    expect(analyticalAbilityBlueprintV1.totalQuestions).toBe(45)
    expect(analyticalAbilityBlueprintV1.topics).toHaveLength(9)
    expect(analyticalAbilityBlueprintV1.topics.map((topic)=>topic.count)).toEqual(Array(9).fill(5))
    expect(analyticalAbilityBlueprintV1.topics.map((topic)=>topic.difficulty)).toEqual(Array(9).fill({easy:2,medium:2,hard:1}))
    expect(analyticalAbilityBlueprintV1.topics.map((topic)=>topic.generators.length)).toEqual(generatorCounts)
  })
  it('preserves Smart Recovery topic/skill and fixed practice/quiz ownership', () => {
    const analyticalSkills = skillDefinitions.filter((skill)=>skill.subjectSlug==='analytical-ability')
    expect(new Set(analyticalSkills.map((skill)=>skill.topicSlug))).toEqual(new Set(slugs))
    for (const [index,slug] of slugs.entries()) {
      expect(analyticalSkills.filter((skill)=>skill.topicSlug===slug)).toHaveLength(generatorCounts[index])
      const sources = fixedQuestionSourceManifest.filter((source)=>source.topicSlug===slug)
      expect(sources.map((source)=>source.assessmentType).sort()).toEqual(['fixed-practice','topic-quiz'])
      expect(sources.map((source)=>source.expectedQuestionCount).sort((a,b)=>a-b)).toEqual([8,15])
    }
  })
  it('preserves the Full Mock Analytical allocation and generators', () => {
    const analytical = fullCseMockBlueprintV1.subjects.find((subject)=>subject.subjectSlug==='analytical-ability')
    expect(analytical).toBeDefined()
    expect(analytical?.count).toBe(40)
    expect(analytical?.difficulty).toEqual({easy:12,medium:20,hard:8})
    expect(analytical?.topics.map((topic)=>topic.topicSlug)).toEqual(slugs)
    expect(analytical?.topics.map((topic)=>topic.count)).toEqual([5,5,4,4,4,4,5,4,5])
    expect(analytical?.topics.map((topic)=>topic.generators.length)).toEqual(generatorCounts)
  })
  it('keeps deterministic lesson locking/progress and text-equivalent visual contracts', () => {
    for (const [,lessons] of topics) for (const lesson of lessons) {
      const serialized = JSON.stringify(lesson.blocks)
      if (lesson.lessonType!=='reading') expect(serialized).toContain('curriculum lock remain unchanged')
      expect(serialized).toContain('Verify the final answer against the original question')
      const boards = lesson.blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual]) as TeachingBoard[]
      for (const board of boards) {
        expect(board.ariaLabel.length).toBeGreaterThan(40)
        expect(board.stages.every((stage)=>stage.expression.every((item)=>item.text.length>0))).toBe(true)
        expect(board.transitions.every((transition)=>transition.whatChanged.length>0&&transition.why.length>0)).toBe(true)
      }
    }
  })
})
