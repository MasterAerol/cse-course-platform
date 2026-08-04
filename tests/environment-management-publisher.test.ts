import { describe,expect,it } from 'vitest'
import { blocksFor,fixedQuestion,generatedByLesson,lessonSpecs,mixedQuestions,officialSources,quizQuestions,subjectSlug,topicDescription,topicSlug,validateQuestions } from '../scripts/environment-management-topic-content.mjs'
import { getGenerator } from '../src/worker/generators/generator.registry'
import type { GeneratorSlug } from '../src/worker/generators/generator.types'
import { rollbackStatusChanges } from '../scripts/logical-reasoning-publisher-helpers.mjs'

const unsafe=/\b(?:should|must) (?:personally |physically )?confront|\b(?:should|must) (?:touch|test|mix|burn|transport|dispose of) (?:an? )?unknown (?:substance|material|waste)|\b(?:should|must) (?:capture|collect) wildlife\b/iu

describe('Environment Management and Protection curriculum and publisher contract',()=>{
  it('targets General Information with the exact topic identity',()=>{
    expect(subjectSlug).toBe('general-information')
    expect(topicSlug).toBe('environment-management-and-protection')
    expect(topicDescription).toContain('environmental rights')
  })

  it('declares twelve sequential lessons and nine generated practices',()=>{
    expect(lessonSpecs).toHaveLength(12)
    expect(lessonSpecs.map((item)=>item.position)).toEqual(Array.from({length:12},(_,index)=>index+1))
    expect(Object.keys(generatedByLesson)).toHaveLength(9)
    expect(lessonSpecs[0]?.lessonType).toBe('reading')
    expect(lessonSpecs.slice(1,11).every((item)=>item.lessonType==='practice')).toBe(true)
    expect(lessonSpecs[11]?.lessonType).toBe('quiz')
  })

  it('provides substantive source-bearing blocks without raw HTML or unsafe instructions',()=>{
    for(const spec of lessonSpecs){
      const blocks=blocksFor(spec.slug)
      expect(blocks.length).toBeGreaterThanOrEqual(9)
      expect(JSON.stringify(blocks)).toMatch(/Article|RA |PD |authoritative/iu)
      expect(JSON.stringify(blocks)).not.toMatch(/<\/?[a-z][^>]*>/iu)
      expect(JSON.stringify(blocks)).not.toMatch(unsafe)
    }
    expect(blocksFor(lessonSpecs[0]?.slug??'')).toHaveLength(13)
  })

  it('source-locks all 12 practice and 20 quiz questions with unambiguous scoring',()=>{
    expect(mixedQuestions).toHaveLength(12)
    expect(quizQuestions).toHaveLength(20)
    for(const [index,item] of [...mixedQuestions,...quizQuestions].entries()){
      expect(item.choices).toHaveLength(4)
      expect(new Set(item.choices.map((choice)=>choice.toLowerCase()))).toHaveLength(4)
      expect(item.correctIndex).toBe(0)
      expect(item.explanation).toContain('Authoritative reference:')
      expect(item.source.url).toMatch(/^https:\/\//u)
      expect(item.source.provisionId).toBeTruthy()
      expect(item.source.institution).toBeTruthy()
      expect(item.source.paraphrasedRule).toBeTruthy()
      expect(JSON.stringify(item)).not.toMatch(unsafe)
      const stored=fixedQuestion(item,index+1,index>=12)
      expect(stored.choices.filter((choice)=>choice.isCorrect)).toHaveLength(1)
      expect(stored.choices[0]?.isCorrect).toBe(true)
    }
    expect(validateQuestions('practice',mixedQuestions.map((item,index)=>fixedQuestion(item,index+1)),12)).toEqual([])
    expect(validateQuestions('quiz',quizQuestions.map((item,index)=>fixedQuestion(item,index+1,true)),20)).toEqual([])
  })

  it('uses authoritative Philippine legal and institutional sources with complete version metadata',()=>{
    expect(officialSources).toHaveLength(12)
    for(const source of officialSources){
      expect(source.url).toMatch(/^https:\/\//u)
      expect(source.sourceType).toMatch(/constitution|statute|presidential_decree|official_mandate/u)
      expect(source.lawId).toBeTruthy()
      expect(source.provisionId).toBeTruthy()
      expect(source.institution).toBeTruthy()
      expect(source.verificationDate).toBe('2026-08-04')
      expect(source.contentVersion).toBe('environment-management-v1')
    }
  })

  it('registers all ten version-one generators',()=>{
    const wanted:GeneratorSlug[]=['environmental-rights-sustainability','clean-air-management','clean-water-management','ecological-solid-waste','toxic-hazardous-substances','biodiversity-wildlife-protected-areas','environmental-impact-assessment','climate-mitigation-adaptation','environmental-institutions-action','mixed-environment-management']
    for(const slug of wanted)expect(getGenerator(slug,1)).not.toBeNull()
  })

  it('rolls status changes back in reverse order and continues after one rollback error',async()=>{
    const calls:string[]=[]
    await rollbackStatusChanges([()=>Promise.resolve().then(()=>{calls.push('first')}),()=>Promise.resolve().then(()=>{calls.push('second');throw new Error('expected')}),()=>Promise.resolve().then(()=>{calls.push('third')})])
    expect(calls).toEqual(['third','second','first'])
  })
})
