import { describe, expect, it } from 'vitest'
import { philippineConstitutionLessonSpecs } from '../scripts/lib/philippine-constitution-teaching-system-content.mjs'
import { ra6713LessonSpecs } from '../scripts/lib/ra-6713-teaching-system-content.mjs'
import { peaceHumanRightsLessonSpecs } from '../scripts/lib/peace-human-rights-teaching-system-content.mjs'
import { environmentManagementLessonSpecs } from '../scripts/lib/environment-management-teaching-system-content.mjs'
import { teachingPublisherRegistry } from '../scripts/lib/teaching-publisher-registry.mjs'
import { analyticalAbilityBlueprintV1, generalInformationBlueprintV1, numericalAbilityBlueprintV1, validateSubjectAssessmentBlueprint, verbalAbilityBlueprintV1 } from '../src/worker/domain/subject-assessment-blueprint'
import { fullCseMockBlueprintV1, validateMockExamBlueprint } from '../src/worker/domain/mock-exam-blueprint'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'

const topics = [
  ['philippine-constitution-fundamentals',philippineConstitutionLessonSpecs],
  ['ra-6713-code-of-conduct',ra6713LessonSpecs],
  ['peace-and-human-rights',peaceHumanRightsLessonSpecs],
  ['environment-management-and-protection',environmentManagementLessonSpecs],
] as const

describe('General Information Teaching System subject rollout',()=>{
  it('contains all four authoritative topics, 48 unique lessons, and 96 text-equivalent boards',()=>{
    expect(topics.map(([slug])=>slug)).toEqual(['philippine-constitution-fundamentals','ra-6713-code-of-conduct','peace-and-human-rights','environment-management-and-protection'])
    const lessons=topics.flatMap(([,items])=>items)
    expect(lessons).toHaveLength(48)
    expect(new Set(lessons.map((item)=>item.slug)).size).toBe(48)
    expect(lessons.flatMap((item)=>item.blocks.filter((block)=>block.content.visual!==undefined))).toHaveLength(96)
    expect(lessons.filter((item)=>item.lessonType!=='reading').every((item)=>JSON.stringify(item.blocks).includes('Practice CTA: continue to the linked'))).toBe(true)
  })
  it('registers one guarded publisher for every topic in curriculum order',()=>{
    const keys=Object.keys(teachingPublisherRegistry)
    expect(keys.slice(-4)).toEqual(topics.map(([slug])=>slug))
    for(const [slug] of topics) expect(teachingPublisherRegistry[slug]).toMatchObject({topicSlug:slug,capabilityCheck:true})
  })
  it('preserves the 40-question General Information assessment and 10-question topic ownership',()=>{
    expect(validateSubjectAssessmentBlueprint(generalInformationBlueprintV1)).toEqual({valid:true,errors:[]})
    expect(generalInformationBlueprintV1.totalQuestions).toBe(40)
    expect(generalInformationBlueprintV1.topics.map((topic)=>[topic.topicSlug,topic.position,topic.count,topic.difficulty.easy,topic.difficulty.medium,topic.difficulty.hard,topic.generators.length])).toEqual(topics.map(([slug],index)=>[slug,index+1,10,4,4,2,10]))
  })
  it('preserves Smart Recovery and the 20-question Full Mock allocation',()=>{
    for(const [slug] of topics) expect(recoverySource).toContain("topicSlug: '"+slug+"'")
    const general=fullCseMockBlueprintV1.subjects.find((subject)=>subject.subjectSlug==='general-information')
    expect(general).toMatchObject({position:4,count:20,difficulty:{easy:6,medium:10,hard:4}})
    expect(general?.topics.map((topic)=>[topic.topicSlug,topic.count])).toEqual(topics.map(([slug])=>[slug,5]))
    expect(validateMockExamBlueprint(fullCseMockBlueprintV1)).toEqual({valid:true,errors:[]})
  })
  it('preserves completed Numerical, Verbal, and Analytical assessment and Full Mock contracts',()=>{
    expect(validateSubjectAssessmentBlueprint(numericalAbilityBlueprintV1).valid).toBe(true)
    expect(validateSubjectAssessmentBlueprint(verbalAbilityBlueprintV1).valid).toBe(true)
    expect(validateSubjectAssessmentBlueprint(analyticalAbilityBlueprintV1).valid).toBe(true)
    expect([numericalAbilityBlueprintV1.topics.length,verbalAbilityBlueprintV1.topics.length,analyticalAbilityBlueprintV1.topics.length]).toEqual([10,10,9])
    expect(fullCseMockBlueprintV1).toMatchObject({totalQuestions:150,timedDurationMinutes:190,subjects:[{count:50},{count:40},{count:40},{count:20}]})
  })
})
