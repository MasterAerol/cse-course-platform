import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'

export const percentageOfVisual: VisualTeaching
export const percentageExampleContent: {
  title: string
  problem: string
  steps: string[]
  answer: string
  visual: VisualTeaching
}
export const percentageGuidedTeachingContent: {
  title: string
  subtitle?: string
  prompt?: string
  guide?: {
    name?: string
    message?: string
  }
  steps: Array<{
    id: string
    stepNumber: number
    title: string
    boardExpression: string
    guideMessage?: string
    explanation: string
    focusLabel?: string
    emphasis?: 'normal' | 'important' | 'final'
  }>
  visual?: VisualTeaching
  memoryTip?: {
    title: string
    text: string
  }
  commonMistake?: {
    title: string
    text: string
  }
}
export const fractionCommonDenominatorVisual: VisualTeaching
export const ratioScalingVisual: VisualTeaching
export const averageSharingVisual: VisualTeaching
export const workRateVisual: VisualTeaching
export const distanceFormulaVisual: VisualTeaching
