import { describe, expect, it } from 'vitest'
import { readingComprehensionLessonSpecs } from '../scripts/lib/reading-comprehension-teaching-system-content.mjs'
import legacySource from '../scripts/reading-comprehension-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/reading-comprehension/reading-comprehension-generators.ts?raw'
import bankSource from '../src/worker/domain/reading-comprehension/reading-comprehension-bank.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import lessonPageSource from '../src/react-app/pages/LessonPage.tsx?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson=(slug:string)=>JSON.stringify(readingComprehensionLessonSpecs.find((item)=>item.slug===slug)?.blocks)

describe('Reading Comprehension Teaching System v1',()=>{
  it('preserves the authoritative tenth Verbal topic, lesson order, activity types, and durations',()=>{
    expect(legacySource).toContain("topicSlug = 'reading-comprehension'")
    expect(readingComprehensionLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual([
      ['understanding-reading-comprehension','reading',18],['main-idea-topic','practice',18],['supporting-details','practice',18],['sequence-organization','practice',19],['cause-effect','practice',18],['vocabulary-in-context','practice',18],['inference-implied-meaning','practice',19],['author-purpose-tone','practice',19],['fact-opinion-conclusion','practice',19],['mixed-reading-comprehension-problems','practice',21],['mixed-reading-comprehension-practice','practice',22],['reading-comprehension-topic-quiz','quiz',28],
    ])
  })
  it('uses valid deterministic canonical blocks with complete, unambiguous worked passages',()=>{
    expect(readingComprehensionLessonSpecs).toHaveLength(12)
    for(const item of readingComprehensionLessonSpecs){expect(item.blocks.length).toBeGreaterThanOrEqual(10);expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}});expect(item.blocks.at(-1)?.blockType).toBe('summary');expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false);for(const block of item.blocks){expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow();if(block.blockType==='example'){expect(block.content.problem).toEqual(expect.any(String));expect(block.content.steps).toEqual(expect.arrayContaining([expect.any(String)]));expect(block.content.answer).toEqual(expect.any(String))}}}
  })
  it('teaches passage authority, question purpose, evidence-first reasoning, and outside-knowledge rejection',()=>{const content=lesson('understanding-reading-comprehension');for(const value of ['not a memory contest','passage is the authority','fewer late arrivals','Read → Ask → Locate → Prove → Choose','outside knowledge','no evidence'])expect(content).toContain(value)})
  it('teaches main idea, supporting detail, best title, paraphrase, and stated-status traps',()=>{
    for(const value of ['main idea states the central point','best title','too narrow','too broad','Main idea = umbrella'])expect(lesson('main-idea-topic')).toContain(value)
    for(const value of ['faithful paraphrase','stated, contradicted, and not mentioned','not contradicted','Same idea, not same words'])expect(lesson('supporting-details')).toContain(value)
  })
  it('teaches structure, reference words, chronology, cause-effect direction, and contextual meaning',()=>{
    for(const value of ['problem → solution → result','What does “This” refer to','reference words backward','paragraph jobs'])expect(lesson('sequence-organization')).toContain(value)
    for(const value of ['cause → immediate effect','reversed relationship','Because points back'])expect(lesson('cause-effect')).toContain(value)
    for(const value of ['as used in this passage','Reserved means set aside','“It” refers to the new portal','part of speech'])expect(lesson('vocabulary-in-context')).toContain(value)
  })
  it('teaches limited inference, purpose versus topic, tone evidence, facts, opinions, and conclusions',()=>{
    for(const value of ['evidence A + evidence B + one small logical step','Lena expected rain','overgeneralized prediction'])expect(lesson('inference-implied-meaning')).toContain(value)
    for(const value of ['Topic is what','Purpose is why','promising step','Optimistic or approving'])expect(lesson('author-purpose-tone')).toContain(value)
    for(const value of ['500 applications','best improvement','fact; the second is opinion','procedure improved service'])expect(lesson('fact-opinion-conclusion')).toContain(value)
  })
  it('teaches CSE distractor elimination and a multi-question evidence method',()=>{const content=JSON.stringify(readingComprehensionLessonSpecs.flatMap((item)=>item.blocks)).toLowerCase();for(const value of ['true but irrelevant','partly true','extreme','wrong person','wrong-time','reversed','one unsupported addition'])expect(content).toContain(value)})
  it('provides specific mistakes, why-based memory, summaries, and unchanged authoritative practice CTAs',()=>{const blocks=readingComprehensionLessonSpecs.flatMap((item)=>item.blocks);expect(blocks.filter((block)=>String(block.content.title??'').startsWith('Common mistake'))).toHaveLength(12);for(const block of blocks.filter((item)=>String(item.content.title??'').startsWith('Memory trick')))expect(String(block.content.text)).toContain('because');for(const item of readingComprehensionLessonSpecs.filter((entry)=>entry.lessonType!=='reading'))expect(JSON.stringify(item.blocks)).toContain('existing route, generator or fixed questions, passage pool, scoring, explanations, and curriculum lock remain unchanged')})
  it('uses accessible text-first VisualTeachingBoard data with explanations beyond color',()=>{const visuals=readingComprehensionLessonSpecs.flatMap((item)=>item.blocks).flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual]);expect(visuals).toHaveLength(24);for(const visual of visuals){expect(visual.ariaLabel.length).toBeGreaterThan(40);expect(visual.transitions).toHaveLength(visual.stages.length-1);expect(visual.transitions.every((item)=>item.whatChanged&&item.why&&item.source)).toBe(true);expect(visual.memoryTip.reason.length).toBeGreaterThan(20)}})
  it('preserves generators, passage banks, recovery, assessments, Full Mock, prior systems, and lesson scrolling',()=>{for(const slug of ['main-idea-comprehension','supporting-detail-comprehension','sequence-organization-comprehension','cause-effect-comprehension','vocabulary-in-context-comprehension','inference-comprehension','author-purpose-tone-comprehension','fact-opinion-conclusion-comprehension','mixed-reading-comprehension']){expect(legacySource).toContain("'"+slug+"'");expect(generatorSource).toContain("'"+slug+"'");expect(assessmentSource).toContain("'"+slug+"'")};expect(bankSource).toContain('readingComprehensionBankV1');expect(recoverySource).toContain("topicSlug: 'reading-comprehension'");expect(mockSource).toContain('verbalAbilityBlueprintV1');for(const topic of ['percentages','simple-interest','vocabulary-and-word-meaning','synonyms-and-antonyms','context-clues','sentence-completion','grammar-and-correct-usage','subject-verb-agreement','pronouns-and-modifiers','sentence-structure-and-error-identification','paragraph-organization'])expect(registrySource).toContain(topic);expect(lessonPageSource).toContain('lesson-app-shell')})
})
