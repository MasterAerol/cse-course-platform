#!/usr/bin/env node
import { runGeneralInformationTeachingPublisher } from './lib/general-information-teaching-system-publisher.mjs'
import { peaceHumanRightsLessonSpecs } from './lib/peace-human-rights-teaching-system-content.mjs'

runGeneralInformationTeachingPublisher({
  topicSlug: 'peace-and-human-rights',
  topicTitle: 'Peace and Human Rights Issues and Concepts',
  lessonSpecs: peaceHumanRightsLessonSpecs,
  confirmation: 'publish-peace-and-human-rights-teaching-system-v1',
  credentialEnv: 'CSE_PEACE_HUMAN_RIGHTS_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
