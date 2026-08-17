import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LessonBlockRenderer } from '../src/react-app/components/LessonBlockRenderer'
import { VisualTeachingBoard } from '../src/react-app/components/VisualTeachingBoard'
import { IllustratedGuidedTeaching } from '../src/react-app/components/IllustratedGuidedTeaching'
import {
  createSafeVisualMeasurementRuntime,
  createVisualScrollMeasurement,
  measureVisualScroll,
  scrollVisualShell,
} from '../src/react-app/components/visual-teaching-scroll'
import {
  clampGuidedTeachingStepIndex,
  getNextGuidedTeachingStepIndex,
  getPreviousGuidedTeachingStepIndex,
} from '../src/react-app/components/illustrated-guided-teaching.utils'
import { visualTeachingSchema } from '../src/shared/visual-teaching.schema'
import * as authoredVisuals from '../scripts/lib/visual-teaching-content.mjs'
import { decimalsLessonSpecs } from '../scripts/lib/decimals-teaching-system-content.mjs'
import { ratioProportionLessonSpecs } from '../scripts/lib/ratio-proportion-teaching-system-content.mjs'

type GuidedTeachingContent = Parameters<typeof IllustratedGuidedTeaching>[0]['content']

const compactVisual = visualTeachingSchema.parse({
  kind: 'transformation',
  ariaLabel: 'Accessible transformation',
  stages: [
    {
      label: 'Before',
      expression: [
        { text: '20', emphasis: 'highlight' },
        { text: '%', emphasis: 'crossed' },
      ],
      annotation: 'Decimal starts here',
    },
    {
      label: 'After',
      expression: [
        { text: '0.', emphasis: 'circled' },
        { text: '20', emphasis: 'final' },
      ],
      annotation: 'Final decimal',
    },
  ],
  transitions: [
    {
      label: 'Move 2',
      whatChanged: 'The decimal moved two places left.',
      why: 'Percent means divide by 100.',
      source: '20 comes from 20%.',
      arrow: 'curved',
      movement: 'left',
    },
  ],
  memoryTip: {
    title: 'Remember',
    rule: 'Move two places left.',
    reason: 'That is division by 100.',
    examples: ['20% → 0.20']
  },
})

const guidedTeachingFixture = {
  title: 'Guided percentage',
  subtitle: 'Step through a percent conversion.',
  prompt: 'Use each step carefully.',
  guide: {
    name: 'Guide Aya',
    message: 'I will guide each step in small increments.',
  },
  steps: [
    {
      id: 'g-1',
      stepNumber: 1,
      title: 'Read the percent',
      boardExpression: '20%',
      explanation: 'Start with the percent label.',
    },
    {
      id: 'g-2',
      stepNumber: 2,
      title: 'Shift the decimal',
      boardExpression: '0.20',
      explanation: 'Move left two places for per hundred.',
      focusLabel: 'Converted decimal',
      emphasis: 'important',
    },
    {
      id: 'g-3',
      stepNumber: 3,
      title: 'Multiply for of',
      boardExpression: '0.20 × 80',
      explanation: 'The phrase of means multiply.',
      focusLabel: 'Setup',
    },
    {
      id: 'g-4',
      stepNumber: 4,
      title: 'Final answer',
      boardExpression: '16',
      explanation: 'The result is sixteen.',
      focusLabel: 'Answer',
      emphasis: 'final',
    },
  ],
  memoryTip: {
    title: 'Memory tip',
    text: 'Percent to decimal first, then multiply by whole.',
  },
  commonMistake: {
    title: 'Common mistake',
    text: 'Forgetting to move decimal two places.',
  },
} satisfies GuidedTeachingContent

