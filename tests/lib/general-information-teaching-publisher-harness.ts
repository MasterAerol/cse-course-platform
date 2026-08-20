import type { GeneralInformationTeachingLessonSpec } from '../../scripts/lib/general-information-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './analytical-teaching-publisher-harness'

interface GeneralInformationContractConfig {
  topicSlug:string
  topicTitle:string
  confirmation:string
  scriptName:string
  lessonSpecs:GeneralInformationTeachingLessonSpec[]
  legacyBlockCounts:number[]
}

export function defineGeneralInformationPublisherContract(config:GeneralInformationContractConfig) {
  defineAnalyticalPublisherContract({
    ...config,
    subjectSlug:'general-information',
    endpointSlug:'general-information-teaching-system-v1',
  })
}
