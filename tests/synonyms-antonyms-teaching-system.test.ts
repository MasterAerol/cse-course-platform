import { describe, expect, it } from 'vitest'
import { synonymsAntonymsLessonSpecs } from '../scripts/lib/synonyms-antonyms-teaching-system-content.mjs'
import legacySource from '../scripts/synonyms-antonyms-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/synonyms-antonyms/synonyms-antonyms-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import smartRecoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import vocabularySource from '../scripts/lib/vocabulary-word-meaning-teaching-system-content.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson=(slug:string)=>JSON.stringify(synonymsAntonymsLessonSpecs.find((item)=>item.slug===slug)?.blocks)

describe('Synonyms and Antonyms Teaching System v1',()=>{
  it('preserves the authoritative topic slug, twelve activities, types, order, and durations',()=>{
    expect(legacySource).toContain("topicSlug = 'synonyms-and-antonyms'")
    expect(synonymsAntonymsLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual([
      ['understanding-synonyms-and-antonyms','reading',16],['basic-synonyms','practice',15],['basic-antonyms','practice',15],['context-sensitive-synonyms','practice',16],['context-sensitive-antonyms','practice',16],['degree-and-intensity','practice',17],['positive-neutral-and-negative-tone','practice',17],['formal-and-informal-word-choice','practice',16],['synonyms-and-antonyms-in-sentences','practice',17],['mixed-synonym-and-antonym-problems','practice',20],['mixed-synonyms-and-antonyms-practice','practice',20],['synonyms-and-antonyms-topic-quiz','quiz',25],
    ])
  })

  it('uses valid deterministic canonical blocks and preserves every audited legacy count',()=>{
    expect(synonymsAntonymsLessonSpecs.map((item)=>item.blocks.length)).toEqual([12,10,10,10,10,10,10,10,10,10,10,10])
    for(const item of synonymsAntonymsLessonSpecs){
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}})
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false)
      for(const block of item.blocks)expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow()
    }
  })

  it('teaches direct synonym and antonym ideas, near-synonym precision, and relationship direction',()=>{
    const intro=lesson('understanding-synonyms-and-antonyms')
    for(const value of ['same or nearly the same meaning','opposite or strongly contrasting meaning','rapid','quick','scarce','abundant','near-synonyms rather than perfect duplicates'])expect(intro).toContain(value)
    const synonyms=lesson('basic-synonyms')
    for(const value of ['Diligent','hardworking','small, tiny, little, compact, and slight','physician and worker','doctor'])expect(synonyms).toContain(value)
    const antonyms=lesson('basic-antonyms')
    for(const value of ['Temporary','permanent','permit↔prohibit','optimistic','Pessimistic'])expect(antonyms).toContain(value)
  })

  it('teaches context, multiple-meaning use, grammar compatibility, and sentence replacement',()=>{
    const contextualSynonym=lesson('context-sensitive-synonyms')
    for(const value of ['brief explanation','Short is the best contextual synonym','mayor addressed','dealt with','another sense'])expect(contextualSynonym).toContain(value)
    const contextualAntonym=lesson('context-sensitive-antonyms')
    for(const value of ['explicit','Vague','impartial','Biased','same comparison dimension'])expect(contextualAntonym).toContain(value)
    const sentences=lesson('synonyms-and-antonyms-in-sentences')
    for(const value of ['concise report','B. brief','ambiguous','Clear is the best antonym','rapid and quick are adjectives','quickly is an adverb'])expect(sentences).toContain(value)
  })

  it('teaches intensity, tone, register, subtle differences, and precise CSE vocabulary',()=>{
    const degree=lesson('degree-and-intensity')
    for(const value of ['irritated → angry → furious','exhausted','extremely tired','Possible is not synonymous with certain'])expect(degree).toContain(value)
    const tone=lesson('positive-neutral-and-negative-tone')
    for(const value of ['confident','arrogant','economical','cheap','Vocabulary and Word Meaning v1'])expect(tone).toContain(value)
    const formal=lesson('formal-and-informal-word-choice')
    for(const value of ['commence→begin','terminate→end','assist→help','purchase supplies','Buy is the closest'])expect(formal).toContain(value)
    const mixed=lesson('mixed-synonym-and-antonym-problems')
    expect(mixed).toContain('meticulous')
    expect(mixed).toContain('Thorough')
  })

  it('uses systematic distractor elimination, unknown-word support, common mistakes, and reasoned memory tricks',()=>{
    const mixed=lesson('mixed-synonym-and-antonym-problems')
    for(const value of ['same, opposite, related-but-unequal, and unrelated','cautious','careful','reckless','economic','economical','Opposite-direction trap'])expect(mixed).toContain(value)
    expect(lesson('mixed-synonyms-and-antonyms-practice')).toContain('Unknown-word strategy')
    const blocks=synonymsAntonymsLessonSpecs.flatMap((item)=>item.blocks)
    expect(blocks.filter((block)=>block.content.title==='Common mistake'||block.content.title==='Common mistakes')).toHaveLength(12)
    for(const block of blocks.filter((item)=>String(item.content.title??'').startsWith('Memory trick')))expect(String(block.content.text)).toMatch(/because/iu)
  })

  it('uses eight accessible text-focused VisualTeachingBoard models',()=>{
    const blocks=synonymsAntonymsLessonSpecs.flatMap((item)=>item.blocks)
    const visuals=blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual])
    expect(new Set(visuals)).toHaveLength(8)
    expect(visuals.length).toBeGreaterThanOrEqual(12)
    for(const visual of visuals){
      expect(visual.transitions).toHaveLength(visual.stages.length-1)
      expect(visual.transitions.every((transition)=>transition.whatChanged&&transition.why&&transition.source)).toBe(true)
      expect(visual.memoryTip.reason.length).toBeGreaterThan(20)
      expect(visual.ariaLabel.length).toBeGreaterThan(40)
    }
  })

  it('preserves practice linkage and avoids duplicating Vocabulary v1 ownership',()=>{
    for(const item of synonymsAntonymsLessonSpecs.filter((entry)=>entry.lessonType==='practice'))expect(JSON.stringify(item.blocks)).toContain('Practice CTA')
    const all=JSON.stringify(synonymsAntonymsLessonSpecs)
    expect(all).toContain('Vocabulary and Word Meaning v1 remains the source for broad roots, affixes, word families, denotation, and multiple-meaning instruction')
    expect(vocabularySource).toContain("slug:'roots-and-base-words'")
    expect(vocabularySource).toContain("slug:'denotation-and-connotation'")
    expect(legacySource).toContain("'mixed-synonyms-and-antonyms-practice'")
    expect(legacySource).toContain("'synonyms-and-antonyms-topic-quiz'")
  })

  it('preserves all generators, Smart Recovery, assessments, and completed teaching systems',()=>{
    for(const slug of ['basic-synonym','basic-antonym','context-sensitive-synonym','context-sensitive-antonym','degree-intensity-synonym','connotation-tone-synonym','formal-informal-equivalent','sentence-synonym-antonym','mixed-synonyms-antonyms']){
      expect(legacySource).toContain("'"+slug+"'")
      expect(generatorSource).toContain("'"+slug+"'")
      expect(assessmentSource).toContain("'"+slug+"'")
    }
    expect(smartRecoverySource).toContain("topicSlug: 'synonyms-and-antonyms'")
    for(const key of ['percentages','fractions','decimals','ratio-proportion','average','number-problems','age-problems','work-rate','distance-speed-time','simple-interest','vocabulary-and-word-meaning','synonyms-and-antonyms'])expect(registrySource).toContain(key)
  })
})
