import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface SubjectVerbAgreementTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface SubjectVerbAgreementLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:SubjectVerbAgreementTeachingBlock[] }
export const subjectVerbAgreementLessonSpecs:SubjectVerbAgreementLessonSpec[]
export const subjectVerbAgreementLessonBySlug:Map<string,SubjectVerbAgreementLessonSpec>
export const methodVisual:VisualTeaching
export const basicVisual:VisualTeaching
export const subjectFinderVisual:VisualTeaching
export const compoundVisual:VisualTeaching
export const proximityVisual:VisualTeaching
export const indefiniteVisual:VisualTeaching
export const quantityVisual:VisualTeaching
export const inversionVisual:VisualTeaching
export const specialVisual:VisualTeaching
