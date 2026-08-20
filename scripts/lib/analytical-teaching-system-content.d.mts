export interface AnalyticalLegacyLessonSpec { title:string; slug:string; lessonType:'reading'|'practice'|'quiz'; minutes:number; position:number }
export type AnalyticalTeachingBlockType = 'heading'|'paragraph'|'callout'|'formula'|'example'|'illustrated-guided-teaching'|'image'|'video'|'divider'|'summary'
export interface AnalyticalTeachingBlock { blockType:AnalyticalTeachingBlockType; content:Record<string,unknown> }
export interface AnalyticalTeachingLessonSpec {
  title:string
  slug:string
  lessonType:'reading'|'practice'|'quiz'
  estimatedMinutes:number
  position:number
  blocks:AnalyticalTeachingBlock[]
}
export interface AnalyticalTeachingSystemConfig {
  topicSlug:string
  topicTitle:string
  lessonSpecs:AnalyticalLegacyLessonSpec[]
  blocksFor:(slug:string)=>AnalyticalTeachingBlock[]
  method:string
  methodReason:string
  memoryRule:string
  memoryReason:string
}
export function buildAnalyticalTeachingSystem(config:AnalyticalTeachingSystemConfig):AnalyticalTeachingLessonSpec[]
