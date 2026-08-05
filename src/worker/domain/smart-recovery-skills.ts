import {
  analyticalAbilityBlueprintV1,
  generalInformationBlueprintV1,
  numericalAbilityBlueprintV1,
  verbalAbilityBlueprintV1,
  type SubjectAssessmentBlueprint,
  type SubjectAssessmentSubjectSlug,
} from './subject-assessment-blueprint'
import { getRegisteredGenerators } from '../generators/generator.registry'
import type { GeneratorSlug } from '../generators/generator.types'

export const SMART_RECOVERY_TAXONOMY_VERSION = 1 as const

export type SkillSubject = SubjectAssessmentSubjectSlug
export type SkillSlug = GeneratorSlug
export type SkillStatus = 'active' | 'deprecated'
export type GeneratorSkillMappingKind = 'direct' | 'broad-mixed'

export interface SkillDefinition {
  slug: SkillSlug
  title: string
  subjectSlug: SkillSubject
  topicSlug: string
  relatedLessonSlug?: string
  description?: string
  status: SkillStatus
  taxonomyVersion: typeof SMART_RECOVERY_TAXONOMY_VERSION
}

export interface GeneratorSkillMapping {
  generatorSlug: GeneratorSlug
  generatorVersion: number
  skillSlug: SkillSlug
  mappingKind: GeneratorSkillMappingKind
  taxonomyVersion: typeof SMART_RECOVERY_TAXONOMY_VERSION
}

const assessmentBlueprints = [
  numericalAbilityBlueprintV1,
  analyticalAbilityBlueprintV1,
  verbalAbilityBlueprintV1,
  generalInformationBlueprintV1,
] as const satisfies readonly SubjectAssessmentBlueprint[]

const registeredGenerators = getRegisteredGenerators()
const registeredByKey = new Map(
  registeredGenerators.map((generator) => [
    `${generator.slug}@${generator.version}`,
    generator,
  ]),
)

const mappingRows = assessmentBlueprints.flatMap((blueprint) =>
  blueprint.topics.flatMap((topic) =>
    topic.generators.map((config): GeneratorSkillMapping => ({
      generatorSlug: config.slug,
      generatorVersion: config.version,
      skillSlug: config.slug,
      mappingKind: config.slug.startsWith('mixed-')
        ? 'broad-mixed'
        : 'direct',
      taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
    })),
  ),
)

export const generatorSkillMappings: readonly GeneratorSkillMapping[] =
  Object.freeze(mappingRows)

export const skillDefinitions: readonly SkillDefinition[] = Object.freeze(
  assessmentBlueprints.flatMap((blueprint) =>
    blueprint.topics.flatMap((topic) =>
      topic.generators.map((config): SkillDefinition => {
        const generator = registeredByKey.get(
          `${config.slug}@${config.version}`,
        )

        return {
          slug: config.slug,
          title: generator?.title ?? config.slug,
          subjectSlug: blueprint.subjectSlug,
          topicSlug: topic.topicSlug,
          description: `Questions that exercise ${generator?.title ?? config.slug}.`,
          status: 'active',
          taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
        }
      }),
    ),
  ),
)

const skillBySlug = new Map(
  skillDefinitions.map((skill) => [skill.slug, skill]),
)
const mappingByGeneratorKey = new Map(
  generatorSkillMappings.map((mapping) => [
    `${mapping.generatorSlug}@${mapping.generatorVersion}`,
    mapping,
  ]),
)

export const ambiguousGeneratorMappings = Object.freeze(
  generatorSkillMappings.filter(
    (mapping) => mapping.mappingKind === 'broad-mixed',
  ),
)

export function getSkillDefinition(slug: SkillSlug): SkillDefinition | null {
  return skillBySlug.get(slug) ?? null
}

export function getSkillForGenerator(
  generatorSlug: GeneratorSlug,
  generatorVersion: number,
): SkillDefinition | null {
  const mapping = mappingByGeneratorKey.get(
    `${generatorSlug}@${generatorVersion}`,
  )
  return mapping === undefined
    ? null
    : getSkillDefinition(mapping.skillSlug)
}

export interface SkillTaxonomyValidationResult {
  valid: boolean
  errors: string[]
}

export function validateSkillTaxonomy(): SkillTaxonomyValidationResult {
  const errors: string[] = []
  const registeredKeys = registeredGenerators.map(
    (generator) => `${generator.slug}@${generator.version}`,
  )
  const mappedKeys = generatorSkillMappings.map(
    (mapping) => `${mapping.generatorSlug}@${mapping.generatorVersion}`,
  )
  const skillSlugs = skillDefinitions.map((skill) => skill.slug)

  for (const key of registeredKeys) {
    if (!mappingByGeneratorKey.has(key)) {
      errors.push(`Registered generator ${key} has no skill mapping.`)
    }
  }
  for (const key of mappedKeys) {
    if (!registeredByKey.has(key)) {
      errors.push(`Skill mapping ${key} has no registered generator.`)
    }
  }
  if (new Set(mappedKeys).size !== mappedKeys.length) {
    errors.push('Generator skill mappings contain duplicate generator keys.')
  }
  if (new Set(skillSlugs).size !== skillSlugs.length) {
    errors.push('Skill definitions contain duplicate slugs.')
  }
  for (const mapping of generatorSkillMappings) {
    if (!skillBySlug.has(mapping.skillSlug)) {
      errors.push(
        `Generator ${mapping.generatorSlug}@${mapping.generatorVersion} references missing skill ${mapping.skillSlug}.`,
      )
    }
  }
  for (const skill of skillDefinitions) {
    if (skill.title.trim() === '' || skill.topicSlug.trim() === '') {
      errors.push(`Skill ${skill.slug} has incomplete learner-facing metadata.`)
    }
    if (skill.taxonomyVersion !== SMART_RECOVERY_TAXONOMY_VERSION) {
      errors.push(`Skill ${skill.slug} has an unexpected taxonomy version.`)
    }
  }

  return { valid: errors.length === 0, errors }
}

