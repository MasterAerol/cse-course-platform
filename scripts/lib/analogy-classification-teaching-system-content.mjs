import { blocksFor, lessonSpecs } from '../analogy-classification-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const analogyClassificationLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'analogy-and-classification',
  topicTitle: 'Analogy and Classification',
  lessonSpecs,
  blocksFor,
  method: 'Identify Relationship → Check Direction → Match Form → Test Options → Eliminate → Verify',
  methodReason: 'Naming the exact relationship before testing choices prevents a merely associated word, reversed pair, wrong grammatical form, or near category from appearing correct.',
  memoryRule: 'Name the relationship before choosing',
  memoryReason: 'a choice is correct only when it preserves the first pair’s exact relationship, direction, grammar, specificity, or visible transformation',
})
