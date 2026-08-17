import { describe, expect, it } from 'vitest'
import { numberProblemsLessonSpecs } from '../scripts/lib/number-problems-teaching-system-content.mjs'
import legacySource from '../scripts/create-and-publish-number-problems-topic.mjs?raw'
import averageSource from '../scripts/lib/average-teaching-system-content.mjs?raw'
import ratioSource from '../scripts/lib/ratio-proportion-teaching-system-content.mjs?raw'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'


const lesson = (slug: string) => JSON.stringify(numberProblemsLessonSpecs.find((item) => item.slug === slug)?.blocks)
const all = () => JSON.stringify(numberProblemsLessonSpecs)

describe('Number Problems Teaching System v1', () => {
  it('preserves all authoritative activities, types, order, and durations', () => {
    expect(numberProblemsLessonSpecs.map(({ slug, lessonType, estimatedMinutes }) => [slug, lessonType, estimatedMinutes])).toEqual([
      ['translating-number-statements','reading',11],['consecutive-integers','practice',11],['consecutive-odd-and-even-integers','practice',12],['sum-and-difference-of-numbers','practice',12],['product-and-quotient-relationships','practice',12],['two-digit-number-problems','practice',13],['reversed-digit-problems','practice',13],['number-and-remainder-problems','practice',13],['fractional-parts-of-numbers','practice',12],['mixed-number-relationship-problems','practice',14],['mixed-number-problems-practice','practice',15],['number-problems-topic-quiz','quiz',18],
    ])
  })
  it('uses valid deterministic blocks and no illustrated guided teaching', () => {
    for (const item of numberProblemsLessonSpecs) {
      expect(item.blocks[0]).toMatchObject({ blockType: 'heading', content: { level: 1, text: item.title } })
      expect(item.blocks.at(-1)?.blockType).toBe('summary')
      expect(item.blocks.some((block) => block.blockType === 'illustrated-guided-teaching')).toBe(false)
      for (const block of item.blocks) expect(() => validateLessonBlockContent(block.blockType, block.content)).not.toThrow()
    }
  })
  it('teaches word-to-equation translation and subtraction order before solving', () => {
    const text = lesson('translating-number-statements')
    expect(text).toContain('Let x = the number.')
    expect(text).toContain('x+7=20')
    expect(text).toContain('13+7=20')
    expect(text).toContain('7 less than 2x means 2x−7')
    expect(text).toContain('x subtracted from 7 means 7−x')
    expect(text).toContain('Name → Translate → Equation → Solve → Check')
  })
  it('covers consecutive ordinary, even, and odd integers with correct spacing and verification', () => {
    expect(lesson('consecutive-integers')).toContain('14+15+16=45')
    const parity = lesson('consecutive-odd-and-even-integers')
    expect(parity).toContain('16+18+20=54')
    expect(parity).toContain('19+21+23=63')
    expect(parity).toContain('x,x+2,x+4')
  })
  it('teaches sums, differences, multiples, fractions, digits, reversals, and checks correctly', () => {
    expect(lesson('sum-and-difference-of-numbers')).toContain('18+32=50 and 32−18=14')
    expect(lesson('product-and-quotient-relationships')).toContain('36=3(12) and 12+36=48')
    expect(lesson('fractional-parts-of-numbers')).toContain('20+10=30')
    expect(lesson('two-digit-number-problems')).toContain('10t+u')
    expect(lesson('reversed-digit-problems')).toContain('10u+t')
    expect(lesson('reversed-digit-problems')).toContain('63−36=27')
  })
  it('includes reasoned memory tricks, common mistakes, summaries, and authoritative practice CTAs', () => {
    const blocks = numberProblemsLessonSpecs.flatMap((item) => item.blocks)
    expect(blocks.filter((block) => block.content.title === 'Common mistake')).toHaveLength(11)
    expect(all()).toContain('because')
    for (const item of numberProblemsLessonSpecs.filter((entry) => entry.lessonType === 'practice')) {
      expect(JSON.stringify(item.blocks)).toContain('Practice CTA')
    }
  })
  it('uses eight accessible VisualTeachingBoard payloads', () => {
    const visuals = numberProblemsLessonSpecs.flatMap((item) => item.blocks).flatMap((block) => block.content.visual === undefined ? [] : [block.content.visual])
    expect(visuals).toHaveLength(8)
    for (const visual of visuals) {
      expect(visual.transitions).toHaveLength(visual.stages.length - 1)
      expect(visual.transitions.every((transition) => transition.whatChanged && transition.why && transition.source)).toBe(true)
      expect(visual.memoryTip.reason.length).toBeGreaterThan(20)
    }
  })
  it('leaves all nine generators, fixed practice, quiz, and unrelated teaching manifests unchanged', () => {
    for (const slug of ['consecutive-integers','consecutive-odd-even-integers','sum-difference-numbers','product-quotient-numbers','two-digit-number-problems','reversed-digit-problems','remainder-number-problems','fractional-part-number-problems','mixed-number-relationships']) expect(legacySource).toContain(`'${slug}'`)
    expect(legacySource).toContain('const mixedQuestions = [')
    expect(legacySource).toContain('validateFixedQuestions(\'Mixed Number Problems Practice\', practice.questions, 8)')
    expect(legacySource).toContain('const quizQuestions = [')
    expect(legacySource).toContain('validateFixedQuestions(\'Number Problems Topic Quiz\', quiz.questions, 15)')
    expect(averageSource).toContain("slug:'understanding-average'")
    expect(ratioSource).toContain("slug:'introduction-to-ratios'")
  })
})