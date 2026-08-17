import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface WorkRateTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface WorkRateLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: WorkRateTeachingBlock[] }
export const wholeJobVisual: VisualTeaching
export const combinedRateVisual: VisualTeaching
export const joinLaterVisual: VisualTeaching
export const leaveEarlyVisual: VisualTeaching
export const drainVisual: VisualTeaching
export const workerDaysVisual: VisualTeaching
export const unknownRateVisual: VisualTeaching
export const workRateLessonSpecs: WorkRateLessonSpec[]
export const workRateLessonBySlug: Map<string, WorkRateLessonSpec>