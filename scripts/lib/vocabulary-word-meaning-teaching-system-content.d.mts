import type { LessonBlockType } from '../../src/worker/schemas/lesson-block.schemas'
import type { VisualTeaching } from '../../src/shared/visual-teaching.schema'
export interface VocabularyWordMeaningTeachingBlock { blockType: LessonBlockType; content: Record<string, unknown> & { title?: string; visual?: VisualTeaching } }
export interface VocabularyWordMeaningLessonSpec { slug: string; title: string; lessonType: 'reading'|'practice'|'quiz'; estimatedMinutes: number; blocks: VocabularyWordMeaningTeachingBlock[] }
export const contextEvidenceVisual: VisualTeaching
export const wordPartsVisual: VisualTeaching
export const familyRoleVisual: VisualTeaching
export const connotationVisual: VisualTeaching
export const multipleMeaningVisual: VisualTeaching
export const definitionExampleVisual: VisualTeaching
export const confusedWordsVisual: VisualTeaching
export const eliminationVisual: VisualTeaching
export const vocabularyWordMeaningLessonSpecs: VocabularyWordMeaningLessonSpec[]
export const vocabularyWordMeaningLessonBySlug: Map<string, VocabularyWordMeaningLessonSpec>
