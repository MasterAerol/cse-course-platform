import { blocksFor, lessonSpecs } from '../syllogisms-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const syllogismsLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'syllogisms',
  topicTitle: 'Syllogisms',
  lessonSpecs,
  blocksFor,
  method: 'Translate Quantifiers → Describe Regions → Place Witnesses → Test Every Valid Model → Classify → Verify',
  methodReason: 'Separating universal region restrictions from existential witnesses prevents converse errors, unsupported existence, merged Some markers, and possible conclusions being treated as definite.',
  memoryRule: 'Universal rules shape; Some places a witness',
  memoryReason: 'All and No restrict every allowed model without proving members exist, while Some and Some-not supply an actual member that must be preserved through every applicable premise',
})
