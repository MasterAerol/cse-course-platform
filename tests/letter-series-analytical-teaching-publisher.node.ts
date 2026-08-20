import { letterSeriesLessonSpecs } from '../scripts/lib/letter-series-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'letter-series',
  topicTitle:'Letter Series',
  confirmation:'publish-letter-series-teaching-system-v1',
  scriptName:'create-and-publish-letter-series-teaching-system.mjs',
  lessonSpecs:letterSeriesLessonSpecs,
  legacyBlockCounts:letterSeriesLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
