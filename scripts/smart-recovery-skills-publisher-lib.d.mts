export const SMART_RECOVERY_COURSE_SLUG: 'cse-professional'
export const LOCAL_CONFIRMATION: 'publish-smart-recovery-skills-local'
export const PRODUCTION_CONFIRMATION: 'publish-smart-recovery-skills-production'

export interface PublisherSkill {
  slug: string
  title: string
  subjectSlug: string
  topicSlug: string
  relatedLessonSlug?: string
  description?: string
  status: 'active' | 'deprecated'
  taxonomyVersion: number
}

export interface PublisherMapping {
  generatorSlug: string
  generatorVersion: number
  skillSlug: string
  taxonomyVersion: number
}

export interface PublisherSource {
  taxonomyVersion: number
  skills: readonly PublisherSkill[]
  mappings: readonly PublisherMapping[]
  sourceValidation: { valid: boolean; errors: string[] }
}

export interface PublisherCatalog {
  courses: Array<{ id: number | string; slug: string }>
  subjects: Array<{ id: number | string; slug: string }>
  topics: Array<{ id: number | string; slug: string; subject_slug: string; subject_id: number | string }>
  lessons: Array<{ id: number | string; slug: string; topic_slug: string; subject_slug: string; topic_id: number | string }>
}

export interface ResolvedSkill {
  slug: string
  taxonomyVersion: number
  subjectId: number
  topicId: number
  relatedLessonId: number | null
  title: string
  description: string | null
  status: 'active' | 'deprecated'
}

export interface ExistingSkillRow {
  public_id: string
  slug: string
  taxonomy_version: number | string
  subject_id: number | string
  topic_id: number | string | null
  related_lesson_id: number | string | null
  title: string
  description: string | null
  status: string
}

export interface SkillChange extends ResolvedSkill {
  kind: 'create' | 'update'
  publicId: string
}

export interface SkillChangePlan {
  changes: SkillChange[]
  created: number
  updated: number
  unchanged: number
  sourceSkillCount: number
  existingUnmanagedCount: number
}

export function validateCanonicalTaxonomy(source: PublisherSource): {
  taxonomyVersion: number
  skillCount: number
  mappingCount: number
  activeSkillCount: number
  deprecatedSkillCount: number
}
export function resolveCanonicalSkills(source: PublisherSource, catalog: PublisherCatalog): {
  summary: ReturnType<typeof validateCanonicalTaxonomy>
  resolved: ResolvedSkill[]
}
export function planCanonicalSkillChanges(
  resolvedSkills: ResolvedSkill[],
  existingRows: ExistingSkillRow[],
  createPublicId: (slug: string) => string,
): SkillChangePlan
export function buildCanonicalSkillMutationSql(plan: SkillChangePlan): string | null
