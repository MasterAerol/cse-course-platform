import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'

export interface FractionsTeachingBlock {
  blockType: LessonBlockType
  content: Record<string, unknown> & { title?: string }
}

export interface FractionsLessonSpec {
  slug: string
  title: string
  lessonType: 'reading' | 'practice' | 'quiz'
  estimatedMinutes: number
  blocks: FractionsTeachingBlock[]
}

export const fractionPartsVisual: VisualTeaching
export const mixedImproperVisual: VisualTeaching
export const equivalentFractionsVisual: VisualTeaching
export const compareOrderVisual: VisualTeaching
export const addUnlikeVisual: VisualTeaching
export const subtractUnlikeVisual: VisualTeaching
export const multiplyFractionsVisual: VisualTeaching
export const divideFractionsVisual: VisualTeaching
export const fractionApplicationVisual: VisualTeaching
export const fractionsLessonSpecs: FractionsLessonSpec[]
export const fractionsLessonBySlug: Map<string, FractionsLessonSpec>
