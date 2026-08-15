import { describe, expect, it } from 'vitest'

import { decimalsLessonSpecs } from '../scripts/lib/decimals-teaching-system-content.mjs'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../src/shared/visual-teaching.schema'

const expected = [
  ['introduction-to-decimals', 'reading', 8],
  ['decimal-place-value', 'reading', 9],
  ['reading-and-writing-decimals', 'reading', 9],
  ['comparing-and-ordering-decimals', 'practice', 10],
  ['rounding-decimals', 'practice', 10],
  ['adding-decimals', 'practice', 10],
  ['subtracting-decimals', 'practice', 10],
  ['multiplying-decimals', 'practice', 11],
  ['dividing-decimals', 'practice', 11],
  ['fractions-decimals-and-percentages-decimals', 'practice', 12],
  ['decimal-applications', 'practice', 12],
  ['decimals-topic-quiz', 'quiz', 15],
] as const

const lesson = (slug: string) => {
  const item = decimalsLessonSpecs.find((value) => value.slug === slug)
  if (item === undefined) throw new Error(`Missing Decimals lesson ${slug}.`)
  return JSON.stringify(item.blocks)
}

describe('Decimals Teaching System v1', () => {
  it('preserves all twelve authoritative activities, types, order, and durations', () => {
    expect(decimalsLessonSpecs.map((item) => [item.slug, item.lessonType, item.estimatedMinutes])).toEqual(expected)
  })

  it('uses valid deterministic structured blocks with semantic headings and summaries', () => {
    for (const item of decimalsLessonSpecs) {
      expect(item.blocks[0]).toMatchObject({ blockType: 'heading', content: { level: 1, text: item.title } })
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block) => block.blockType === 'illustrated-guided-teaching')).toBe(false)
      for (const block of item.blocks) expect(() => validateLessonBlockContent(block.blockType, block.content)).not.toThrow()
    }
  })

  it('teaches decimal meaning, place value, placeholders, reading, and trailing-zero equivalence', () => {
    expect(lesson('introduction-to-decimals')).toContain('1 whole = 10 tenths = 100 hundredths')
    const place = lesson('decimal-place-value')
    expect(place).toContain('3 + 0.4 + 0.07 + 0.002')
    expect(place).toContain('4.05')
    expect(place).toContain('4.5')
    const reading = lesson('reading-and-writing-decimals')
    expect(reading).toContain('12.408')
    expect(reading).toContain('6.23')
    expect(reading).toContain('0.5 = 0.50 = 0.500')
    expect(reading).toContain('0.06')
  })

  it('aligns and orders decimals by place value rather than digit count', () => {
    const content = lesson('comparing-and-ordering-decimals')
    expect(content).toContain('0.60')
    expect(content).toContain('0.6 > 0.58')
    expect(content).toContain('0.65 < 0.68 < 0.70 < 0.705')
    expect(content).toContain('first unequal place')
  })

  it('rounds from the requested place and explains closeness', () => {
    const content = lesson('rounding-decimals')
    expect(content).toContain('4.376')
    expect(content).toContain('7 → 8')
    expect(content).toContain('nearby rounded value')
    expect(content).toContain('4.38')
  })

  it('fully derives aligned addition and regrouped subtraction', () => {
    const addition = lesson('adding-decimals')
    expect(addition).toContain('12.5=12.50')
    expect(addition).toContain('16.25')
    expect(addition).toContain('ones meet ones')
    const subtraction = lesson('subtracting-decimals')
    expect(subtraction).toContain('15.20')
    expect(subtraction).toContain('ten hundredths')
    expect(subtraction).toContain('ten tenths')
    expect(subtraction).toContain('7.35')
  })

  it('derives multiplication placement with fractions, powers of ten, and estimation', () => {
    const content = lesson('multiplying-decimals')
    expect(content).toContain('24/10×3/10=72/100')
    expect(content).toContain('0.72')
    expect(content).toContain('4.27×100=427')
    expect(content).toContain('product must be smaller than 2.4')
  })

  it('scales both division values, explains the invariant, and covers one- and two-place cases', () => {
    const content = lesson('dividing-decimals')
    expect(content).toContain('4.8 × 10')
    expect(content).toContain('48 ÷ 6')
    expect(content).toContain('7.5 ÷ 3')
    expect(content).toContain('1.44 ÷ 0.12')
    expect(content).toContain('Multiply both numbers')
  })

  it('converts through named denominators and per-hundred meaning', () => {
    const content = lesson('fractions-decimals-and-percentages-decimals')
    expect(content).toContain('0.25 = 1/4 = 25%')
    expect(content).toContain('3/4=75/100=0.75')
    expect(content).toContain('35. → 3.5 → 0.35')
    expect(content).toContain('Percent means per hundred')
  })

  it('uses correct money and measurement applications with units and estimates', () => {
    const content = lesson('decimal-applications')
    expect(content).toContain('₱35.75×2=₱71.50')
    expect(content).toContain('₱90.00')
    expect(content).toContain('12.50−3.75=8.75')
    expect(content).toContain('8.75 L')
  })

  it('uses exactly nine selective accessible visuals with explanations and reasoned memory rules', () => {
    const blocks = decimalsLessonSpecs.flatMap((item) => item.blocks)
    const visuals = blocks.flatMap((block) => block.content.visual === undefined ? [] : [block.content.visual]) as VisualTeaching[]
    expect(visuals).toHaveLength(9)
    for (const visual of visuals) {
      expect(visual.ariaLabel.length).toBeGreaterThan(20)
      expect(visual.transitions).toHaveLength(visual.stages.length - 1)
      expect(visual.transitions.every((item) => item.whatChanged && item.why && item.source)).toBe(true)
      expect(visual.memoryTip.reason.length).toBeGreaterThan(20)
    }
    expect(blocks.filter((block) => block.blockType === 'callout' && block.content.title === 'Common mistake')).toHaveLength(11)
  })
})
