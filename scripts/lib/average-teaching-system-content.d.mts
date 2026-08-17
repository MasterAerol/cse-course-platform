import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface AverageTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string } }
export interface AverageLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: AverageTeachingBlock[] }
export const averageSharingVisual: VisualTeaching
export const sumCountVisual: VisualTeaching
export const missingValueVisual: VisualTeaching
export const combinedAverageVisual: VisualTeaching
export const weightedAverageVisual: VisualTeaching
export const changingAverageVisual: VisualTeaching
export const averageSpeedVisual: VisualTeaching
export const averageLessonSpecs: AverageLessonSpec[]
export const averageLessonBySlug: Map<string, AverageLessonSpec>