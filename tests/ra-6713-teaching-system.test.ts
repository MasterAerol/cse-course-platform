import { describe, expect, it } from 'vitest'
import { ra6713LessonSpecs } from '../scripts/lib/ra-6713-teaching-system-content.mjs'
import { generatedByLesson, implementingRulesSource, statuteSource } from '../scripts/ra-6713-topic-content.mjs'
import topicSource from '../scripts/ra-6713-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/ra-6713/ra-6713-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(ra6713LessonSpecs.find((item)=>item.slug===slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-ra-6713-public-trust','reading',20],['coverage-terms-definitions','practice',20],
  ['norms-conduct','practice',22],['duties-public','practice',20],['saln-fundamentals','practice',22],
  ['divestment-conflict','practice',20],['prohibited-financial-material-interests','practice',20],
  ['outside-employment-private-practice-information','practice',22],['gifts-favors-prohibitions','practice',20],
  ['incentives-enforcement-penalties','practice',22],['mixed-ra-6713-practice','practice',25],
  ['ra-6713-topic-quiz','quiz',30],
]

describe('RA 6713 Teaching System v1',()=>{
  it('preserves the authoritative second General Information topic and lesson contract',()=>{
    expect(ra6713LessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides deterministic valid blocks and two text-first ethical-scenario boards per lesson',()=>{
    expect(ra6713LessonSpecs).toHaveLength(12)
    for(const item of ra6713LessonSpecs){
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
  it('preserves primary-source scope and the high-value statutory distinctions',()=>{
    expect(statuteSource.classification).toBe('primary_statute')
    expect(implementingRulesSource.classification).toBe('implementing_rules')
    for(const value of ['public office is a public trust','disclosure with divestment','saln with tax filing','responsiveness with favoritism','public with confidential information','simple living with mandatory poverty','every courtesy with a prohibited gift']) expect(lesson('understanding-ra-6713-public-trust')).toContain(value)
    expect(lesson('norms-conduct')).toContain('eight official norms are distinct')
    expect(lesson('saln-fundamentals')).toContain('must remain distinct from tax filing')
    expect(lesson('divestment-conflict')).toContain('disclosure reports an interest')
    expect(lesson('gifts-favors-prohibitions')).toContain('narrow statutory exceptions')
    expect(lesson('incentives-enforcement-penalties')).toContain('heavier other-law penalties accurately attributed')
  })
  it('adds a source-grounded CSE method, why-based memory rule, mistakes, and unchanged practice CTA',()=>{
    for(const item of ra6713LessonSpecs){const content=JSON.stringify(item.blocks);expect(content).toContain('Identify Actor and Conduct → Locate the RA 6713 Rule → Separate Duty from Prohibition → Apply Every Stated Condition → Reject Unstated Exceptions → Verify the Source');expect(content).toContain('Memory rule — Public office is a public trust');expect(content).toMatch(/Common mistake|Common misconception/u);if(item.lessonType!=='reading')expect(content).toContain('answer keys, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged')}
  })
  it('preserves all questions, generators, Smart Recovery, assessment, and Full Mock ownership',()=>{
    for(const slug of Object.values(generatedByLesson)){expect(topicSource).toContain(slug);expect(generatorSource).toContain(slug);expect(assessmentSource).toContain(slug)}
    expect(topicSource).toContain('export const mixedQuestions=')
    expect(topicSource).toContain('export const quizQuestions=')
    expect(recoverySource).toContain("topicSlug: 'ra-6713-code-of-conduct'")
    expect(mockSource).toContain('makeSubject(generalInformationBlueprintV1')
  })
})
