import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface PronounsModifiersTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface PronounsModifiersLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:PronounsModifiersTeachingBlock[] }
export const pronounsModifiersLessonSpecs:PronounsModifiersLessonSpec[]
export const pronounsModifiersLessonBySlug:Map<string,PronounsModifiersLessonSpec>
export const methodVisual:VisualTeaching
export const referenceVisual:VisualTeaching
export const caseVisual:VisualTeaching
export const possessiveVisual:VisualTeaching
export const relativeVisual:VisualTeaching
export const modifierVisual:VisualTeaching
export const comparativeVisual:VisualTeaching
export const misplacedVisual:VisualTeaching
export const danglingVisual:VisualTeaching
