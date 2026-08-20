import { blocksFor, lessonSpecs } from '../number-series-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const numberSeriesLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'number-series',
  topicTitle: 'Number Series',
  lessonSpecs,
  blocksFor,
  method: 'Observe → Compare → Build Differences or Ratios → Test Pattern → Continue → Verify',
  methodReason: 'Comparing every transition and building a difference, ratio, cycle, position, power, or recurrence model exposes the simplest complete rule instead of a guess based on the last pair.',
  memoryRule: 'Test the pattern twice',
  memoryReason: 'a false rule can accidentally match one transition, while a defensible number-series rule must reproduce every relevant term and the requested value exactly',
})
