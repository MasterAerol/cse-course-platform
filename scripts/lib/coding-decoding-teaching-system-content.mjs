import { blocksFor, lessonSpecs } from '../coding-decoding-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const codingDecodingLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'coding-and-decoding',
  topicTitle: 'Coding and Decoding',
  lessonSpecs,
  blocksFor,
  method: 'Identify Code Family → Map Inputs to Outputs → Apply in Order → Reverse if Decoding → Test All Examples → Verify',
  methodReason: 'Separating mappings, shifts, reversals, positions, symbols, and ordered steps prevents a plausible output from mixing rule families or applying the right operations in the wrong order.',
  memoryRule: 'Write every intermediate code',
  memoryReason: 'an intermediate result makes each component and operation order visible, and decoding can then undo those steps in the exact reverse order',
})
