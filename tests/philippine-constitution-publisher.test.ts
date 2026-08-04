import { describe, expect, it } from 'vitest'
import { blocksFor, constitutionSource, examCoverageSource, fixedQuestion, generatedByLesson, lessonSpecs, mixedQuestions, quizQuestions, requiredSubjectPosition, subjectSlug, topicSlug, validateQuestions } from '../scripts/philippine-constitution-topic-content.mjs'
import { getGenerator } from '../src/worker/generators/generator.registry'

const prohibited = /\b(current officeholder|incumbent|election candidate|pending political dispute)\b/iu

describe('Philippine Constitution curriculum and publisher contract', () => {
  it('positions one reusable subject immediately after Verbal Ability', () => {
    expect(subjectSlug).toBe('general-information'); expect(topicSlug).toBe('philippine-constitution-fundamentals'); expect(requiredSubjectPosition(3)).toBe(4)
  })
  it('declares exactly twelve sequential lessons and nine generated practices', () => {
    expect(lessonSpecs).toHaveLength(12); expect(lessonSpecs.map(x=>x.position)).toEqual(Array.from({length:12},(_,i)=>i+1)); expect(Object.keys(generatedByLesson)).toHaveLength(9)
    expect(lessonSpecs[0]?.lessonType).toBe('reading'); expect(lessonSpecs.slice(1,11).every(x=>x.lessonType==='practice')).toBe(true); expect(lessonSpecs[11]?.lessonType).toBe('quiz')
  })
  it('provides meaningful source-bearing lesson blocks without raw HTML', () => {
    for(const spec of lessonSpecs){const blocks=blocksFor(spec.slug); expect(blocks.length).toBeGreaterThanOrEqual(9); expect(JSON.stringify(blocks)).toContain('Article'); expect(JSON.stringify(blocks)).not.toMatch(/<\/?[a-z][^>]*>/iu)}
    expect(blocksFor(lessonSpecs[0].slug).length).toBeGreaterThanOrEqual(10); expect(blocksFor(lessonSpecs[0].slug).length).toBeLessThanOrEqual(14)
  })
  it('source-locks all 12 practice and 20 quiz questions and scores server payloads unambiguously', () => {
    expect(mixedQuestions).toHaveLength(12); expect(quizQuestions).toHaveLength(20)
    for(const [i,item] of [...mixedQuestions,...quizQuestions].entries()){expect(item.choices).toHaveLength(4); expect(new Set(item.choices.map(x=>x.toLowerCase()))).toHaveLength(4); expect(item.correctIndex).toBe(0); expect(item.explanation).toMatch(/Article/); expect(item.source.url).toBe(constitutionSource.url); expect(item.source.provisionId).toBeTruthy(); expect(item.source.paraphrasedRule).toBeTruthy(); expect(JSON.stringify(item)).not.toMatch(prohibited); const stored=fixedQuestion(item,i+1,i>=12); expect(stored.choices.filter(x=>x.isCorrect)).toHaveLength(1); expect(stored.choices[0]?.isCorrect).toBe(true)}
    expect(validateQuestions('practice',mixedQuestions.map((x,i)=>fixedQuestion(x,i+1)),12)).toEqual([]); expect(validateQuestions('quiz',quizQuestions.map((x,i)=>fixedQuestion(x,i+1,true)),20)).toEqual([])
  })
  it('uses primary legal and official CSC coverage sources', () => {
    expect(constitutionSource.classification).toBe('primary_constitution'); expect(constitutionSource.url).toMatch(/lawphil\.net/); expect(examCoverageSource.classification).toBe('official_exam_coverage'); expect(examCoverageSource.url).toMatch(/csc\.gov\.ph/)
  })
  it('registers all ten version-one generators', () => {
    const wanted=[...Object.values(generatedByLesson),'mixed-philippine-constitution']; for(const slug of wanted) expect(getGenerator(slug as Parameters<typeof getGenerator>[0],1)).not.toBeNull()
  })
})