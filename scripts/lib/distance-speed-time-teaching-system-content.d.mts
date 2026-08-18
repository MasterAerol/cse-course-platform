import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface DistanceSpeedTimeTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface DistanceSpeedTimeLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: DistanceSpeedTimeTeachingBlock[] }
export const distanceFormulaVisual: VisualTeaching
export const unitConversionVisual: VisualTeaching
export const averageSpeedVisual: VisualTeaching
export const sameDirectionVisual: VisualTeaching
export const oppositeDirectionVisual: VisualTeaching
export const catchUpVisual: VisualTeaching
export const multiStageVisual: VisualTeaching
export const stoppedTimeVisual: VisualTeaching
export const distanceSpeedTimeLessonSpecs: DistanceSpeedTimeLessonSpec[]
export const distanceSpeedTimeLessonBySlug: Map<string, DistanceSpeedTimeLessonSpec>