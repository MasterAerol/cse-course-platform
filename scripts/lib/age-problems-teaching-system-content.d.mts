import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface AgeProblemsTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface AgeProblemsLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: AgeProblemsTeachingBlock[] }
export const ageTimelineVisual: VisualTeaching
export const ageDifferenceVisual: VisualTeaching
export const presentRelationshipVisual: VisualTeaching
export const ageSumVisual: VisualTeaching
export const ratioDifferenceVisual: VisualTeaching
export const futureAgeVisual: VisualTeaching
export const pastAgeVisual: VisualTeaching
export const ageProblemsLessonSpecs: AgeProblemsLessonSpec[]
export const ageProblemsLessonBySlug: Map<string, AgeProblemsLessonSpec>