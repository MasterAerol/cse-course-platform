import { describe, expect, it } from 'vitest'
import { subjectVerbAgreementLessonSpecs } from '../scripts/lib/subject-verb-agreement-teaching-system-content.mjs'
import legacySource from '../scripts/subject-verb-agreement-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/subject-verb-agreement/subject-verb-agreement-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import smartRecoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import fullMockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import grammarSource from '../scripts/lib/grammar-correct-usage-teaching-system-content.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson=(slug:string)=>JSON.stringify(subjectVerbAgreementLessonSpecs.find((item)=>item.slug===slug)?.blocks)

describe('Subject–Verb Agreement Teaching System v1',()=>{
  it('preserves the authoritative sixth Verbal topic, order, types, and durations',()=>{
    expect(legacySource).toContain("topicSlug = 'subject-verb-agreement'")
    expect(subjectVerbAgreementLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual([
      ['understanding-subject-verb-agreement','reading',16],['singular-and-plural-subjects','practice',16],['compound-subjects','practice',16],['either-or-neither-nor-subjects','practice',17],['indefinite-pronouns','practice',17],['collective-nouns-and-quantities','practice',18],['intervening-phrases-and-clauses','practice',17],['inverted-sentences-there-is-there-are','practice',18],['special-agreement-cases','practice',18],['mixed-subject-verb-agreement-problems','practice',20],['mixed-subject-verb-agreement-practice','practice',20],['subject-verb-agreement-topic-quiz','quiz',25],
    ])
  })
  it('uses valid deterministic blocks and preserves audited production counts',()=>{
    expect(subjectVerbAgreementLessonSpecs.map((item)=>item.blocks.length)).toEqual([12,10,10,10,10,10,10,10,10,10,10,10])
    for(const item of subjectVerbAgreementLessonSpecs){
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}})
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false)
      for(const block of item.blocks) expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow()
    }
  })
  it('teaches the true subject, opposite-looking noun/verb s patterns, and core verb families',()=>{
    for(const value of ['Verb → Subject → Number → Rule → Check','grammatical subject','employee works','employees work','is; you/we/they','has;','does;']) expect(lesson('understanding-subject-verb-agreement')+lesson('singular-and-plural-subjects')).toContain(value)
    expect(lesson('singular-and-plural-subjects')).toContain('Noun -s plural; verb -s singular')
  })
  it('teaches compound, proximity, indefinite-pronoun, and quantity decisions',()=>{
    for(const value of ['Maria and Jose','along with','each student and each teacher','one breakfast']) expect(lesson('compound-subjects')).toContain(value)
    for(const value of ['nearer subject','not only','employees are','manager is']) expect(lesson('either-or-neither-nor-subjects')).toContain(value)
    for(const value of ['everyone','several','Some of the water','Some of the documents']) expect(lesson('indefinite-pronouns')).toContain(value)
    for(const value of ['committee has approved','₱20,000 is','half of students are']) expect(lesson('collective-nouns-and-quantities')).toContain(value)
  })
  it('teaches interrupters, inversion, special cases, and the CSE diagnostic method',()=>{
    for(const value of ['Remove the middle','quality of the submitted reports','Relative clauses have their own agreement pair']) expect(lesson('intervening-phrases-and-clauses')).toContain(value)
    for(const value of ['There is not the subject','There are several problems','Restore ordinary order']) expect(lesson('inverted-sentences-there-is-there-are')).toContain(value)
    for(const value of ['A number of employees are','The number of employees is','The news is','A pair of scissors is','Great Expectations is']) expect(lesson('special-agreement-cases')).toContain(value)
    for(const value of ['Verb → Subject → Number → Rule → Check','nearest-noun trap','error-identification']) expect(lesson('mixed-subject-verb-agreement-problems')+lesson('subject-verb-agreement-topic-quiz')).toContain(value)
  })
  it('uses accessible visual boards, reasoned memory tricks, common mistakes, and existing practice CTAs',()=>{
    const blocks=subjectVerbAgreementLessonSpecs.flatMap((item)=>item.blocks)
    const visuals=blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual])
    expect(new Set(visuals)).toHaveLength(9)
    expect(visuals.length).toBeGreaterThanOrEqual(13)
    for(const visual of visuals){expect(visual.transitions).toHaveLength(visual.stages.length-1);expect(visual.transitions.every((transition)=>transition.whatChanged&&transition.why&&transition.source)).toBe(true);expect(visual.memoryTip.reason.length).toBeGreaterThan(20);expect(visual.ariaLabel.length).toBeGreaterThan(40)}
    expect(blocks.filter((block)=>String(block.content.title??'').startsWith('Common mistake'))).toHaveLength(12)
    for(const item of subjectVerbAgreementLessonSpecs.filter((entry)=>entry.lessonType==='practice')) expect(JSON.stringify(item.blocks)).toContain('Practice CTA')
  })
  it('preserves generators, fixed practice, quiz, recovery, assessments, Full Mock, and Grammar ownership',()=>{
    for(const slug of ['basic-subject-verb-agreement','compound-subject-agreement','either-or-neither-nor-agreement','indefinite-pronoun-agreement','collective-quantity-agreement','intervening-phrase-agreement','inverted-sentence-agreement','special-case-agreement','mixed-subject-verb-agreement']){expect(legacySource).toContain("'"+slug+"'");expect(generatorSource).toContain("'"+slug+"'");expect(assessmentSource).toContain("'"+slug+"'")}
    expect(legacySource).toContain("'mixed-subject-verb-agreement-practice'")
    expect(legacySource).toContain("'subject-verb-agreement-topic-quiz'")
    expect(smartRecoverySource).toContain("topicSlug: 'subject-verb-agreement'")
    expect(fullMockSource).toContain('verbalAbilityBlueprintV1')
    expect(grammarSource).toContain("slug:'understanding-standard-english-usage'")
    expect(registrySource).toContain("'subject-verb-agreement'")
  })
})
