import { describe, expect, it } from 'vitest'
import { contextCluesLessonSpecs } from '../scripts/lib/context-clues-teaching-system-content.mjs'
import legacySource from '../scripts/context-clues-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/context-clues/context-clues-generators.ts?raw'
import generatorTypesSource from '../src/worker/domain/context-clues/context-clues.types.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import smartRecoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import vocabularySource from '../scripts/lib/vocabulary-word-meaning-teaching-system-content.mjs?raw'
import synonymsSource from '../scripts/lib/synonyms-antonyms-teaching-system-content.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson=(slug:string)=>JSON.stringify(contextCluesLessonSpecs.find((item)=>item.slug===slug)?.blocks)

describe('Context Clues Teaching System v1',()=>{
  it('preserves the authoritative topic slug, twelve activities, types, order, and durations',()=>{
    expect(legacySource).toContain("topicSlug = 'context-clues'")
    expect(contextCluesLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual([
      ['understanding-context-clues','reading',16],['definition-clues','practice',15],['synonym-clues','practice',15],['antonym-contrast-clues','practice',16],['example-illustration-clues','practice',16],['cause-effect-clues','practice',16],['general-sense-clues','practice',17],['multiple-meaning-clues','practice',17],['two-sentence-clues','practice',17],['mixed-context-clues','practice',20],['context-clues-fixed-practice','practice',20],['context-clues-topic-quiz','quiz',25],
    ])
  })

  it('uses valid deterministic canonical blocks and preserves every audited legacy count',()=>{
    expect(contextCluesLessonSpecs.map((item)=>item.blocks.length)).toEqual([11,10,10,10,10,10,10,10,10,10,10,10])
    for(const item of contextCluesLessonSpecs){
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}})
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false)
      for(const block of item.blocks)expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow()
    }
  })

  it('teaches the zero-knowledge evidence model, signal words, prediction, and replacement',()=>{
    const intro=lesson('understanding-context-clues')
    for(const value of ['information near an unfamiliar word or phrase','Do not look only at the unknown word','treacherous','deep holes','loose rocks','slippery mud','dangerous or unsafe','Read → Find → Clue → Predict → Replace → Check','The clue type is a tool; meaning is the goal'])expect(intro).toContain(value)
    for(const signal of ['in other words','however','unlike','such as','for instance','consequently'])expect(intro).toContain(signal)
  })

  it('teaches definition, punctuation, restatement, synonym, and contrast clues accurately',()=>{
    const definitions=lesson('definition-clues')
    for(const value of ['Arid regions','very little rainfall','Arid means dry','employee was diligent','worked carefully and consistently','Punctuation may frame'])expect(definitions).toContain(value)
    const synonym=lesson('synonym-clues')
    for(const value of ['path was narrow','very tight and limited in width','clerk was diligent','grammatical role'])expect(synonym).toContain(value)
    const contrast=lesson('antonym-contrast-clues')
    for(const value of ['Unlike his timid brother','confident and outspoken','Timid means shy','first explanation was vague','precise and detailed','random opposite'])expect(contrast).toContain(value)
  })

  it('teaches example, cause/effect, inference, multi-clue, and tone-supported reasoning',()=>{
    const examples=lesson('example-illustration-clues')
    for(const value of ['aquatic animals','fish, whales, and dolphins','related to water','implements','tools or equipment'])expect(examples).toContain(value)
    const cause=lesson('cause-effect-clues')
    for(const value of ['floor was slippery','lost their footing','building began to tremble','Tremble means shake','effect as the definition'])expect(cause).toContain(value)
    const general=lesson('general-sense-clues')
    for(const value of ['two consecutive shifts','extremely tired','roof had holes','windows were broken','walls were beginning to collapse','badly damaged','tone only as support'])expect(general).toContain(value)
  })

  it('teaches contextual multiple meanings, grammatical fit, and linked local/global context',()=>{
    const meanings=lesson('multiple-meaning-clues')
    for(const value of ['issue new identification cards','distribute or provide','officer addressed the complaint','dealt with','part of speech'])expect(meanings).toContain(value)
    const linked=lesson('two-sentence-clues')
    for(const value of ['shortage of clean water','small supply','insufficient amount','records were obsolete','newer system had replaced them','read past the period'])expect(linked).toContain(value)
    expect(generatorTypesSource).not.toContain("'phrase'")
    expect(JSON.stringify(contextCluesLessonSpecs)).not.toContain('on the fence')
  })

  it('teaches progressive CSE examples, elimination, uncertain-word support, common mistakes, and reasoned memory tricks',()=>{
    const mixed=lesson('mixed-context-clues')
    for(const value of ['mandatory','required','devoured','ate eagerly or quickly','provocative','strong reaction or controversy','another-context senses','too broad or narrow'])expect(mixed).toContain(value)
    expect(lesson('context-clues-fixed-practice')).toContain('Uncertain-word strategy')
    const blocks=contextCluesLessonSpecs.flatMap((item)=>item.blocks)
    expect(blocks.filter((block)=>block.content.title==='Common mistake'||block.content.title==='Common mistakes')).toHaveLength(12)
    for(const block of blocks.filter((item)=>String(item.content.title??'').startsWith('Memory trick')))expect(String(block.content.text)).toMatch(/because/iu)
  })

  it('uses eight accessible text-focused VisualTeachingBoard models and unchanged practice CTAs',()=>{
    const blocks=contextCluesLessonSpecs.flatMap((item)=>item.blocks)
    const visuals=blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual])
    expect(new Set(visuals)).toHaveLength(8)
    expect(visuals.length).toBeGreaterThanOrEqual(12)
    for(const visual of visuals){
      expect(visual.transitions).toHaveLength(visual.stages.length-1)
      expect(visual.transitions.every((transition)=>transition.whatChanged&&transition.why&&transition.source)).toBe(true)
      expect(visual.memoryTip.reason.length).toBeGreaterThan(20)
      expect(visual.ariaLabel.length).toBeGreaterThan(40)
    }
    for(const item of contextCluesLessonSpecs.filter((entry)=>entry.lessonType==='practice'))expect(JSON.stringify(item.blocks)).toContain('Practice CTA')
  })

  it('preserves generators, fixed assessment ownership, previous Verbal systems, and avoids duplication',()=>{
    for(const slug of ['definition-context-clue','synonym-context-clue','antonym-contrast-clue','example-illustration-clue','cause-effect-context-clue','general-sense-context-clue','multiple-meaning-context-clue','two-sentence-context-clue','mixed-context-clues']){
      expect(legacySource).toContain("'"+slug+"'")
      expect(generatorSource).toContain("'"+slug+"'")
      expect(assessmentSource).toContain("'"+slug+"'")
    }
    expect(smartRecoverySource).toContain("topicSlug: 'context-clues'")
    expect(legacySource).toContain("'context-clues-fixed-practice'")
    expect(legacySource).toContain("'context-clues-topic-quiz'")
    expect(vocabularySource).toContain("slug:'roots-and-base-words'")
    expect(synonymsSource).toContain("slug:'basic-synonyms'")
    expect(JSON.stringify(contextCluesLessonSpecs)).toContain('Vocabulary v1 owns broad word knowledge')
    expect(JSON.stringify(contextCluesLessonSpecs)).toContain('Synonyms and Antonyms v1 owns relationship precision')
    for(const key of ['percentages','fractions','decimals','ratio-proportion','average','number-problems','age-problems','work-rate','distance-speed-time','simple-interest','vocabulary-and-word-meaning','synonyms-and-antonyms','context-clues'])expect(registrySource).toContain(key)
  })
})
