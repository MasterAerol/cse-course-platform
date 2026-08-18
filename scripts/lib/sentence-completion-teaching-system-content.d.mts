import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface SentenceCompletionTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface SentenceCompletionLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:SentenceCompletionTeachingBlock[] }
export const sentenceCompletionLessonSpecs:SentenceCompletionLessonSpec[]
export const sentenceCompletionLessonBySlug:Map<string,SentenceCompletionLessonSpec>
export const anatomyVisual:VisualTeaching
export const workflowVisual:VisualTeaching
export const fitVisual:VisualTeaching
export const transitionVisual:VisualTeaching
export const causeVisual:VisualTeaching
export const parallelVisual:VisualTeaching
export const toneVisual:VisualTeaching
export const doubleBlankVisual:VisualTeaching
export const eliminationVisual:VisualTeaching
