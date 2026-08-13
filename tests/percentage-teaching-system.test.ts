import { describe, expect, it } from 'vitest'

import {
  percentageLessonBySlug,
  percentageLessonSpecs,
} from '../scripts/lib/percentage-teaching-system-content.mjs'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'

function textFor(slug: string): string {
  const lesson = percentageLessonBySlug.get(slug)
  if (lesson === undefined) throw new Error(`Missing lesson ${slug}`)
  return JSON.stringify(lesson.blocks)
}

describe('Percentage Teaching System v1 content', () => {
  it('defines the eleven authoritative lessons in curriculum order', () => {
    expect(percentageLessonSpecs.map((lesson) => lesson.slug)).toEqual([
      'introduction-to-percentages',
      'understanding-percentages',
      'fractions-decimals-and-percentages',
      'finding-the-percentage',
      'finding-the-base',
      'finding-the-rate',
      'percentage-increase-and-decrease',
      'discounts-and-markups',
      'worked-examples',
      'guided-practice',
      'percentages-topic-quiz',
    ])
    expect(percentageLessonSpecs).toHaveLength(11)
  })

  it('uses only valid structured lesson blocks with consecutive positions supplied by the publisher', () => {
    for (const lesson of percentageLessonSpecs) {
      expect(lesson.blocks.length).toBeGreaterThanOrEqual(4)
      expect(lesson.blocks.at(-1)?.blockType).toBe('summary')
      expect(lesson.blocks.some((block) => block.blockType === 'illustrated-guided-teaching')).toBe(false)
      for (const block of lesson.blocks) {
        expect(() => validateLessonBlockContent(block.blockType, block.content)).not.toThrow()
      }
    }
  })

  it('keeps each lesson layered with its expected teaching sections', () => {
    const expectedTypes = new Map<string, string[]>([
      ['introduction-to-percentages', ['heading', 'paragraph', 'callout', 'image', 'example', 'callout', 'callout', 'summary']],
      ['understanding-percentages', ['heading', 'paragraph', 'formula', 'heading', 'summary', 'example', 'callout', 'callout', 'summary']],
      ['fractions-decimals-and-percentages', ['heading', 'paragraph', 'example', 'example', 'example', 'example', 'callout', 'summary']],
      ['finding-the-percentage', ['heading', 'paragraph', 'formula', 'callout', 'example', 'callout', 'summary']],
      ['finding-the-base', ['heading', 'paragraph', 'formula', 'example', 'callout', 'summary']],
      ['finding-the-rate', ['heading', 'paragraph', 'formula', 'example', 'callout', 'summary']],
      ['percentage-increase-and-decrease', ['heading', 'paragraph', 'formula', 'example', 'example', 'callout', 'summary']],
      ['discounts-and-markups', ['heading', 'paragraph', 'formula', 'example', 'formula', 'example', 'callout', 'summary']],
      ['worked-examples', ['heading', 'paragraph', 'example', 'example', 'example', 'example', 'example', 'example', 'example', 'callout', 'summary']],
      ['guided-practice', ['heading', 'paragraph', 'example', 'example', 'example', 'example', 'callout', 'summary']],
      ['percentages-topic-quiz', ['heading', 'paragraph', 'callout', 'summary']],
    ])
    for (const lesson of percentageLessonSpecs) {
      expect(lesson.blocks.map((block) => block.blockType)).toEqual(expectedTypes.get(lesson.slug))
    }
  })
  it('explains both conversion directions and why decimal movement works', () => {
    const content = textFor('fractions-decimals-and-percentages')
    expect(content).toContain('20. → 2.0 → 0.20')
    expect(content).toContain('0.25 → 2.5 → 25')
    expect(content).toContain('percent means divide by 100')
    expect(content).toContain('multiply the decimal by 100')
    expect(content).toContain('1 ÷ 4 = 0.25')
    expect(content).toContain('25/100 = 1/4')
  })

  it('teaches part, base, and rate with labeled values, inverse reasoning, and checks', () => {
    const part = textFor('finding-the-percentage')
    expect(part).toContain('0.20 × 80 = 16')
    expect(part).toContain('“of” means multiply')
    expect(part).toContain('decimal-movement')
    expect(part).not.toContain('illustrated-guided-teaching')

    const base = textFor('finding-the-base')
    expect(base).toContain('Whole × 0.25 = 20')
    expect(base).toContain('20 ÷ 0.25')
    expect(base).toContain('Division is the inverse of multiplication')

    const rate = textFor('finding-the-rate')
    expect(rate).toContain('Part = 20')
    expect(rate).toContain('Whole = 80')
    expect(rate).toContain('20 ÷ 80')
    expect(rate).toContain('25%')
  })

  it('uses the original base for change and distinguishes adjustment amounts from final prices', () => {
    const change = textFor('percentage-increase-and-decrease')
    expect(change).toContain('₱920 − ₱800 = ₱120')
    expect(change).toContain('120 ÷ 800')
    expect(change).toContain('original 500')
    expect(change).toContain('Do not divide by the new value')

    const prices = textFor('discounts-and-markups')
    expect(prices).toContain('₱1,500')
    expect(prices).toContain('₱300')
    expect(prices).toContain('₱1,200')
    expect(prices).toContain('₱200')
    expect(prices).toContain('₱1,000')
  })

  it('provides balanced worked examples and lightweight scaffolded practice', () => {
    const worked = percentageLessonBySlug.get('worked-examples')
    const titles = worked?.blocks
      .filter((block) => block.blockType === 'example')
      .map((block) => block.content.title)
    expect(titles).toEqual([
      'Finding a part',
      'Finding a whole',
      'Finding a rate',
      'Percentage increase',
      'Percentage decrease',
      'Sale price',
      'Selling price after markup',
    ])
    const guided = textFor('guided-practice')
    expect(guided).toContain('Hint:')
    expect(guided).toContain('35. → 3.5 → 0.35')
  })

  it('includes concise summaries, justified memory rules, and common-mistake warnings', () => {
    for (const slug of [
      'understanding-percentages',
      'fractions-decimals-and-percentages',
      'finding-the-percentage',
      'finding-the-base',
      'finding-the-rate',
      'percentage-increase-and-decrease',
      'discounts-and-markups',
    ]) {
      const lesson = percentageLessonBySlug.get(slug)
      expect(lesson?.blocks.some((block) => block.blockType === 'summary')).toBe(true)
      expect(lesson?.blocks.some((block) => block.blockType === 'callout' && (block.content.title ?? '').includes('Common mistake'))).toBe(true)
    }
    const allContent = JSON.stringify(percentageLessonSpecs)
    expect(allContent).toContain('because')
    expect(allContent).not.toMatch(/25% = 25\/100 = 0\.25/u)
  })

  it('preserves the existing lesson activity types and durations', () => {
    expect(percentageLessonSpecs.map(({ lessonType, estimatedMinutes }) => ({ lessonType, estimatedMinutes }))).toEqual([
      { lessonType: 'reading', estimatedMinutes: 8 },
      { lessonType: 'reading', estimatedMinutes: 10 },
      { lessonType: 'reading', estimatedMinutes: 12 },
      { lessonType: 'practice', estimatedMinutes: 12 },
      { lessonType: 'practice', estimatedMinutes: 12 },
      { lessonType: 'practice', estimatedMinutes: 12 },
      { lessonType: 'reading', estimatedMinutes: 14 },
      { lessonType: 'reading', estimatedMinutes: 12 },
      { lessonType: 'practice', estimatedMinutes: 15 },
      { lessonType: 'practice', estimatedMinutes: 15 },
      { lessonType: 'quiz', estimatedMinutes: 10 },
    ])
  })
})
