import { describe, expect, it } from 'vitest'

import {
  analyticalAbilityBlueprintV1,
  generalInformationBlueprintV1,
  numericalAbilityBlueprintV1,
  verbalAbilityBlueprintV1,
} from '../src/worker/domain/subject-assessment-blueprint'
import {
  fixedQuestionMappingManifest,
  fixedQuestionSourceManifest,
} from '../src/worker/domain/smart-recovery-fixed-question-manifest'
import {
  ambiguousGeneratorMappings,
  generatorSkillMappings,
  getSkillForGenerator,
  skillDefinitions,
  SMART_RECOVERY_TAXONOMY_VERSION,
  validateSkillTaxonomy,
} from '../src/worker/domain/smart-recovery-skills'
import { getRegisteredGenerators } from '../src/worker/generators/generator.registry'

const blueprints = [
  numericalAbilityBlueprintV1,
  analyticalAbilityBlueprintV1,
  verbalAbilityBlueprintV1,
  generalInformationBlueprintV1,
]

describe('Smart Weakness Recovery skill taxonomy v1', () => {
  it('maps every active registered generator exactly once', () => {
    const registered = getRegisteredGenerators()
    const registeredKeys = registered.map(
      (generator) => `${generator.slug}@${generator.version}`,
    )
    const mappedKeys = generatorSkillMappings.map(
      (mapping) => `${mapping.generatorSlug}@${mapping.generatorVersion}`,
    )

    expect(new Set(mappedKeys)).toEqual(new Set(registeredKeys))
    expect(mappedKeys).toHaveLength(registeredKeys.length)
    expect(new Set(mappedKeys)).toHaveLength(mappedKeys.length)
    expect(skillDefinitions).toHaveLength(registered.length)
    expect(validateSkillTaxonomy()).toEqual({ valid: true, errors: [] })
  })

  it('reuses all four assessment subjects and all 33 topic ownership groups', () => {
    const expectedSubjects = new Set(blueprints.map((item) => item.subjectSlug))
    const expectedTopics = new Set(
      blueprints.flatMap((item) => item.topics.map((topic) => topic.topicSlug)),
    )

    expect(new Set(skillDefinitions.map((skill) => skill.subjectSlug))).toEqual(
      expectedSubjects,
    )
    expect(new Set(skillDefinitions.map((skill) => skill.topicSlug))).toEqual(
      expectedTopics,
    )
    expect(expectedSubjects.size).toBe(4)
    expect(expectedTopics.size).toBe(33)
  })

  it('keeps learner-facing metadata separate from stable internal slugs', () => {
    for (const generator of getRegisteredGenerators()) {
      const skill = getSkillForGenerator(generator.slug, generator.version)
      expect(skill).not.toBeNull()
      expect(skill?.slug).toBe(generator.slug)
      expect(skill?.title).toBe(generator.title)
      expect(skill?.status).toBe('active')
      expect(skill?.taxonomyVersion).toBe(SMART_RECOVERY_TAXONOMY_VERSION)
    }
  })

  it('marks mixed generators as broad mappings requiring cautious attribution', () => {
    expect(ambiguousGeneratorMappings.length).toBeGreaterThan(0)
    expect(
      ambiguousGeneratorMappings.every(
        (mapping) =>
          mapping.generatorSlug.startsWith('mixed-') &&
          mapping.mappingKind === 'broad-mixed',
      ),
    ).toBe(true)
    expect(
      generatorSkillMappings
        .filter((mapping) => !mapping.generatorSlug.startsWith('mixed-'))
        .every((mapping) => mapping.mappingKind === 'direct'),
    ).toBe(true)
  })
})

describe('fixed-question mapping manifest', () => {
  it('inventories every fixed source and position without inventing mappings', () => {
    expect(fixedQuestionSourceManifest).toHaveLength(65)
    expect(fixedQuestionMappingManifest).toHaveLength(782)
    expect(
      new Set(fixedQuestionSourceManifest.map((source) => source.sourceId)),
    ).toHaveLength(fixedQuestionSourceManifest.length)
    expect(
      new Set(fixedQuestionMappingManifest.map((item) => item.questionKey)),
    ).toHaveLength(fixedQuestionMappingManifest.length)

    for (const source of fixedQuestionSourceManifest) {
      const questions = fixedQuestionMappingManifest.filter(
        (item) => item.sourceId === source.sourceId,
      )
      expect(questions.map((item) => item.position)).toEqual(
        Array.from({ length: source.expectedQuestionCount }, (_, index) => index + 1),
      )
      expect(source.candidateSkillSlugs.length).toBeGreaterThan(0)
      expect(source.mappingStatus).toBe('pending-question-review')
      expect(source.publisherSource).toMatch(/^(migrations|scripts)\//)
      expect(questions.every((item) => item.primarySkillSlug === null)).toBe(true)
    }
  })

  it('covers every assessment topic and keeps source subjects consistent', () => {
    const expectedTopicSubjects = new Map(
      blueprints.flatMap((blueprint) =>
        blueprint.topics.map((topic) => [topic.topicSlug, blueprint.subjectSlug]),
      ),
    )

    expect(new Set(fixedQuestionSourceManifest.map((item) => item.topicSlug))).toEqual(
      new Set(expectedTopicSubjects.keys()),
    )
    for (const source of fixedQuestionSourceManifest) {
      expect(source.subjectSlug).toBe(expectedTopicSubjects.get(source.topicSlug))
      expect(
        source.candidateSkillSlugs.every((slug) =>
          skillDefinitions.some(
            (skill) => skill.slug === slug && skill.topicSlug === source.topicSlug,
          ),
        ),
      ).toBe(true)
    }
  })
})
