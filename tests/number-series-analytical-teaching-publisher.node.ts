import { numberSeriesLessonSpecs } from '../scripts/lib/number-series-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'number-series',
  topicTitle:'Number Series',
  confirmation:'publish-number-series-teaching-system-v1',
  scriptName:'create-and-publish-number-series-teaching-system.mjs',
  lessonSpecs:numberSeriesLessonSpecs,
  legacyBlockCounts:numberSeriesLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
