import { describe, expect, it } from 'vitest'
import { grammarCorrectUsageLessonSpecs } from '../scripts/lib/grammar-correct-usage-teaching-system-content.mjs'
import legacySource from '../scripts/grammar-usage-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/grammar-usage/grammar-usage-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import smartRecoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import fullMockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import vocabularySource from '../scripts/lib/vocabulary-word-meaning-teaching-system-content.mjs?raw'
import synonymsSource from '../scripts/lib/synonyms-antonyms-teaching-system-content.mjs?raw'
import contextSource from '../scripts/lib/context-clues-teaching-system-content.mjs?raw'
import completionSource from '../scripts/lib/sentence-completion-teaching-system-content.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson=(slug:string)=>JSON.stringify(grammarCorrectUsageLessonSpecs.find((item)=>item.slug===slug)?.blocks)

describe('Grammar and Correct Usage Teaching System v1',()=>{
  it('preserves the authoritative fifth Verbal topic, lesson order, types, and durations',()=>{
    expect(legacySource).toContain("topicSlug = 'grammar-and-correct-usage'")
    expect(grammarCorrectUsageLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual([
      ['understanding-standard-english-usage','reading',16],['parts-of-speech-usage','practice',16],['verb-tense-and-consistency','practice',17],['articles-and-determiners','practice',16],['prepositions','practice',16],['conjunctions-and-logical-connections','practice',17],['comparative-and-superlative-forms','practice',17],['commonly-misused-words-and-expressions','practice',18],['correct-usage-in-sentences','practice',18],['mixed-grammar-and-usage-problems','practice',20],['mixed-grammar-and-correct-usage-practice','practice',20],['grammar-and-correct-usage-topic-quiz','quiz',25],
    ])
  })
  it('uses valid deterministic blocks and preserves audited production counts',()=>{
    expect(grammarCorrectUsageLessonSpecs.map((item)=>item.blocks.length)).toEqual([12,10,10,10,10,10,10,10,10,10,10,10])
    for(const item of grammarCorrectUsageLessonSpecs){
      expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}})
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false)
      for(const block of item.blocks) expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow()
    }
  })
  it('teaches standard usage, sentence roles, tense timelines, and determiner decisions',()=>{
    for(const value of ['structurally correct, meaningful, precise','Read → Target → Rule → Eliminate → Verify','complied with the instructions','Grammar and meaning must both work']) expect(lesson('understanding-standard-english-usage')).toContain(value)
    for(const value of ['noun names','adverb modifies','Decision is correct','linking verb']) expect(lesson('parts-of-speech-usage')).toContain(value)
    for(const value of ['yesterday','had arrived','since 2022','timeline']) expect(lesson('verb-tense-and-consistency')).toContain(value)
    for(const value of ['An application','Many applicants','countability','vowel sound']) expect(lesson('articles-and-determiners')).toContain(value)
  })
  it('teaches preposition relationships, conjunction logic, and comparison scope',()=>{
    for(const value of ['comply with','Since 2020','responsible for','standard pair']) expect(lesson('prepositions')).toContain(value)
    for(const value of ['cause → result','Neither','nor','because...so','parallel']) expect(lesson('conjunctions-and-logical-connections')).toContain(value)
    for(const value of ['Better than','most efficient','more better','fewer']) expect(lesson('comparative-and-superlative-forms')).toContain(value)
  })
  it('teaches confused-word distinctions, complete-sentence elimination, and mixed diagnosis',()=>{
    for(const value of ['Affect is correct','Advice is correct','borrow from','role plus meaning']) expect(lesson('commonly-misused-words-and-expressions')).toContain(value)
    for(const value of ['complied to','Although...but','one named check','last Monday']) expect(lesson('correct-usage-in-sentences')).toContain(value)
    for(const value of ['clue → rule family','Classify the rule family','Promptly is correct','strongest explicit clue']) expect(lesson('mixed-grammar-and-usage-problems')).toContain(value)
  })
  it('uses accessible text visuals, reasoned memory tricks, common mistakes, and unchanged practice CTAs',()=>{
    const blocks=grammarCorrectUsageLessonSpecs.flatMap((item)=>item.blocks)
    const visuals=blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual])
    expect(new Set(visuals)).toHaveLength(9)
    expect(visuals.length).toBeGreaterThanOrEqual(13)
    for(const visual of visuals){
      expect(visual.transitions).toHaveLength(visual.stages.length-1)
      expect(visual.transitions.every((transition)=>transition.whatChanged&&transition.why&&transition.source)).toBe(true)
      expect(visual.memoryTip.reason.length).toBeGreaterThan(20)
      expect(visual.ariaLabel.length).toBeGreaterThan(40)
    }
    expect(blocks.filter((block)=>String(block.content.title??'').startsWith('Common mistake'))).toHaveLength(12)
    for(const block of blocks.filter((item)=>String(item.content.title??'').startsWith('Memory trick'))) expect(String(block.content.text)).toMatch(/because/iu)
    for(const item of grammarCorrectUsageLessonSpecs.filter((entry)=>entry.lessonType==='practice')) expect(JSON.stringify(item.blocks)).toContain('Practice CTA')
  })
  it('preserves generators, fixed practice, quiz, recovery, assessments, Full Mock, and completed systems',()=>{
    for(const slug of ['part-of-speech-usage','verb-tense-consistency','article-determiner-usage','preposition-usage','conjunction-usage','comparative-superlative-usage','commonly-misused-expression','correct-sentence-usage','mixed-grammar-usage']){
      expect(legacySource).toContain("'"+slug+"'")
      expect(generatorSource).toContain("'"+slug+"'")
      expect(assessmentSource).toContain("'"+slug+"'")
    }
    expect(smartRecoverySource).toContain("topicSlug: 'grammar-and-correct-usage'")
    expect(fullMockSource).toContain('verbalAbilityBlueprintV1')
    expect(legacySource).toContain("'mixed-grammar-and-correct-usage-practice'")
    expect(legacySource).toContain("'grammar-and-correct-usage-topic-quiz'")
    expect(vocabularySource).toContain("slug:'roots-and-base-words'")
    expect(synonymsSource).toContain("slug:'basic-synonyms'")
    expect(contextSource).toContain("slug:'definition-clues'")
    expect(completionSource).toContain("slug:'understanding-sentence-completion'")
    for(const key of ['vocabulary-and-word-meaning','synonyms-and-antonyms','context-clues','sentence-completion']) expect(registrySource).toContain(key)
  })
})
