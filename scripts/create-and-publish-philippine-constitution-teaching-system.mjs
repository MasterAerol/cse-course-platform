#!/usr/bin/env node
import { runGeneralInformationTeachingPublisher } from './lib/general-information-teaching-system-publisher.mjs'
import { philippineConstitutionLessonSpecs } from './lib/philippine-constitution-teaching-system-content.mjs'

runGeneralInformationTeachingPublisher({
  topicSlug: 'philippine-constitution-fundamentals',
  topicTitle: 'Philippine Constitution Fundamentals',
  lessonSpecs: philippineConstitutionLessonSpecs,
  confirmation: 'publish-philippine-constitution-fundamentals-teaching-system-v1',
  credentialEnv: 'CSE_PHILIPPINE_CONSTITUTION_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
