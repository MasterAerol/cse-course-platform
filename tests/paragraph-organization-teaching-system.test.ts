import { describe, expect, it } from 'vitest'
import { paragraphOrganizationLessonSpecs } from '../scripts/lib/paragraph-organization-teaching-system-content.mjs'
import legacySource from '../scripts/paragraph-organization-topic-content.mjs?raw'
import generatorSource from '../src/worker/generators/paragraph-organization/paragraph-organization-generators.ts?raw'
import assessmentSource from '../src/worker/domain/subject-assessment-blueprint.ts?raw'
import recoverySource from '../src/worker/domain/smart-recovery-fixed-question-manifest.ts?raw'
import mockSource from '../src/worker/domain/mock-exam-blueprint.ts?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import lessonPageSource from '../src/react-app/pages/LessonPage.tsx?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson=(slug:string)=>JSON.stringify(paragraphOrganizationLessonSpecs.find((item)=>item.slug===slug)?.blocks)

describe('Paragraph Organization Teaching System v1',()=>{
  it('preserves the authoritative ninth Verbal topic, lesson order, activity types, and durations',()=>{
    expect(legacySource).toContain("topicSlug = 'paragraph-organization'")
    expect(paragraphOrganizationLessonSpecs.map(({slug,lessonType,estimatedMinutes})=>[slug,lessonType,estimatedMinutes])).toEqual([
      ['understanding-paragraph-organization','reading',17],['identifying-topic-sentence','practice',17],['supporting-details','practice',17],['chronological-order','practice',18],['cause-effect-order','practice',18],['comparison-contrast-order','practice',18],['general-specific-order','practice',19],['transition-words-sentence-links','practice',18],['best-opening-closing-sentence','practice',18],['mixed-paragraph-organization-problems','practice',20],['mixed-paragraph-organization-practice','practice',20],['paragraph-organization-topic-quiz','quiz',25],
    ])
  })
  it('uses valid deterministic canonical blocks with no guided-teaching duplication',()=>{
    expect(paragraphOrganizationLessonSpecs).toHaveLength(12)
    for(const item of paragraphOrganizationLessonSpecs){expect(item.blocks.length).toBeGreaterThanOrEqual(10);expect(item.blocks[0]).toMatchObject({blockType:'heading',content:{level:1,text:item.title}});expect(item.blocks.at(-1)?.blockType).toBe('summary');expect(item.blocks.some((block)=>block.blockType==='illustrated-guided-teaching')).toBe(false);for(const block of item.blocks)expect(()=>validateLessonBlockContent(block.blockType,block.content)).not.toThrow()}
  })
  it('teaches main idea, topic sentence, relevant support, chronology, and cause-effect from evidence',()=>{
    for(const value of ['main idea','explicit links','supported closing'])expect(lesson('understanding-paragraph-organization')).toContain(value)
    for(const value of ['covers every detail','Umbrella test','digital library services'])expect(lesson('identifying-topic-sentence')).toContain(value)
    for(const value of ['how or why','irrelevant support','training'])expect(lesson('supporting-details')).toContain(value)
    for(const value of ['prerequisite','Complete → verify → pay → receive','Before beats'])expect(lesson('chronological-order')).toContain(value)
    for(const value of ['cause → immediate effect','therefore','Rain → flood'])expect(lesson('cause-effect-order')).toContain(value)
  })
  it('teaches comparison, hierarchy, references, openings, closings, and a reusable CSE method',()=>{
    for(const value of ['point-by-point','matched points','Same point'])expect(lesson('comparison-contrast-order')).toContain(value)
    for(const value of ['general-to-specific','specific-to-general','supported generalization'])expect(lesson('general-specific-order')).toContain(value)
    for(const value of ['antecedent','Name before reference','However'])expect(lesson('transition-words-sentence-links')).toContain(value)
    for(const value of ['opening = independent context','closing = backward-supported','Open forward'])expect(lesson('best-opening-closing-sentence')).toContain(value)
    expect(lesson('mixed-paragraph-organization-problems')).toContain('Topic → Links → Chain → Test → Eliminate → Reread')
  })
  it('provides specific mistakes, why-based memory, summaries, and unchanged authoritative practice CTAs',()=>{
    const blocks=paragraphOrganizationLessonSpecs.flatMap((item)=>item.blocks)
    expect(blocks.filter((block)=>String(block.content.title??'').startsWith('Common mistake'))).toHaveLength(12)
    for(const block of blocks.filter((item)=>String(item.content.title??'').startsWith('Memory trick')))expect(String(block.content.text)).toContain('because')
    for(const item of paragraphOrganizationLessonSpecs.filter((entry)=>entry.lessonType!=='reading'))expect(JSON.stringify(item.blocks)).toContain('existing route, generator or fixed questions, scoring, explanations, and curriculum lock remain unchanged')
  })
  it('uses accessible text-first VisualTeachingBoard data with explanations beyond color',()=>{const visuals=paragraphOrganizationLessonSpecs.flatMap((item)=>item.blocks).flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual]);expect(visuals.length).toBeGreaterThanOrEqual(20);for(const visual of visuals){expect(visual.ariaLabel.length).toBeGreaterThan(40);expect(visual.transitions).toHaveLength(visual.stages.length-1);expect(visual.transitions.every((item)=>item.whatChanged&&item.why&&item.source)).toBe(true);expect(visual.memoryTip.reason.length).toBeGreaterThan(20)}})
  it('preserves generators, recovery, assessments, Full Mock, previous systems, and lesson scrolling',()=>{for(const slug of ['topic-sentence-identification','supporting-detail-order','chronological-paragraph-order','cause-effect-paragraph-order','comparison-contrast-order','general-specific-order','transition-link-order','opening-closing-sentence','mixed-paragraph-organization']){expect(legacySource).toContain("'"+slug+"'");expect(generatorSource).toContain("'"+slug+"'");expect(assessmentSource).toContain("'"+slug+"'")};expect(recoverySource).toContain("topicSlug: 'paragraph-organization'");expect(mockSource).toContain('verbalAbilityBlueprintV1');for(const topic of ['vocabulary-and-word-meaning','synonyms-and-antonyms','context-clues','sentence-completion','grammar-and-correct-usage','subject-verb-agreement','pronouns-and-modifiers','sentence-structure-and-error-identification'])expect(registrySource).toContain(topic);expect(lessonPageSource).toContain('lesson-app-shell')})
})
