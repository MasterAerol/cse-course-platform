import { blocksFor, lessonSpecs } from '../seating-arrangements-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const seatingArrangementsLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'seating-and-arrangement-problems',
  topicTitle: 'Seating and Arrangement Problems',
  lessonSpecs,
  blocksFor,
  method: 'Create Slots → Fix Perspective → Place Fixed Rules → Apply Restrictions → Test Remaining Layouts → Verify',
  methodReason: 'Drawing explicit slots, fixing left/right or clockwise perspective, and applying the strongest constraints first prevents reversals, off-by-one gaps, missed wraparound, and partial layouts that violate another clue.',
  memoryRule: 'Fixed positions first',
  memoryReason: 'fixed seats, ends, immediate pairs, and exact gaps remove the most possibilities, leaving fewer candidate layouts to test against every remaining condition',
})
