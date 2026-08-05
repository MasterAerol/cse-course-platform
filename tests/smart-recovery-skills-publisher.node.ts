import { spawnSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  LOCAL_CONFIRMATION,
  buildCanonicalSkillMutationSql,
  planCanonicalSkillChanges,
  resolveCanonicalSkills,
  validateCanonicalTaxonomy,
  type ExistingSkillRow,
  type PublisherCatalog,
  type PublisherSource,
} from '../scripts/smart-recovery-skills-publisher-lib.mjs'
import { parsePublisherArguments } from '../scripts/create-and-publish-smart-recovery-skills.mjs'

const source: PublisherSource = {
  taxonomyVersion: 1,
  skills: [{
    slug: 'percent-of-number',
    title: 'Percent of a Number',
    subjectSlug: 'numerical-ability',
    topicSlug: 'percentages',
    description: 'Questions that exercise Percent of a Number.',
    status: 'active',
    taxonomyVersion: 1,
  }],
  mappings: [{
    generatorSlug: 'percent-of-number',
    generatorVersion: 1,
    skillSlug: 'percent-of-number',
    taxonomyVersion: 1,
  }],
  sourceValidation: { valid: true, errors: [] },
}

const catalog: PublisherCatalog = {
  courses: [{ id: 1, slug: 'cse-professional' }],
  subjects: [{ id: 2, slug: 'numerical-ability' }],
  topics: [{ id: 3, slug: 'percentages', subject_slug: 'numerical-ability', subject_id: 2 }],
  lessons: [],
}

const matchingRow: ExistingSkillRow = {
  public_id: 'skill-existing',
  slug: 'percent-of-number',
  taxonomy_version: 1,
  subject_id: 2,
  topic_id: 3,
  related_lesson_id: null,
  title: 'Percent of a Number',
  description: 'Questions that exercise Percent of a Number.',
  status: 'active',
}

describe('Smart Recovery canonical-skills publisher', () => {
  it('loads and validates the authoritative TypeScript taxonomy without a copied skill list', () => {
    const script = fileURLToPath(new URL('../scripts/create-and-publish-smart-recovery-skills.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [script, '--validate-only'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      encoding: 'utf8',
      shell: false,
      timeout: 30_000,
    })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toMatch(/SMART_RECOVERY_SKILLS_VALID taxonomy_version=1 skills=290 active=290 deprecated=0 generator_mappings=290/u)
  }, 35_000)

  it('requires an explicit mode and environment-specific confirmation before writes', () => {
    expect(() => parsePublisherArguments([])).toThrow(/exactly one mode/u)
    expect(() => parsePublisherArguments(['--publish', '--local'])).toThrow(LOCAL_CONFIRMATION)
    expect(() => parsePublisherArguments(['--publish', '--remote', '--confirm', LOCAL_CONFIRMATION])).toThrow(/production/u)
    expect(parsePublisherArguments(['--dry-run'])).toMatchObject({ mode: 'dry-run', target: 'local' })
    expect(parsePublisherArguments(['--validate-only'])).toMatchObject({ mode: 'validate-only' })
  })

  it('rejects invalid, duplicate, missing, and deprecated generator skill references before database work', () => {
    expect(() => validateCanonicalTaxonomy({
      ...source,
      skills: [{ ...source.skills[0], status: 'deprecated' }],
    })).toThrow(/deprecated skill/u)
    expect(() => validateCanonicalTaxonomy({
      ...source,
      skills: [source.skills[0], source.skills[0]],
    })).toThrow(/duplicated/u)
    expect(() => validateCanonicalTaxonomy({
      ...source,
      mappings: [{ ...source.mappings[0], skillSlug: 'missing-skill' }],
    })).toThrow(/missing skill/u)
  })

  it('resolves stable subject and topic slugs and rejects ownership mismatches', () => {
    const result = resolveCanonicalSkills(source, catalog)
    expect(result.resolved).toEqual([expect.objectContaining({ subjectId: 2, topicId: 3, relatedLessonId: null })])
    expect(() => resolveCanonicalSkills(source, {
      ...catalog,
      topics: [{ ...catalog.topics[0], subject_id: 999 }],
    })).toThrow(/does not belong/u)
    expect(() => resolveCanonicalSkills(source, { ...catalog, subjects: [] })).toThrow(/missing subject/u)
  })

  it('creates missing skills, updates only mutable drift, and preserves unmanaged rows', () => {
    const resolved = resolveCanonicalSkills(source, catalog).resolved
    const createPlan = planCanonicalSkillChanges(resolved, [], () => 'skill-created')
    expect(createPlan).toMatchObject({ created: 1, updated: 0, unchanged: 0, existingUnmanagedCount: 0 })
    expect(createPlan.changes[0]).toMatchObject({ kind: 'create', publicId: 'skill-created' })

    const updatePlan = planCanonicalSkillChanges(
      resolved,
      [{ ...matchingRow, title: 'Stale title' }, { ...matchingRow, slug: 'legacy-skill', public_id: 'skill-legacy' }],
      () => 'unused',
    )
    expect(updatePlan).toMatchObject({ created: 0, updated: 1, unchanged: 0, existingUnmanagedCount: 1 })
    expect(updatePlan.changes[0]).toMatchObject({ kind: 'update', publicId: 'skill-existing', slug: 'percent-of-number' })
  })

  it('is idempotent when canonical mutable fields already match', () => {
    const resolved = resolveCanonicalSkills(source, catalog).resolved
    const plan = planCanonicalSkillChanges(resolved, [matchingRow], () => 'must-not-be-used')
    expect(plan).toMatchObject({ created: 0, updated: 0, unchanged: 1 })
    expect(plan.changes).toEqual([])
    expect(buildCanonicalSkillMutationSql(plan)).toBeNull()
  })

  it('generates a transaction scoped exclusively to skills without deletes or slug updates', () => {
    const resolved = resolveCanonicalSkills(source, catalog).resolved
    const plan = planCanonicalSkillChanges(resolved, [], () => "skill-safe'id")
    const sql = buildCanonicalSkillMutationSql(plan)
    expect(sql).not.toBeNull()
    expect(sql).toContain("'skill-safe''id'")
    expect(sql).toContain('INSERT INTO skills')
    expect(sql).toContain('ON CONFLICT(slug) DO UPDATE SET')
    expect(sql).not.toMatch(/DELETE|UPDATE\s+skills|slug\s*=\s*excluded\.slug/iu)
    expect(sql).not.toMatch(/practice_question_skills|quiz_question_skills|recovery_attempts|recovery_question_snapshots|recovery_question_choices|recovery_answers/u)
  })
})
