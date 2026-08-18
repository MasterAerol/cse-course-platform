import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface GrammarCorrectUsageTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface GrammarCorrectUsageLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:GrammarCorrectUsageTeachingBlock[] }
export const grammarCorrectUsageLessonSpecs:GrammarCorrectUsageLessonSpec[]
export const grammarCorrectUsageLessonBySlug:Map<string,GrammarCorrectUsageLessonSpec>
export const workflowVisual:VisualTeaching
export const roleVisual:VisualTeaching
export const tenseVisual:VisualTeaching
export const determinerVisual:VisualTeaching
export const prepositionVisual:VisualTeaching
export const conjunctionVisual:VisualTeaching
export const comparisonVisual:VisualTeaching
export const confusedVisual:VisualTeaching
export const eliminationVisual:VisualTeaching
