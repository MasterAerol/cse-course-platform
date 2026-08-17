import { describe, expect, it } from 'vitest'

import { ratioProportionLessonSpecs } from '../scripts/lib/ratio-proportion-teaching-system-content.mjs'
import ratioPublisherSource from '../scripts/create-and-publish-ratio-proportion-topic.mjs?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../src/shared/visual-teaching.schema'

const lesson = (slug: string) => JSON.stringify(ratioProportionLessonSpecs.find((item) => item.slug === slug)?.blocks)

describe('Ratio and Proportion Teaching System v1', () => {
  it('preserves the twelve authoritative activities, types, order, and durations', () => {
    expect(ratioProportionLessonSpecs.map(({ slug, lessonType, estimatedMinutes }) => [slug, lessonType, estimatedMinutes])).toEqual([
      ['introduction-to-ratios','reading',9],['writing-and-simplifying-ratios','practice',11],['equivalent-ratios','practice',10],['comparing-ratios','practice',11],['introduction-to-proportions','reading',9],['solving-proportions','practice',11],['direct-proportion','practice',12],['inverse-proportion','practice',12],['sharing-an-amount-in-a-ratio','practice',12],['ratio-and-proportion-word-problems','practice',13],['mixed-ratio-and-proportion-applications','practice',14],['ratio-and-proportion-topic-quiz','quiz',18],
    ])
  })
  it('uses valid deterministic blocks, semantic headings, summaries, and no guided pilot', () => {
    for (const item of ratioProportionLessonSpecs) {
      expect(item.blocks[0]).toMatchObject({ blockType:'heading', content:{ level:1, text:item.title } })
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block) => block.blockType === 'illustrated-guided-teaching')).toBe(false)
      for (const block of item.blocks) expect(() => validateLessonBlockContent(block.blockType, block.content)).not.toThrow()
    }
  })
  it('teaches ratio meaning, order, part-to-part, part-to-whole, and compatible-unit simplification', () => {
    expect(lesson('introduction-to-ratios')).toContain('A:B=2:3')
    expect(lesson('introduction-to-ratios')).toContain('A:total=2:5')
    expect(lesson('introduction-to-ratios')).toContain('12:30=2:5')
    expect(lesson('writing-and-simplifying-ratios')).toContain('2 m to 200 cm')
    expect(lesson('writing-and-simplifying-ratios')).toContain('12÷6=2')
  })
  it('derives equivalent ratios, comparison, cross multiplication, and missing terms', () => {
    expect(lesson('equivalent-ratios')).toContain('2:3=4:6=6:9')
    expect(lesson('comparing-ratios')).toContain('2×5=10')
    expect(lesson('introduction-to-proportions')).toContain('bd(a/b) = bd(c/d)')
    expect(lesson('introduction-to-proportions')).toContain('ad=bc')
    expect(lesson('solving-proportions')).toContain('120=8x')
    expect(lesson('solving-proportions')).toContain('x=15')
  })
  it('teaches direct/inverse invariants, unit rate, two- and three-part sharing, and applications correctly', () => {
    expect(lesson('direct-proportion')).toContain('₱90÷3=₱30')
    expect(lesson('direct-proportion')).toContain('y=5x')
    expect(lesson('inverse-proportion')).toContain('24 worker-days')
    expect(lesson('sharing-an-amount-in-a-ratio')).toContain('₱400 + ₱600 = ₱1,000')
    expect(lesson('sharing-an-amount-in-a-ratio')).toContain('₱480, ₱720, and ₱1,200')
    expect(lesson('ratio-and-proportion-word-problems')).toContain('36 temporary employees')
    expect(lesson('ratio-and-proportion-word-problems')).toContain('20 km')
  })
  it('uses eight accessible visuals with explained transitions and reasoned memory rules', () => {
    const blocks=ratioProportionLessonSpecs.flatMap((item)=>item.blocks)
    const visuals=blocks.flatMap((block)=>block.content.visual===undefined?[]:[block.content.visual]) as VisualTeaching[]
    expect(visuals).toHaveLength(8)
    for(const visual of visuals){expect(visual.transitions).toHaveLength(visual.stages.length-1);expect(visual.transitions.every((item)=>item.whatChanged&&item.why&&item.source)).toBe(true);expect(visual.memoryTip.reason.length).toBeGreaterThan(20)}
    expect(blocks.filter((block)=>block.content.title==='Common mistake')).toHaveLength(11)
  })
  it('keeps the eight generator mappings, fixed practice, and quiz academic configuration unchanged', () => {
    const source=ratioPublisherSource
    for(const slug of ['simplifying-ratios','equivalent-ratios','comparing-ratios','solving-proportions','direct-proportion','inverse-proportion','ratio-sharing','ratio-word-problems']) expect(source).toContain(`'${slug}'`)
    expect(source).toContain('const mixedQuestions = [')
    expect(source).toContain('const quizQuestions = [')
    expect(source).toContain('passingScore: 70')
    expect(source).toContain('A fixed 15-question quiz')
  })
})
