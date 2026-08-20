import { peaceHumanRightsLessonSpecs } from '../scripts/lib/peace-human-rights-teaching-system-content.mjs'
import { defineGeneralInformationPublisherContract } from './lib/general-information-teaching-publisher-harness'

defineGeneralInformationPublisherContract({
  topicSlug:'peace-and-human-rights',
  topicTitle:'Peace and Human Rights Issues and Concepts',
  confirmation:'publish-peace-and-human-rights-teaching-system-v1',
  scriptName:'create-and-publish-peace-human-rights-teaching-system.mjs',
  lessonSpecs:peaceHumanRightsLessonSpecs,
  legacyBlockCounts:peaceHumanRightsLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
