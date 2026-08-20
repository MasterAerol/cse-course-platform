import { blocksFor, lessonSpecs } from '../philippine-constitution-topic-content.mjs'
import { buildGeneralInformationTeachingSystem } from './general-information-teaching-system-content.mjs'

export const philippineConstitutionLessonSpecs = buildGeneralInformationTeachingSystem({
  topicSlug: 'philippine-constitution-fundamentals',
  topicTitle: 'Philippine Constitution Fundamentals',
  lessonSpecs,
  blocksFor,
  method: 'Identify Concept → Locate Article and Section → Match Institution or Right → Apply Exact Scope → Eliminate Overreach → Verify',
  methodReason: 'Separating the constitutional concept, institution, right, qualification, procedure, and limitation prevents ordinary statutes, reversed branch roles, missing qualifications, and current political facts from replacing the stable 1987 constitutional text.',
  memoryRule: 'Match the role and scope before the name',
  memoryReason: 'branches, commissions, rights, qualifications, and amendment procedures can use familiar civic terms, but the correct answer must match both the institution assigned by the Constitution and the precise scope of its provision',
})
