import type { VisualTeaching } from '../../shared/visual-teaching.schema'

interface VisualTeachingBoardProps {
  visual: VisualTeaching
}

export function VisualTeachingBoard({ visual }: VisualTeachingBoardProps) {
  return (
    <figure
      className={`visual-teaching-board visual-teaching-board--${visual.kind}`}
      aria-label={visual.ariaLabel}
      data-testid="visual-teaching-board"
    >
      <div className="visual-teaching-board__scroll-shell">
        <div className="visual-teaching-board__sequence">
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
        <figcaption className="visual-teaching-board__memory">
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
