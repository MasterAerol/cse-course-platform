import { blocksFor, lessonSpecs } from '../data-interpretation-topic-content.mjs'
import { buildAnalyticalTeachingSystem } from './analytical-teaching-system-content.mjs'

export const dataInterpretationLessonSpecs = buildAnalyticalTeachingSystem({
  topicSlug: 'data-interpretation',
  topicTitle: 'Data Interpretation',
  lessonSpecs,
  blocksFor,
  method: 'Read Title and Units → Select Values → Choose Operation → Calculate Exactly → Compare → Verify',
  methodReason: 'Reading the complete display before calculating prevents wrong-row, wrong-series, scale, unit, denominator, and time-period errors, while an explicit operation and final display check keep multi-step answers grounded in the given data.',
  memoryRule: 'Units before arithmetic',
  memoryReason: 'numbers represent different things such as counts, percentages, pesos, rates, or averages, so identifying the unit and base first prevents invalid comparisons and calculations',
})
