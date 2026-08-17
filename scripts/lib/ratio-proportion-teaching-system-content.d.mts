import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'

export interface RatioProportionTeachingBlock {
  blockType: LessonBlockType
  content: Record<string, unknown> & { title?: string }
}
export interface RatioProportionLessonSpec {
  slug: string
  title: string
  lessonType: 'reading' | 'practice' | 'quiz'
  estimatedMinutes: number
  blocks: RatioProportionTeachingBlock[]
}
export const ratioMeaningVisual: VisualTeaching
export const simplifyUnitsVisual: VisualTeaching
export const equivalentRatioVisual: VisualTeaching
export const proportionReasonVisual: VisualTeaching
export const missingTermVisual: VisualTeaching
export const directProportionVisual: VisualTeaching
export const inverseProportionVisual: VisualTeaching
export const ratioSharingVisual: VisualTeaching
export const ratioProportionLessonSpecs: RatioProportionLessonSpec[]
export const ratioProportionLessonBySlug: Map<string, RatioProportionLessonSpec>
