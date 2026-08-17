import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface NumberProblemsTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface NumberProblemsLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: NumberProblemsTeachingBlock[] }
export const translationVisual: VisualTeaching
export const consecutiveVisual: VisualTeaching
export const parityVisual: VisualTeaching
export const sumDifferenceVisual: VisualTeaching
export const multipleVisual: VisualTeaching
export const digitVisual: VisualTeaching
export const fractionVisual: VisualTeaching
export const numberProblemsLessonSpecs: NumberProblemsLessonSpec[]
export const numberProblemsLessonBySlug: Map<string, NumberProblemsLessonSpec>