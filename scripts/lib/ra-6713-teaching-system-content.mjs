import { blocksFor, lessonSpecs } from '../ra-6713-topic-content.mjs'
import { buildGeneralInformationTeachingSystem } from './general-information-teaching-system-content.mjs'

export const ra6713LessonSpecs = buildGeneralInformationTeachingSystem({
  topicSlug: 'ra-6713-code-of-conduct',
  topicTitle: 'RA 6713: Code of Conduct and Ethical Standards',
  lessonSpecs,
  blocksFor,
  method: 'Identify Actor and Conduct → Locate the RA 6713 Rule → Separate Duty from Prohibition → Apply Every Stated Condition → Reject Unstated Exceptions → Verify the Source',
  methodReason: 'Separating the covered actor, official function, private interest, timing, exception, and statutory source prevents a positive-sounding norm, another law, or an overbroad prohibition from replacing the exact RA 6713 rule.',
  memoryRule: 'Public office is a public trust',
  memoryReason: 'RA 6713 places public interest, accountable service, disclosed interests, and conduct consistent with official duty ahead of private advantage, while each duty and prohibition still depends on its own stated conditions',
})
