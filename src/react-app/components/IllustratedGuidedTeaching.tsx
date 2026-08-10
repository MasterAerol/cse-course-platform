import { useMemo, useState } from 'react'

import { VisualTeachingBoard } from './VisualTeachingBoard'
import type { VisualTeaching } from '../../shared/visual-teaching.schema'
import {
  clampGuidedTeachingStepIndex,
  getNextGuidedTeachingStepIndex,
  getPreviousGuidedTeachingStepIndex,
} from './illustrated-guided-teaching.utils'

interface IllustratedGuide {
  name?: string
  message?: string
}

interface GuidedTeachingStep {
  id: string
  stepNumber: number
  title: string
  boardExpression: string
  guideMessage?: string
  explanation: string
  focusLabel?: string
  emphasis?: 'normal' | 'important' | 'final'
}

interface GuidedTeachingMemoryTip {
  title: string
  text: string
}

interface GuidedTeachingMistake {
  title: string
  text: string
}

interface IllustratedGuidedTeachingContent {
  title: string
  subtitle?: string
  prompt?: string
  guide?: IllustratedGuide
  steps: GuidedTeachingStep[]
  visual?: VisualTeaching
  memoryTip?: GuidedTeachingMemoryTip
  commonMistake?: GuidedTeachingMistake
}

interface IllustratedGuidedTeachingProps {
  content: IllustratedGuidedTeachingContent
  initialStepIndex?: number
}

export function IllustratedGuidedTeaching({
  content,
  initialStepIndex = 0,
}: IllustratedGuidedTeachingProps) {
  const steps = useMemo(
    () => (Array.isArray(content.steps) ? content.steps : []),
    [content.steps],
  )
  const totalSteps = steps.length
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    clampGuidedTeachingStepIndex(initialStepIndex, totalSteps),
  )

  const currentStep = useMemo(
    () => steps[currentStepIndex],
    [steps, currentStepIndex],
  )

  if (currentStep === undefined) {
    return (
      <section className="lesson-guided-teaching lesson-guided-teaching--unavailable">
        <p className="lesson-guided-teaching__empty">
          This guided example is temporarily unavailable.
        </p>
      </section>
    )
  }

  const isAtFirstStep = currentStepIndex <= 0
  const isAtLastStep = currentStepIndex >= totalSteps - 1

  function handlePrevious(): void {
    setCurrentStepIndex((previous) =>
      getPreviousGuidedTeachingStepIndex(previous),
    )
  }

  function handleNext(): void {
    setCurrentStepIndex((previous) =>
      getNextGuidedTeachingStepIndex(previous, totalSteps),
    )
  }

  return (
    <section className="lesson-guided-teaching" aria-label="Guided lesson walkthrough">
      <header className="lesson-guided-teaching__intro">
        <p className="eyebrow">Guided lesson</p>
        <h3>{content.title}</h3>
        {content.subtitle !== undefined && (
          <p className="lesson-guided-teaching__subtitle">{content.subtitle}</p>
        )}
        {content.prompt !== undefined && (
          <p className="lesson-guided-teaching__prompt">{content.prompt}</p>
        )}
      </header>

      <p
        className="lesson-guided-teaching__progress"
        aria-live="polite"
        aria-label={`Step ${currentStep.stepNumber} of ${totalSteps}`}
      >
        Step {currentStep.stepNumber} of {totalSteps}
      </p>

      <div className="lesson-guided-teaching__stage">
        <aside
          className="lesson-guided-teaching__guide"
          aria-label={`Guide ${content.guide?.name ?? 'Mentor'}`}
        >
          <div className="lesson-guided-teaching__guide-avatar" aria-hidden="true">
            <span className="lesson-guided-teaching__avatar-head" />
            <span className="lesson-guided-teaching__avatar-body" />
          </div>
          <p className="lesson-guided-teaching__guide-title">
            {content.guide?.name ?? 'Your guide'}
          </p>
          <h4 className="lesson-guided-teaching__step-title">
            {currentStep.title}
          </h4>
          <p className="lesson-guided-teaching__guide-message">
            {currentStep.guideMessage ?? content.guide?.message}
          </p>
        </aside>

        <article className="lesson-guided-teaching__board">
          <p
            className={`lesson-guided-teaching__board-expression lesson-guided-teaching__board-expression--${currentStep.emphasis ?? 'normal'}`}
            aria-live="polite"
          >
            {currentStep.boardExpression}
          </p>
          {currentStep.focusLabel !== undefined && (
            <p className="lesson-guided-teaching__focus">
              Focus: {currentStep.focusLabel}
            </p>
          )}
          <p className="lesson-guided-teaching__explanation">
            {currentStep.explanation}
          </p>
        </article>
      </div>

      <nav className="lesson-guided-teaching__controls" aria-label="Guided step navigation">
        <button
          type="button"
          className="button-link"
          disabled={isAtFirstStep}
          onClick={handlePrevious}
          aria-label="Go to previous guided step"
        >
          Previous
        </button>
        <button
          type="button"
          className="button-link"
          disabled={isAtLastStep}
          onClick={handleNext}
          aria-label="Go to next guided step"
        >
          Next step
        </button>
      </nav>

      {content.visual !== undefined && (
        <div className="lesson-guided-teaching__reference-board">
          <h4>Detailed transformation</h4>
          <VisualTeachingBoard visual={content.visual} />
        </div>
      )}

      {isAtLastStep && content.memoryTip !== undefined && (
        <section className="lesson-guided-teaching__memory" aria-label="Memory trick">
          <h4>{content.memoryTip.title}</h4>
          <p>{content.memoryTip.text}</p>
        </section>
      )}

      {isAtLastStep && content.commonMistake !== undefined && (
        <section className="lesson-guided-teaching__mistake" aria-label="Common mistake">
          <h4>{content.commonMistake.title}</h4>
          <p>{content.commonMistake.text}</p>
        </section>
      )}
    </section>
  )
}
