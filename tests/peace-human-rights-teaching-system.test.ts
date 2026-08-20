import { describe, expect, it } from 'vitest'
import { peaceHumanRightsLessonSpecs } from '../scripts/lib/peace-human-rights-teaching-system-content.mjs'
import { constitutionSource, generatedByLesson, officialSources, udhrSource } from '../scripts/peace-human-rights-topic-content.mjs'
import topicSource from '../scripts/peace-human-rights-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/peace-human-rights/peace-human-rights-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(peaceHumanRightsLessonSpecs.find((item)=>item.slug===slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-peace-human-rights','reading',20],['human-dignity-universality','practice',20],
  ['civil-political-rights','practice',22],['economic-social-cultural-rights','practice',22],
  ['equality-nondiscrimination','practice',20],['rights-duties-responsibilities','practice',20],
  ['peace-violence-conflict-nonviolence','practice',22],['conflict-prevention-resolution-peacebuilding','practice',22],
  ['human-rights-institutions-protection','practice',22],['mixed-peace-human-rights-concepts','practice',22],
  ['mixed-peace-human-rights-practice','practice',25],['peace-human-rights-topic-quiz','quiz',30],
]

describe('Peace and Human Rights Teaching System v1',()=>{
  it('preserves the authoritative third General Information topic and lesson contract',()=>{
    expect(peaceHumanRightsLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides deterministic valid blocks and two text-first rights/peace boards per lesson',()=>{
    expect(peaceHumanRightsLessonSpecs).toHaveLength(12)
    for(const item of peaceHumanRightsLessonSpecs){
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
  it('preserves authoritative source classes, neutral safety, and high-value distinctions',()=>{
    expect(constitutionSource.classification).toBe('philippine')
    expect(udhrSource.sourceType).toBe('declaration')
    expect(officialSources).toHaveLength(8)
    for(const value of ['human dignity','conflict: disagreement that is not automatically violence','negative peace','positive peace','foundational declaration','not a criminal court']) expect(lesson('understanding-peace-human-rights')).toContain(value)
    expect(lesson('equality-nondiscrimination')).toContain('does not require mechanically identical treatment')
    expect(lesson('rights-duties-responsibilities')).toContain('rights are not rewards')
    expect(lesson('conflict-prevention-resolution-peacebuilding')).toContain('mediation uses an impartial third party')
    expect(lesson('human-rights-institutions-protection')).toContain('distinct mechanisms')
  })
  it('adds a source-grounded CSE method, why-based memory rule, mistakes, safety, and unchanged practice CTA',()=>{
    for(const item of peaceHumanRightsLessonSpecs){const content=JSON.stringify(item.blocks);expect(content).toContain('Identify the Right or Peace Concept → Classify the Source → Match the Duty or Institution → Apply the Exact Scenario → Reject Absolutes and Role Overstatement → Verify Safety and Lawful Process');expect(content).toContain('Memory rule — Name the right, duty, and actor separately');expect(content).toMatch(/Common mistake|Common misconception/u);if(item.lessonType!=='reading')expect(content).toContain('answer keys, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged')}
    expect(lesson('conflict-prevention-resolution-peacebuilding')).toContain('do not personally mediate danger')
  })
  it('preserves all questions, generators, Smart Recovery, assessment, and Full Mock ownership',()=>{
    for(const slug of Object.values(generatedByLesson)){expect(topicSource).toContain(slug);expect(generatorSource).toContain(slug);expect(assessmentSource).toContain(slug)}
    expect(topicSource).toContain('export const mixedQuestions=')
    expect(topicSource).toContain('export const quizQuestions=')
    expect(recoverySource).toContain("topicSlug: 'peace-and-human-rights'")
    expect(mockSource).toContain('makeSubject(generalInformationBlueprintV1')
  })
})
