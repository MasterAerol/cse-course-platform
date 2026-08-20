import { ra6713LessonSpecs } from '../scripts/lib/ra-6713-teaching-system-content.mjs'
import { defineGeneralInformationPublisherContract } from './lib/general-information-teaching-publisher-harness'

defineGeneralInformationPublisherContract({
  topicSlug:'ra-6713-code-of-conduct',
  topicTitle:'RA 6713: Code of Conduct and Ethical Standards',
  confirmation:'publish-ra-6713-code-of-conduct-teaching-system-v1',
  scriptName:'create-and-publish-ra-6713-teaching-system.mjs',
  lessonSpecs:ra6713LessonSpecs,
  legacyBlockCounts:ra6713LessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
