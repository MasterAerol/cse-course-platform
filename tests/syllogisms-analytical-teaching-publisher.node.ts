import { syllogismsLessonSpecs } from '../scripts/lib/syllogisms-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'syllogisms',
  topicTitle:'Syllogisms',
  confirmation:'publish-syllogisms-teaching-system-v1',
  scriptName:'create-and-publish-syllogisms-teaching-system.mjs',
  lessonSpecs:syllogismsLessonSpecs,
  legacyBlockCounts:syllogismsLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
