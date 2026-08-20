import { describe, expect, it } from 'vitest'
import { philippineConstitutionLessonSpecs } from '../scripts/lib/philippine-constitution-teaching-system-content.mjs'
import { constitutionSource, examCoverageSource, generatedByLesson } from '../scripts/philippine-constitution-topic-content.mjs'
import topicSource from '../scripts/philippine-constitution-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/philippine-constitution/philippine-constitution-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug:string) => JSON.stringify(philippineConstitutionLessonSpecs.find((item)=>item.slug===slug)?.blocks).toLowerCase()
const expected = [
  ['understanding-philippine-constitution','reading',20],['preamble-national-territory-state-principles','practice',20],
  ['bill-of-rights','practice',22],['citizenship-and-suffrage','practice',20],['legislative-department','practice',22],
  ['executive-department','practice',22],['judicial-department','practice',22],['constitutional-commissions','practice',20],
  ['accountability-of-public-officers','practice',20],['local-government-economy-constitutional-change','practice',24],
  ['mixed-philippine-constitution-practice','practice',25],['philippine-constitution-topic-quiz','quiz',30],
]

describe('Philippine Constitution Fundamentals Teaching System v1',()=>{
  it('preserves the authoritative first General Information topic and lesson contract',()=>{
    expect(philippineConstitutionLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual(expected)
  })
  it('provides deterministic valid blocks and two text-first constitutional boards per lesson',()=>{
    expect(philippineConstitutionLessonSpecs).toHaveLength(12)
    for(const item of philippineConstitutionLessonSpecs){
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
  it('preserves stable primary-source teaching and key constitutional distinctions',()=>{
    expect(constitutionSource.classification).toBe('primary_constitution')
    expect(examCoverageSource.classification).toBe('official_exam_coverage')
    for(const value of ['preamble','eighteen numbered articles','no branch holds every government power','public office is a public trust','not legal advice']) expect(lesson('understanding-philippine-constitution')).toContain(value)
    expect(lesson('bill-of-rights')).toContain('rights protect persons against government action')
    expect(lesson('citizenship-and-suffrage')).toContain('related but distinct')
    expect(lesson('constitutional-commissions')).toContain('csc, comelec, and coa')
    expect(lesson('local-government-economy-constitutional-change')).toContain('local autonomy is not sovereignty')
  })
  it('adds a source-grounded CSE method, why-based memory rule, mistakes, and unchanged practice CTA',()=>{
    for(const item of philippineConstitutionLessonSpecs){const content=JSON.stringify(item.blocks);expect(content).toContain('Identify Concept → Locate Article and Section → Match Institution or Right → Apply Exact Scope → Eliminate Overreach → Verify');expect(content).toContain('Memory rule — Match the role and scope before the name');expect(content).toMatch(/Common mistake|Common misconception/u);if(item.lessonType!=='reading')expect(content).toContain('answer keys, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged')}
  })
  it('preserves all questions, generators, Smart Recovery, assessment, and Full Mock ownership',()=>{
    for(const slug of Object.values(generatedByLesson)){expect(topicSource).toContain(slug);expect(generatorSource).toContain(slug);expect(assessmentSource).toContain(slug)}
    expect(topicSource).toContain('export const mixedQuestions=')
    expect(topicSource).toContain('export const quizQuestions=')
    expect(recoverySource).toContain("topicSlug: 'philippine-constitution-fundamentals'")
    expect(mockSource).toContain('makeSubject(generalInformationBlueprintV1')
  })
})
