import { useCallback, useEffect, useRef, useState } from 'react'

import type { VisualTeaching } from '../../shared/visual-teaching.schema'

interface VisualTeachingBoardProps {
  visual: VisualTeaching
}

export function VisualTeachingBoard({ visual }: VisualTeachingBoardProps) {
  const scrollShellRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const hasMultipleStages = visual.stages.length > 1

  const updateScrollState = useCallback(() => {
    const shell = scrollShellRef.current
    if (shell == null) {
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = shell
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth)
  }, [])

  useEffect(() => {
    const shell = scrollShellRef.current
    if (shell == null) {
      return
    }

    updateScrollState()
    shell.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      shell.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState])

  function handleScroll(direction: -1 | 1): void {
    const shell = scrollShellRef.current
    if (shell == null) {
      return
    }

    shell.scrollBy({
      left: direction * shell.clientWidth * 0.75,
      behavior: 'smooth',
    })
  }

  return (
    <figure
      className={`visual-teaching-board visual-teaching-board--${visual.kind}`}
      aria-label={visual.ariaLabel}
      data-testid="visual-teaching-board"
    >
      {hasMultipleStages && (
        <div className="visual-teaching-board__toolbar" data-testid="visual-teaching-toolbar">
          <strong>Follow the transformation</strong>
          <div className="visual-teaching-board__scroll-controls">
            <button
              type="button"
              className="visual-teaching-board__scroll-button"
              aria-label="Scroll visual teaching board left"
              onClick={() => handleScroll(-1)}
              disabled={!canScrollLeft}
            >
              <span aria-hidden="true">&#8592;</span>
            </button>
            <button
              type="button"
              className="visual-teaching-board__scroll-button"
              aria-label="Scroll visual teaching board right"
              onClick={() => handleScroll(1)}
              disabled={!canScrollRight}
            >
              <span aria-hidden="true">&#8594;</span>
            </button>
          </div>
        </div>
      )}

      <div
        className="visual-teaching-board__scroll-shell"
        aria-label="Scrollable step-by-step transformation"
        data-testid="visual-teaching-scroll-shell"
        tabIndex={0}
        ref={scrollShellRef}
      >
        <div className="visual-teaching-board__sequence" data-testid="visual-teaching-sequence">
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
