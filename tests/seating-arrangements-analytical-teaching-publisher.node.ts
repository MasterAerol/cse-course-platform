import { seatingArrangementsLessonSpecs } from '../scripts/lib/seating-arrangements-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'seating-and-arrangement-problems',
  topicTitle:'Seating and Arrangement Problems',
  confirmation:'publish-seating-and-arrangement-problems-teaching-system-v1',
  scriptName:'create-and-publish-seating-arrangements-teaching-system.mjs',
  lessonSpecs:seatingArrangementsLessonSpecs,
  legacyBlockCounts:seatingArrangementsLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
