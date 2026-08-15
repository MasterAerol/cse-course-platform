import { describe, expect, it } from 'vitest'

import { fractionsLessonSpecs } from '../scripts/lib/fractions-teaching-system-content.mjs'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

const lesson = (slug: string) => {
  const value = fractionsLessonSpecs.find((item) => item.slug === slug)
  if (value === undefined) throw new Error(`Missing Fractions lesson ${slug}.`)
  return value
}
const textFor = (slug: string) => JSON.stringify(lesson(slug).blocks)

describe('Fractions Teaching System v1', () => {
  it('defines the exact twelve-lesson curriculum with preserved types, order, and durations', () => {
    expect(fractionsLessonSpecs.map(({ slug, lessonType, estimatedMinutes }) => ({ slug, lessonType, estimatedMinutes }))).toEqual([
      { slug: 'introduction-to-fractions', lessonType: 'reading', estimatedMinutes: 8 },
      { slug: 'parts-of-a-fraction', lessonType: 'reading', estimatedMinutes: 8 },
      { slug: 'proper-improper-and-mixed-fractions', lessonType: 'reading', estimatedMinutes: 10 },
      { slug: 'equivalent-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'simplifying-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'comparing-and-ordering-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'adding-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'subtracting-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'multiplying-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'dividing-fractions', lessonType: 'practice', estimatedMinutes: 10 },
      { slug: 'mixed-fraction-applications', lessonType: 'practice', estimatedMinutes: 12 },
      { slug: 'fractions-topic-quiz', lessonType: 'quiz', estimatedMinutes: 15 },
    ])
  })

  it('uses valid structured blocks, semantic headings, final summaries, and no guided-teaching pilot', () => {
    for (const item of fractionsLessonSpecs) {
      expect(item.blocks[0]).toMatchObject({ blockType: 'heading', content: { level: 1, text: item.title } })
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block) => block.blockType === 'illustrated-guided-teaching')).toBe(false)
      for (const block of item.blocks) expect(() => validateLessonBlockContent(block.blockType, block.content)).not.toThrow()
    }
  })

  it('teaches numerator, denominator, fraction bar, equal parts, and a text alternative to the visual', () => {
    const content = textFor('parts-of-a-fraction')
    expect(content).toContain('numerator')
    expect(content).toContain('denominator')
    expect(content).toContain('fraction bar')
    expect(content).toContain('five equal')
    expect(content).toContain('three')
    expect(content).toContain('whatChanged')
  })

  it('derives mixed/improper conversion before giving the shortcut', () => {
    const content = textFor('proper-improper-and-mixed-fractions')
    expect(content).toContain('5/5 + 2/5')
    expect(content).toContain('Five fifths make one whole')
    expect(content).toContain('1×5+2=7')
    expect(content).toContain('7/5 = 1 2/5')
  })

  it('explains equivalent fractions and simplification as value-preserving transformations', () => {
    const equivalent = textFor('equivalent-fractions')
    expect(equivalent).toContain('(1×2)/(2×2)')
    expect(equivalent).toContain('same nonzero')
    expect(equivalent).toContain('1/2 = 2/4')
    const simplify = textFor('simplifying-fractions')
    expect(simplify).toContain('12÷6=2')
    expect(simplify).toContain('18÷6=3')
    expect(simplify).toContain('12/18 = 2/3')
  })

  it('teaches all three comparison strategies and orders several fractions using common pieces', () => {
    const content = textFor('comparing-and-ordering-fractions')
    expect(content).toContain('same denominator')
    expect(content).toContain('same numerator')
    expect(content).toContain('LCM(2,3,4)=12')
    expect(content).toContain('1/2=6/12')
    expect(content).toContain('1/2 < 2/3 < 3/4')
    expect(content).toContain('cross products')
  })

  it('keeps like-denominator piece size and fully derives unlike-denominator addition', () => {
    const content = textFor('adding-fractions')
    expect(content).toContain('2/7 + 3/7 = 5/7')
    expect(content).toContain('not 5/14')
    expect(content).toContain('LCM(3,5)=15')
    expect(content).toContain('(1×5)/(3×5)=5/15')
    expect(content).toContain('(3×3)/(5×3)=9/15')
    expect(content).toContain('14/15')
  })

  it('fully derives unlike-denominator subtraction and preserves subtraction order', () => {
    const content = textFor('subtracting-fractions')
    expect(content).toContain('LCM(6,4)=12')
    expect(content).toContain('5/6 became 10/12')
    expect(content).toContain('1/4 became 3/12')
    expect(content).toContain('7/12')
    expect(content).toContain('original order')
  })

  it('explains multiplication conceptually before optional cancellation', () => {
    const content = textFor('multiplying-fractions')
    expect(content).toContain('2/3 of 4/5')
    expect(content).toContain('2×4=8')
    expect(content).toContain('3×5=15')
    expect(content).toContain('8/15')
    expect(content).toContain('Optional cross-cancellation')
  })

  it('explains reciprocal division, flips only the divisor, and simplifies correctly', () => {
    const content = textFor('dividing-fractions')
    expect(content).toContain('How many groups')
    expect(content).toContain('4/5 → 5/4')
    expect(content).toContain('2/3 × 5/4')
    expect(content).toContain('10/12')
    expect(content).toContain('5/6')
    expect(content).toContain('Keep, Change, Flip')
    expect(content).toContain('flip the second')
  })

  it('uses correct CSE-style applications with whole, fraction, part, and units', () => {
    const content = textFor('mixed-fraction-applications')
    expect(content).toContain('Whole=200 applicants')
    expect(content).toContain('200 ÷ 5 = 40')
    expect(content).toContain('40 × 3 = 120')
    expect(content).toContain('120 applicants')
    expect(content).toContain('8/8−5/8=3/8')
    expect(content).toContain('₱600')
  })

  it('uses visuals selectively and supplies reusable reasons, memory rules, and concise mistakes', () => {
    const blocks = fractionsLessonSpecs.flatMap((item) => item.blocks)
    const visuals = blocks.filter((block) => block.blockType === 'example' && block.content.visual !== undefined)
    expect(visuals).toHaveLength(9)
    for (const block of visuals) {
      const visual = block.content.visual as { transitions: Array<{ whatChanged: string; why: string; source: string }>; memoryTip: { rule: string; reason: string } }
      expect(visual.transitions.every((item) => item.whatChanged.length > 0 && item.why.length > 0 && item.source.length > 0)).toBe(true)
      expect(visual.memoryTip.rule.length).toBeGreaterThan(10)
      expect(visual.memoryTip.reason.length).toBeGreaterThan(20)
    }
    expect(blocks.filter((block) => block.blockType === 'callout' && String(block.content.title).includes('Common mistake'))).toHaveLength(11)
  })
})
