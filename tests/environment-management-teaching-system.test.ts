import { describe, expect, it } from 'vitest'
import { environmentManagementLessonSpecs } from '../scripts/lib/environment-management-teaching-system-content.mjs'
import { generatedByLesson, officialSources, sources } from '../scripts/environment-management-topic-content.mjs'
import topicSource from '../scripts/environment-management-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/environment-management/environment-management-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(environmentManagementLessonSpecs.find((item)=>item.slug===slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-environment-management','reading',20],['environmental-rights-sustainable-development','practice',20],
  ['air-quality-clean-air-act','practice',22],['water-quality-clean-water-act','practice',22],
  ['ecological-solid-waste-management','practice',22],['toxic-substances-hazardous-wastes','practice',22],
  ['biodiversity-wildlife-protected-areas','practice',22],['environmental-impact-assessment','practice',22],
  ['climate-change-mitigation-adaptation','practice',22],['environmental-institutions-responsible-action','practice',20],
  ['mixed-environment-management-practice','practice',25],['environment-management-topic-quiz','quiz',30],
]

describe('Environment Management and Protection Teaching System v1',()=>{
  it('preserves the authoritative fourth General Information topic and lesson contract',()=>{
    expect(environmentManagementLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides deterministic valid blocks and two text-first environmental boards per lesson',()=>{
    expect(environmentManagementLessonSpecs).toHaveLength(12)
    for(const item of environmentManagementLessonSpecs){
      expect(item.blocks.length).toBeGreaterThanOrEqual(13)
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}})
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false)
      const visuals=item.blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual])
      expect(visuals).toHaveLength(2)
      for(const visual of visuals){const board=visual as {ariaLabel:string;stages:unknown[];transitions:Array<{whatChanged:string;why:string;source:string}>;memoryTip:{reason:string}};expect(board.ariaLabel.length).toBeGreaterThan(50);expect(board.transitions).toHaveLength(board.stages.length-1);expect(board.transitions.every((step)=>step.whatChanged.length>0&&step.why.length>0&&step.source.length>0)).toBe(true);expect(board.memoryTip.reason.length).toBeGreaterThan(40)}
      for(const block of item.blocks) expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow()
    }
  })
  it('preserves authoritative laws, institutional roles, safety, and high-value distinctions',()=>{
    expect(officialSources).toHaveLength(12)
    expect(sources.constitution.provisionId).toBe('Article II, Section 16')
    expect(sources.air.lawId).toBe('RA 8749')
    expect(sources.water.lawId).toBe('RA 9275')
    expect(sources.waste.lawId).toBe('RA 9003')
    for(const value of ['prevention','sustainability','pollution','conservation','not solely a denr responsibility','an ecc does not guarantee zero impact']) expect(lesson('understanding-environment-management')).toContain(value)
    expect(lesson('ecological-solid-waste-management')).toContain('segregation at source')
    expect(lesson('toxic-substances-hazardous-wastes')).toContain('never touch, test, mix, burn, transport, or dispose')
    expect(lesson('climate-change-mitigation-adaptation')).toContain('mitigation addresses emissions')
    expect(lesson('environmental-institutions-responsible-action')).toContain('distinct, complementary roles')
  })
  it('adds a source-grounded CSE method, why-based memory rule, mistakes, safety, and unchanged practice CTA',()=>{
    for(const item of environmentManagementLessonSpecs){const content=JSON.stringify(item.blocks);expect(content).toContain('Identify the Environmental Issue → Trace Cause and Effect → Match the Law or Institution → Choose Prevention, Management, or Safe Response → Reject Overbroad and Unsafe Claims → Verify Source and Scope');expect(content).toContain('Memory rule — Match the environmental problem to the correct response');expect(content).toMatch(/Common mistake|Common misconception/u);if(item.lessonType!=='reading')expect(content).toContain('answer keys, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged')}
    expect(lesson('toxic-substances-hazardous-wastes')).toContain('do not handle unknown substances')
  })
  it('preserves all questions, generators, Smart Recovery, assessment, and Full Mock ownership',()=>{
    for(const slug of Object.values(generatedByLesson)){expect(topicSource).toContain(slug);expect(generatorSource).toContain(slug);expect(assessmentSource).toContain(slug)}
    expect(topicSource).toContain('export const mixedQuestions=')
    expect(topicSource).toContain('export const quizQuestions=')
    expect(recoverySource).toContain("topicSlug: 'environment-management-and-protection'")
    expect(mockSource).toContain('makeSubject(generalInformationBlueprintV1')
  })
})
