import { blocksFor, lessonSpecs } from '../logical-reasoning-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const logicalReasoningLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'logical-reasoning-fundamentals',
  topicTitle: 'Logical Reasoning Fundamentals',
  lessonSpecs,
  blocksFor,
  method: 'Read → Classify → Translate → Deduce → Test → Verify',
  methodReason: 'Classifying the statement and translating its exact direction prevents outside assumptions, converse errors, and conclusions that are merely possible.',
  memoryRule: 'Use every premise in its stated direction',
  memoryReason: 'a conclusion is proven only when the supplied premises guarantee it without reversal or added information',
})
