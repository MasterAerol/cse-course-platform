import { useCallback, useEffect, useRef, useState } from 'react'

import type { VisualTeaching } from '../../shared/visual-teaching.schema'
import {
  createSafeVisualMeasurementRuntime,
  createVisualScrollMeasurement,
  measureVisualScroll,
  scrollVisualShell,
  type VisualScrollState,
} from './visual-teaching-scroll'

interface VisualTeachingBoardProps {
  visual: VisualTeaching
}

export function VisualTeachingBoard({ visual }: VisualTeachingBoardProps) {
  const hasMultipleStages = visual.stages.length > 1
  const scrollShellRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState<VisualScrollState>({
    clientWidth: 0,
    scrollWidth: 0,
    scrollLeft: 0,
    canScrollLeft: false,
    canScrollRight: hasMultipleStages,
  })

  const updateScrollState = useCallback(() => {
    const shell = scrollShellRef.current
    if (shell == null) {
      return
    }

    setScrollState(measureVisualScroll(shell))
  }, [])

  useEffect(() => {
    const shell = scrollShellRef.current
    const sequence = sequenceRef.current
    if (shell == null || sequence == null) {
      return
    }

    const measurement = createVisualScrollMeasurement(
      shell,
      sequence,
      updateScrollState,
      createSafeVisualMeasurementRuntime({
        requestAnimationFrame:
          typeof globalThis.requestAnimationFrame === 'function'
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : undefined,
        cancelAnimationFrame:
          typeof globalThis.cancelAnimationFrame === 'function'
            ? globalThis.cancelAnimationFrame.bind(globalThis)
            : undefined,
        createResizeObserver:
          typeof globalThis.ResizeObserver === 'function'
            ? (callback) => new globalThis.ResizeObserver(() => callback())
            : undefined,
      }),
    )

    const browserWindow = typeof window === 'undefined' ? null : window
    shell.addEventListener('scroll', updateScrollState, { passive: true })
    browserWindow?.addEventListener('resize', measurement.schedule)

    return () => {
      measurement.disconnect()
      shell.removeEventListener('scroll', updateScrollState)
      browserWindow?.removeEventListener('resize', measurement.schedule)
    }
  }, [updateScrollState, visual])

  function handleScroll(direction: -1 | 1): void {
    const shell = scrollShellRef.current
    if (shell == null) {
      return
    }

    scrollVisualShell(shell, direction)
  }

  return (
    <figure
      className={`visual-teaching-board visual-teaching-board--${visual.kind}`}
      aria-label={visual.ariaLabel}
      data-testid="visual-teaching-board"
    >
      <div className="visual-teaching-board__header">
        <span className="visual-teaching-board__label">Visual Example</span>
        {hasMultipleStages && (
          <div className="visual-teaching-board__toolbar" data-testid="visual-teaching-toolbar">
            <strong>Follow the transformation</strong>
            <div className="visual-teaching-board__scroll-controls">
              <button
                type="button"
                className="visual-teaching-board__scroll-button"
                aria-label="Scroll visual teaching board left"
                data-testid="visual-scroll-left"
                onClick={() => handleScroll(-1)}
                disabled={!scrollState.canScrollLeft}
              >
                <span aria-hidden="true">&#8592;</span>
              </button>
              <button
                type="button"
                className="visual-teaching-board__scroll-button"
                aria-label="Scroll visual teaching board right"
                data-testid="visual-scroll-right"
                onClick={() => handleScroll(1)}
                disabled={!scrollState.canScrollRight}
              >
                <span aria-hidden="true">&#8594;</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className="visual-teaching-board__scroll-shell"
        aria-label="Scrollable step-by-step transformation"
        data-testid="visual-scroll-shell"
        data-client-width={import.meta.env.DEV ? scrollState.clientWidth : undefined}
        data-scroll-width={import.meta.env.DEV ? scrollState.scrollWidth : undefined}
        data-scroll-left={import.meta.env.DEV ? scrollState.scrollLeft : undefined}
        tabIndex={0}
        ref={scrollShellRef}
      >
        <div
          className="visual-teaching-board__sequence"
          data-testid="visual-teaching-sequence"
          ref={sequenceRef}
        >
          {visual.stages.map((stage, index) => {
            const transition = visual.transitions[index]

            return (
              <div className="visual-teaching-board__pair" key={`${stage.label}-${index}`}>
                <div className="visual-teaching-board__stage">
                  <span className="visual-teaching-board__stage-label">{stage.label}</span>
                  <div
                    className="visual-teaching-board__expression"
                    aria-label={stage.expression.map((token) => token.text).join('')}
                  >
                    {stage.expression.map((token, tokenIndex) => (
                      <span
                        className={`visual-teaching-board__token visual-teaching-board__token--${token.emphasis ?? 'normal'}`}
                        key={`${token.text}-${tokenIndex}`}
                      >
                        {token.text}
                      </span>
                    ))}
                  </div>
                  {stage.annotation !== undefined && (
                    <span className="visual-teaching-board__annotation">{stage.annotation}</span>
                  )}
                </div>

                {transition !== undefined && (
                  <div className={`visual-teaching-board__transition visual-teaching-board__transition--${transition.arrow}`}>
                    <span className="visual-teaching-board__flow-arrow" aria-hidden="true">→</span>
                    <strong>{transition.label}</strong>
                    {transition.movement !== undefined && (
                      <span className="visual-teaching-board__movement" aria-hidden="true">
                        {transition.movement === 'left' ? '←' : transition.movement === 'right' ? '→' : '↓'} {transition.label}
                      </span>
                    )}
                    <span><b>What changed:</b> {transition.whatChanged}</span>
                    <span><b>Why:</b> {transition.why}</span>
                    {transition.source !== undefined && <span><b>From:</b> {transition.source}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {visual.memoryTip !== undefined && (
        <figcaption className="visual-teaching-board__memory" data-testid="visual-teaching-memory">
          <strong>{visual.memoryTip.title}</strong>
          <p>{visual.memoryTip.rule}</p>
          <ul>
            {visual.memoryTip.examples.map((example) => <li key={example}>{example}</li>)}
          </ul>
          <p><b>Why it works:</b> {visual.memoryTip.reason}</p>
        </figcaption>
      )}
    </figure>
  )
}