describe('visual teaching lesson blocks', () => {
  it('renders board annotations, accessible text, visual emphasis, and the mathematical reason', () => {
    const markup = renderToStaticMarkup(
      <VisualTeachingBoard visual={compactVisual} />,
    )

    expect(markup).toContain('data-testid="visual-teaching-board"')
    expect(markup).toContain('aria-label="Accessible transformation"')
    expect(markup).toContain('visual-teaching-board__token--highlight')
    expect(markup).toContain('visual-teaching-board__token--circled')
    expect(markup).toContain('visual-teaching-board__token--crossed')
    expect(markup).toContain('visual-teaching-board__token--final')
    expect(markup).toContain('What changed:')
    expect(markup).toContain('Why:')
    expect(markup).toContain('From:')
    expect(markup).toContain('Why it works:')
    expect(markup).toContain('Move 2')
  })

  it('renders the toolbar, horizontal sequence shell, and fixed memory card as siblings', () => {
    const markup = renderToStaticMarkup(
      <VisualTeachingBoard visual={compactVisual} />,
    )
    const toolbarIndex = markup.indexOf('data-testid="visual-teaching-toolbar"')
    const shellIndex = markup.indexOf('data-testid="visual-scroll-shell"')
    const sequenceIndex = markup.indexOf('data-testid="visual-teaching-sequence"')
    const memoryIndex = markup.indexOf('data-testid="visual-teaching-memory"')

    expect(toolbarIndex).toBeGreaterThan(-1)
    expect(shellIndex).toBeGreaterThan(toolbarIndex)
    expect(sequenceIndex).toBeGreaterThan(shellIndex)
    expect(memoryIndex).toBeGreaterThan(sequenceIndex)
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain('aria-label="Scroll visual teaching board left"')
    expect(markup).toContain('aria-label="Scroll visual teaching board right"')
  })

  it('renders the guided teaching flow with controls and step metadata', () => {
    const markup = renderToStaticMarkup(
      <IllustratedGuidedTeaching content={guidedTeachingFixture} />,
    )

    expect(markup).toContain('aria-label="Guided lesson walkthrough"')
    expect(markup).toContain('lesson-guided-teaching')
    expect(markup).toContain('Step 1 of 4')
    expect(markup).toContain('Guide Aya')
    expect(markup).toContain('Read the percent')
    expect(markup).toContain('Previous')
    expect(markup).toContain('Next step')
    expect(markup).not.toContain('aria-label="Memory tip"')
    expect(markup).not.toContain('aria-label="Common mistake"')
  })

  it('shows memory and mistake blocks on the final guided step', () => {
    const markup = renderToStaticMarkup(
      <IllustratedGuidedTeaching content={guidedTeachingFixture} initialStepIndex={3} />,
    )

    expect(markup).toContain('aria-label="Memory trick"')
    expect(markup).toContain('Memory tip')
    expect(markup).toContain('aria-label="Common mistake"')
    expect(markup).toContain('Forgetting to move decimal two places.')
  })

  it('measures overflow and enables controls only at the correct edges', () => {
    expect(
      measureVisualScroll({
        clientWidth: 700,
        scrollWidth: 1820,
        scrollLeft: 0,
        scrollTo: vi.fn(),
      }),
    ).toEqual({
      clientWidth: 700,
      scrollWidth: 1820,
      scrollLeft: 0,
      canScrollLeft: false,
      canScrollRight: true,
    })

    expect(
      measureVisualScroll({
        clientWidth: 700,
        scrollWidth: 1820,
        scrollLeft: 560,
        scrollTo: vi.fn(),
      }),
    ).toMatchObject({ canScrollLeft: true, canScrollRight: true })

    expect(
      measureVisualScroll({
        clientWidth: 700,
        scrollWidth: 1820,
        scrollLeft: 1120,
        scrollTo: vi.fn(),
      }),
    ).toMatchObject({ canScrollLeft: true, canScrollRight: false })
  })

  it('scrolls only the supplied shell with deterministic left and right targets', () => {
    const scrollTo = vi.fn()
    const shell = {
      clientWidth: 700,
      scrollWidth: 1820,
      scrollLeft: 0,
      scrollTo,
    }

    scrollVisualShell(shell, 1)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 490, behavior: 'smooth' })

    shell.scrollLeft = 900
    scrollVisualShell(shell, -1)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 410, behavior: 'smooth' })
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  it('clamps guided step navigation and computes boundaries deterministically', () => {
    expect(getNextGuidedTeachingStepIndex(-1, 4)).toBe(0)
    expect(getNextGuidedTeachingStepIndex(2, 4)).toBe(3)
    expect(getNextGuidedTeachingStepIndex(3, 4)).toBe(3)

    expect(getPreviousGuidedTeachingStepIndex(-5)).toBe(0)
    expect(getPreviousGuidedTeachingStepIndex(2)).toBe(1)
    expect(getPreviousGuidedTeachingStepIndex(0)).toBe(0)

    expect(clampGuidedTeachingStepIndex(-2, 4)).toBe(0)
    expect(clampGuidedTeachingStepIndex(0, 4)).toBe(0)
    expect(clampGuidedTeachingStepIndex(3, 4)).toBe(3)
    expect(clampGuidedTeachingStepIndex(10, 4)).toBe(3)
  })

  it('remeasures after animation-frame layout and ResizeObserver notifications', () => {
    const frameCallbacks = new Map<number, () => void>()
    const cancelFrame = vi.fn((frameId: number) => frameCallbacks.delete(frameId))
    let nextFrameId = 1
    const resizeCallbacks: Array<() => void> = []
    const observe = vi.fn()
    const disconnectObserver = vi.fn()
    const onMeasure = vi.fn()
    const measurement = createVisualScrollMeasurement(
      { node: 'shell' },
      { node: 'sequence' },
      onMeasure,
      {
        requestFrame: (callback) => {
          const frameId = nextFrameId
          nextFrameId += 1
          frameCallbacks.set(frameId, callback)
          return frameId
        },
        cancelFrame,
        createResizeObserver: (callback) => {
          resizeCallbacks.push(callback)
          return { observe, disconnect: disconnectObserver }
        },
      },
    )

    expect(observe).toHaveBeenNthCalledWith(1, { node: 'shell' })
    expect(observe).toHaveBeenNthCalledWith(2, { node: 'sequence' })
    expect(frameCallbacks.size).toBe(1)
    frameCallbacks.get(1)?.()
    expect(onMeasure).toHaveBeenCalledTimes(1)

    resizeCallbacks[0]?.()
    expect(frameCallbacks.has(2)).toBe(true)
    measurement.schedule()
    expect(cancelFrame).toHaveBeenCalledWith(2)
    expect(frameCallbacks.has(3)).toBe(true)

    measurement.disconnect()
    expect(cancelFrame).toHaveBeenCalledWith(3)
    expect(disconnectObserver).toHaveBeenCalledOnce()
  })

  it('renders and measures without ResizeObserver or animation-frame APIs', () => {
    const onMeasure = vi.fn()
    const runtime = createSafeVisualMeasurementRuntime({})

    expect(() =>
      createVisualScrollMeasurement(
        { node: 'shell' },
        { node: 'sequence' },
        onMeasure,
        runtime,
      ),
    ).not.toThrow()
    expect(onMeasure).toHaveBeenCalledOnce()
  })

  it('falls back to scrollLeft when scrollTo is missing or rejects options', () => {
    const withoutScrollTo = {
      clientWidth: 600,
      scrollWidth: 1800,
      scrollLeft: 0,
    }
    scrollVisualShell(withoutScrollTo, 1)
    expect(withoutScrollTo.scrollLeft).toBe(420)

    const rejectingScrollTo = {
      clientWidth: 600,
      scrollWidth: 1800,
      scrollLeft: 420,
      scrollTo: vi.fn(() => {
        throw new TypeError('Scroll options are unsupported.')
      }),
    }
    scrollVisualShell(rejectingScrollTo, -1)
    expect(rejectingScrollTo.scrollLeft).toBe(0)
  })

  it('starts with only the right control enabled before the first layout measurement', () => {
    const markup = renderToStaticMarkup(
      <VisualTeachingBoard visual={compactVisual} />,
    )
    const leftButton = markup.match(
      /<button[^>]*data-testid="visual-scroll-left"[^>]*>/,
    )?.[0]
    const rightButton = markup.match(
      /<button[^>]*data-testid="visual-scroll-right"[^>]*>/,
    )?.[0]

    expect(leftButton).toContain('disabled')
    expect(rightButton).not.toContain('disabled')
  })

  it('renders an optional visual inside an existing example block', () => {
    const markup = renderToStaticMarkup(
      <LessonBlockRenderer
        block={{
          id: 1,
          position: 1,
          type: 'example',
          content: {
            title: 'Convert a percent',
            problem: 'Write 20% as a decimal.',
            steps: ['Show the hidden decimal point.', 'Move it left twice.'],
            answer: '0.20',
            visual: compactVisual,
          },
        }}
      />,
    )

    expect(markup).toContain('Convert a percent')
    expect(markup).toContain('visual-teaching-board')
    expect(markup).toContain('<strong>Answer:</strong> 0.20')
  })

  it('renders the guided teaching inside lesson block rendering', () => {
    const markup = renderToStaticMarkup(
      <LessonBlockRenderer
        block={{
          id: 3,
          position: 3,
          type: 'illustrated-guided-teaching',
          content: guidedTeachingFixture,
        }}
      />,
    )

    expect(markup).toContain('lesson-guided-teaching')
    expect(markup).toContain('aria-label="Guided lesson walkthrough"')
    expect(markup).toContain('Read the percent')
  })

  it('enforces one explained transition between every pair of stages', () => {
    const invalid = {
      ...compactVisual,
      transitions: [],
    }

    expect(visualTeachingSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates every authored numerical teaching visual against the shared contract', () => {
    const visuals = Object.entries(authoredVisuals)
      .filter(([name]) => name.endsWith('Visual'))
      .map(([, visual]) => visual)
    expect(visuals).toHaveLength(6)

    for (const visual of visuals) {
      expect(visualTeachingSchema.safeParse(visual).success).toBe(true)
    }
  })

  it('teaches the complete percent conversion and explains why the shortcut works', () => {
    const percentage = visualTeachingSchema.parse(
      authoredVisuals.percentageOfVisual,
    )
    const text = JSON.stringify(percentage)

    expect(percentage.stages.map((stage) => stage.label)).toEqual([
      'Start',
      'Remove percent sign',
      'Decimal starts here',
      'Move 1',
      'Move 2',
      '“of” means multiply',
      'Final answer',
    ])
    expect(text).toContain('20 ÷ 100 = 0.20')
    expect(text).toContain('20% of 80')
    expect(percentage.memoryTip?.examples).toEqual([
      '8% → 0.08',
      '20% → 0.20',
      '45% → 0.45',
      '125% → 1.25',
    ])
  })
  it('renders every Decimals visual through the production lesson-block renderer', () => {
    const visualBlocks = decimalsLessonSpecs.flatMap((lesson) =>
      lesson.blocks.filter((block) => block.blockType === 'example' && block.content.visual !== undefined),
    )
    expect(visualBlocks).toHaveLength(9)

    for (const [index, block] of visualBlocks.entries()) {
      const markup = renderToStaticMarkup(
        <LessonBlockRenderer block={{ id: 10_000 + index, position: index + 1, type: 'example', content: block.content } as Parameters<typeof LessonBlockRenderer>[0]['block']} />,
      )
      expect(markup).toContain('data-testid="visual-teaching-board"')
      expect(markup).toContain('What changed:')
      expect(markup).toContain('Why it works:')
      expect(markup).toContain('data-testid="visual-teaching-memory"')
    }
  })
  it('renders every Ratio and Proportion visual through the production lesson-block renderer', () => {
    const visualBlocks = ratioProportionLessonSpecs.flatMap((lesson) =>
      lesson.blocks.filter((block) => block.blockType === 'example' && block.content.visual !== undefined),
    )
    expect(visualBlocks).toHaveLength(8)
    for (const [index, block] of visualBlocks.entries()) {
      const markup = renderToStaticMarkup(
        <LessonBlockRenderer block={{ id: 20_000 + index, position: index + 1, type: 'example', content: block.content } as Parameters<typeof LessonBlockRenderer>[0]['block']} />,
      )
      expect(markup).toContain('data-testid="visual-teaching-board"')
      expect(markup).toContain('What changed:')
      expect(markup).toContain('Why it works:')
      expect(markup).toContain('data-testid="visual-teaching-memory"')
    }
  })
})

