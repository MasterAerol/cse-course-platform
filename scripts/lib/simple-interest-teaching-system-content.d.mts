import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface SimpleInterestTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface SimpleInterestLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: SimpleInterestTeachingBlock[] }
export const principalRateTimeVisual: VisualTeaching
export const formulaFamilyVisual: VisualTeaching
export const rateConversionVisual: VisualTeaching
export const timeConversionVisual: VisualTeaching
export const maturityValueVisual: VisualTeaching
export const linearGrowthVisual: VisualTeaching
export const missingVariableVisual: VisualTeaching
export const optionComparisonVisual: VisualTeaching
export const simpleInterestLessonSpecs: SimpleInterestLessonSpec[]
export const simpleInterestLessonBySlug: Map<string, SimpleInterestLessonSpec>
