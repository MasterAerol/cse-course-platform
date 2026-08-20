import { blocksFor, lessonSpecs } from '../ordering-ranking-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const orderingRankingLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'ordering-and-ranking',
  topicTitle: 'Ordering and Ranking',
  lessonSpecs,
  blocksFor,
  method: 'Name Direction → Mark Positions → Choose Relationship → Update One Clue at a Time → Check Bounds → Verify',
  methodReason: 'Fixing the reference end and translating each clue to a one-based position prevents overlap, movement, between-count, above/below, and queue updates from being reversed or double-counted.',
  memoryRule: 'Name the counting end first',
  memoryReason: 'the same person has different numerical ranks from opposite ends, so direction determines whether a movement or relationship raises, lowers, adds to, or subtracts from the rank',
})
