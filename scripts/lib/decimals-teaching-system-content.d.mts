import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'

export interface DecimalsTeachingBlock {
  blockType: LessonBlockType
  content: Record<string, unknown> & { title?: string }
}

export interface DecimalsLessonSpec {
  slug: string
  title: string
  lessonType: 'reading' | 'practice' | 'quiz'
  estimatedMinutes: number
  blocks: DecimalsTeachingBlock[]
}

export const decimalPlaceValueVisual: VisualTeaching
export const readingWritingDecimalsVisual: VisualTeaching
export const compareOrderDecimalsVisual: VisualTeaching
export const roundingDecimalsVisual: VisualTeaching
export const addingDecimalsVisual: VisualTeaching
export const subtractingDecimalsVisual: VisualTeaching
export const multiplyingDecimalsVisual: VisualTeaching
export const dividingDecimalsVisual: VisualTeaching
export const decimalConversionsVisual: VisualTeaching
export const decimalsLessonSpecs: DecimalsLessonSpec[]
export const decimalsLessonBySlug: Map<string, DecimalsLessonSpec>
