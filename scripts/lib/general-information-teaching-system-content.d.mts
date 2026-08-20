export interface GeneralInformationLegacyLessonSpec { title:string; slug:string; lessonType:'reading'|'practice'|'quiz'; minutes:number; position:number }
export type GeneralInformationTeachingBlockType = 'heading'|'paragraph'|'callout'|'formula'|'example'|'illustrated-guided-teaching'|'image'|'video'|'divider'|'summary'
export interface GeneralInformationTeachingBlock { blockType:GeneralInformationTeachingBlockType; content:Record<string,unknown> }
export interface GeneralInformationTeachingLessonSpec {
  title:string
  slug:string
  lessonType:'reading'|'practice'|'quiz'
  estimatedMinutes:number
  position:number
  blocks:GeneralInformationTeachingBlock[]
}
export interface GeneralInformationTeachingSystemConfig {
  topicSlug:string
  topicTitle:string
  lessonSpecs:GeneralInformationLegacyLessonSpec[]
  blocksFor:(slug:string)=>GeneralInformationTeachingBlock[]
  method:string
  methodReason:string
  memoryRule:string
  memoryReason:string
}
export function buildGeneralInformationTeachingSystem(config:GeneralInformationTeachingSystemConfig):GeneralInformationTeachingLessonSpec[]
