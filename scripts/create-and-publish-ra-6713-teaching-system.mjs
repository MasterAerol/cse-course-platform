#!/usr/bin/env node
import { runGeneralInformationTeachingPublisher } from './lib/general-information-teaching-system-publisher.mjs'
import { ra6713LessonSpecs } from './lib/ra-6713-teaching-system-content.mjs'

runGeneralInformationTeachingPublisher({
  topicSlug: 'ra-6713-code-of-conduct',
  topicTitle: 'RA 6713: Code of Conduct and Ethical Standards',
  lessonSpecs: ra6713LessonSpecs,
  confirmation: 'publish-ra-6713-code-of-conduct-teaching-system-v1',
  credentialEnv: 'CSE_RA_6713_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
