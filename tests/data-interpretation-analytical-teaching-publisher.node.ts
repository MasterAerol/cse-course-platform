import { dataInterpretationLessonSpecs } from '../scripts/lib/data-interpretation-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'data-interpretation',
  topicTitle:'Data Interpretation',
  confirmation:'publish-data-interpretation-teaching-system-v1',
  scriptName:'create-and-publish-data-interpretation-teaching-system.mjs',
  lessonSpecs:dataInterpretationLessonSpecs,
  legacyBlockCounts:dataInterpretationLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
