import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface SynonymsAntonymsTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface SynonymsAntonymsLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:SynonymsAntonymsTeachingBlock[] }
export const synonymsAntonymsLessonSpecs:SynonymsAntonymsLessonSpec[]
export const synonymsAntonymsLessonBySlug:Map<string,SynonymsAntonymsLessonSpec>
export const directionVisual:VisualTeaching
export const replaceVisual:VisualTeaching
export const reverseVisual:VisualTeaching
export const intensityVisual:VisualTeaching
export const toneVisual:VisualTeaching
export const grammarVisual:VisualTeaching
export const precisionVisual:VisualTeaching
export const eliminationVisual:VisualTeaching