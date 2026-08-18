import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface SentenceStructureTeachingBlock { blockType:LessonBlockType; content:Record<string,unknown>&{title?:string;visual?:VisualTeaching} }
export interface SentenceStructureLessonSpec { slug:string; title:string; lessonType:'reading'|'practice'|'quiz'; estimatedMinutes:number; blocks:SentenceStructureTeachingBlock[] }
export const sentenceStructureErrorsLessonSpecs:SentenceStructureLessonSpec[]
export const anatomyVisual:VisualTeaching
export const clauseVisual:VisualTeaching
export const typeVisual:VisualTeaching
export const fragmentVisual:VisualTeaching
export const boundaryVisual:VisualTeaching
export const connectorVisual:VisualTeaching
export const parallelVisual:VisualTeaching
export const clarityVisual:VisualTeaching
export const errorVisual:VisualTeaching
export const methodVisual:VisualTeaching
