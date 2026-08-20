import { blocksFor, lessonSpecs } from '../letter-series-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const letterSeriesLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'letter-series',
  topicTitle: 'Letter Series',
  lessonSpecs,
  blocksFor,
  method: 'Translate Letters → Measure Signed Gaps → Separate Patterns → Test Twice → Continue → Verify',
  methodReason: 'Turning letters into positions makes direction, skip size, alternating cycles, groups, and independent letter-number progressions visible and testable.',
  memoryRule: 'Positions before guesses',
  memoryReason: 'alphabet positions convert an apparent word puzzle into exact signed movement, preventing inclusive-counting errors, accidental word associations, and unsupported wraparound',
})
