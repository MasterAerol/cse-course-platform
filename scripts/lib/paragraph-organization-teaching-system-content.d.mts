import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface ParagraphOrganizationTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface ParagraphOrganizationLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:ParagraphOrganizationTeachingBlock[] }
export const paragraphOrganizationLessonSpecs:ParagraphOrganizationLessonSpec[]
export const paragraphOrganizationLessonBySlug:Map<string,ParagraphOrganizationLessonSpec>
export const paragraphMapVisual:VisualTeaching
export const topicSentenceVisual:VisualTeaching
export const supportVisual:VisualTeaching
export const chronologyVisual:VisualTeaching
export const causeEffectVisual:VisualTeaching
export const comparisonVisual:VisualTeaching
export const hierarchyVisual:VisualTeaching
export const linkVisual:VisualTeaching
export const openingClosingVisual:VisualTeaching
export const methodVisual:VisualTeaching
