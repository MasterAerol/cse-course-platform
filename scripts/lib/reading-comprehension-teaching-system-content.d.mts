import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface ReadingComprehensionTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface ReadingComprehensionLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:ReadingComprehensionTeachingBlock[] }
export const readingComprehensionLessonSpecs:ReadingComprehensionLessonSpec[]
export const readingComprehensionLessonBySlug:Map<string,ReadingComprehensionLessonSpec>
export const evidenceProcessVisual:VisualTeaching
export const mainIdeaVisual:VisualTeaching
export const scopeTrapVisual:VisualTeaching
export const detailEvidenceVisual:VisualTeaching
export const statementStatusVisual:VisualTeaching
export const structureMapVisual:VisualTeaching
export const causeEffectVisual:VisualTeaching
export const contextReferenceVisual:VisualTeaching
export const inferenceVisual:VisualTeaching
export const purposeToneVisual:VisualTeaching
export const factConclusionVisual:VisualTeaching
export const distractorVisual:VisualTeaching
