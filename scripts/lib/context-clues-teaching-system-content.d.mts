import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface ContextCluesTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface ContextCluesLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:ContextCluesTeachingBlock[] }
export const contextCluesLessonSpecs:ContextCluesLessonSpec[]
export const contextCluesLessonBySlug:Map<string,ContextCluesLessonSpec>
export const contextEvidenceVisual:VisualTeaching
export const definitionVisual:VisualTeaching
export const contrastVisual:VisualTeaching
export const exampleVisual:VisualTeaching
export const causeEffectVisual:VisualTeaching
export const inferenceVisual:VisualTeaching
export const signalMapVisual:VisualTeaching
export const workflowVisual:VisualTeaching
