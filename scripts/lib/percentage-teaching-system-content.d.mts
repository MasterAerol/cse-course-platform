import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'

export interface PercentageTeachingBlock {
  blockType: LessonBlockType
  content: Record<string, unknown> & { title?: string }
}

export interface PercentageLessonSpec {
  slug: string
  title: string
  lessonType: 'reading' | 'practice' | 'quiz'
  estimatedMinutes: number
  blocks: PercentageTeachingBlock[]
}

export const percentToDecimalVisual: VisualTeaching
export const decimalToPercentVisual: VisualTeaching
export const findingPercentageVisual: VisualTeaching
export const findingBaseVisual: VisualTeaching
export const findingRateVisual: VisualTeaching
export const percentIncreaseVisual: VisualTeaching
export const discountVisual: VisualTeaching
export const percentageLessonSpecs: PercentageLessonSpec[]
export const percentageLessonBySlug: Map<string, PercentageLessonSpec>
