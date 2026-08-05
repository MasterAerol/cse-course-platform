export const SMART_RECOVERY_COURSE_SLUG = 'cse-professional'
export const LOCAL_CONFIRMATION = 'publish-smart-recovery-skills-local'
export const PRODUCTION_CONFIRMATION = 'publish-smart-recovery-skills-production'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizedDescription(value) {
  return value === undefined || value === null ? null : value
}

function integer(value, label) {
  const parsed = typeof value === 'number' ? value : Number(value)
  assert(Number.isSafeInteger(parsed), `${label} must be a safe integer.`)
  return parsed
}

export function validateCanonicalTaxonomy(source) {
  const errors = [...(source.sourceValidation?.errors ?? [])]
  const taxonomyVersion = source.taxonomyVersion
  const skills = source.skills
  const mappings = source.mappings

  if (!Number.isSafeInteger(taxonomyVersion) || taxonomyVersion <= 0) {
    errors.push('The taxonomy version must be a positive integer.')
  }
  if (source.sourceValidation?.valid !== true) {
    errors.push('The authoritative taxonomy validator did not pass.')
  }
  if (!Array.isArray(skills) || skills.length === 0) {
    errors.push('The authoritative taxonomy contains no canonical skills.')
  }
  if (!Array.isArray(mappings) || mappings.length === 0) {
    errors.push('The authoritative taxonomy contains no generator mappings.')
  }

  const skillBySlug = new Map()
  for (const skill of skills ?? []) {
    if (typeof skill.slug !== 'string' || skill.slug.trim() === '') {
      errors.push('A canonical skill has an empty slug.')
      continue
    }
    if (skillBySlug.has(skill.slug)) {
      errors.push(`Canonical skill slug ${skill.slug} is duplicated.`)
    }
    skillBySlug.set(skill.slug, skill)
    if (typeof skill.title !== 'string' || skill.title.trim() === '') {
      errors.push(`Canonical skill ${skill.slug} has no learner-facing title.`)
    }
    if (typeof skill.subjectSlug !== 'string' || skill.subjectSlug.trim() === '') {
      errors.push(`Canonical skill ${skill.slug} has no subject slug.`)
    }
    if (typeof skill.topicSlug !== 'string' || skill.topicSlug.trim() === '') {
      errors.push(`Canonical skill ${skill.slug} has no topic slug.`)
    }
    if (skill.status !== 'active' && skill.status !== 'deprecated') {
      errors.push(`Canonical skill ${skill.slug} has invalid status ${String(skill.status)}.`)
    }
    if (skill.taxonomyVersion !== taxonomyVersion) {
      errors.push(`Canonical skill ${skill.slug} has taxonomy version ${String(skill.taxonomyVersion)} instead of ${String(taxonomyVersion)}.`)
    }
  }

  const mappingKeys = new Set()
  const referencedSkills = new Set()
  for (const mapping of mappings ?? []) {
    const key = `${mapping.generatorSlug}@${mapping.generatorVersion}`
    if (mappingKeys.has(key)) errors.push(`Generator mapping ${key} is duplicated.`)
    mappingKeys.add(key)
    if (!Number.isSafeInteger(mapping.generatorVersion) || mapping.generatorVersion <= 0) {
      errors.push(`Generator mapping ${key} has an invalid version.`)
    }
    if (mapping.taxonomyVersion !== taxonomyVersion) {
      errors.push(`Generator mapping ${key} has an unexpected taxonomy version.`)
    }
    const skill = skillBySlug.get(mapping.skillSlug)
    if (skill === undefined) {
      errors.push(`Generator mapping ${key} references missing skill ${mapping.skillSlug}.`)
    } else if (skill.status !== 'active') {
      errors.push(`Generator mapping ${key} unexpectedly references deprecated skill ${mapping.skillSlug}.`)
    }
    referencedSkills.add(mapping.skillSlug)
  }

  for (const skill of skills ?? []) {
    if (skill.status === 'active' && !referencedSkills.has(skill.slug)) {
      errors.push(`Active canonical skill ${skill.slug} is not referenced by a generator mapping.`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Smart Recovery taxonomy validation failed:\n- ${errors.join('\n- ')}`)
  }

  return {
    taxonomyVersion,
    skillCount: skills.length,
    mappingCount: mappings.length,
    activeSkillCount: skills.filter((skill) => skill.status === 'active').length,
    deprecatedSkillCount: skills.filter((skill) => skill.status === 'deprecated').length,
  }
}

export function resolveCanonicalSkills(source, catalog) {
  const summary = validateCanonicalTaxonomy(source)
  assert(catalog.courses.length === 1, `Expected exactly one ${SMART_RECOVERY_COURSE_SLUG} course, found ${catalog.courses.length}.`)

  const subjects = new Map()
  for (const row of catalog.subjects) {
    assert(!subjects.has(row.slug), `Subject slug ${row.slug} is duplicated in ${SMART_RECOVERY_COURSE_SLUG}.`)
    subjects.set(row.slug, { ...row, id: integer(row.id, `Subject ${row.slug} ID`) })
  }

  const topics = new Map()
  for (const row of catalog.topics) {
    const key = `${row.subject_slug}/${row.slug}`
    assert(!topics.has(key), `Topic ${key} is duplicated in ${SMART_RECOVERY_COURSE_SLUG}.`)
    topics.set(key, {
      ...row,
      id: integer(row.id, `Topic ${key} ID`),
      subject_id: integer(row.subject_id, `Topic ${key} subject ID`),
    })
  }

  const lessons = new Map()
  for (const row of catalog.lessons) {
    const key = `${row.subject_slug}/${row.topic_slug}/${row.slug}`
    assert(!lessons.has(key), `Lesson ${key} is duplicated in ${SMART_RECOVERY_COURSE_SLUG}.`)
    lessons.set(key, {
      ...row,
      id: integer(row.id, `Lesson ${key} ID`),
      topic_id: integer(row.topic_id, `Lesson ${key} topic ID`),
    })
  }

  const resolved = source.skills.map((skill) => {
    const subject = subjects.get(skill.subjectSlug)
    assert(subject !== undefined, `Canonical skill ${skill.slug} references missing subject ${skill.subjectSlug}.`)
    const topicKey = `${skill.subjectSlug}/${skill.topicSlug}`
    const topic = topics.get(topicKey)
    assert(topic !== undefined, `Canonical skill ${skill.slug} references missing topic ${topicKey}.`)
    assert(topic.subject_id === subject.id, `Topic ${topicKey} does not belong to subject ${skill.subjectSlug}.`)

    let lesson = null
    if (skill.relatedLessonSlug !== undefined) {
      const lessonKey = `${topicKey}/${skill.relatedLessonSlug}`
      lesson = lessons.get(lessonKey)
      assert(lesson !== undefined, `Canonical skill ${skill.slug} references missing lesson ${lessonKey}.`)
      assert(lesson.topic_id === topic.id, `Lesson ${lessonKey} does not belong to topic ${topicKey}.`)
    }

    return {
      slug: skill.slug,
      taxonomyVersion: skill.taxonomyVersion,
      subjectId: subject.id,
      topicId: topic.id,
      relatedLessonId: lesson?.id ?? null,
      title: skill.title,
      description: normalizedDescription(skill.description),
      status: skill.status,
    }
  })

  assert(resolved.length === summary.skillCount, `Resolved ${resolved.length} skills, but the taxonomy source contains ${summary.skillCount}.`)
  return { summary, resolved }
}

function sameMutableFields(existing, skill) {
  return integer(existing.taxonomy_version, `Skill ${skill.slug} taxonomy version`) === skill.taxonomyVersion
    && integer(existing.subject_id, `Skill ${skill.slug} subject ID`) === skill.subjectId
    && (existing.topic_id === null ? null : integer(existing.topic_id, `Skill ${skill.slug} topic ID`)) === skill.topicId
    && (existing.related_lesson_id === null ? null : integer(existing.related_lesson_id, `Skill ${skill.slug} lesson ID`)) === skill.relatedLessonId
    && existing.title === skill.title
    && normalizedDescription(existing.description) === skill.description
    && existing.status === skill.status
}

export function planCanonicalSkillChanges(resolvedSkills, existingRows, createPublicId) {
  const existingBySlug = new Map()
  for (const row of existingRows) {
    assert(typeof row.slug === 'string' && row.slug !== '', 'An existing skill row has no slug.')
    assert(!existingBySlug.has(row.slug), `Existing skill slug ${row.slug} is duplicated.`)
    existingBySlug.set(row.slug, row)
  }

  const changes = []
  let unchanged = 0
  for (const skill of resolvedSkills) {
    const existing = existingBySlug.get(skill.slug)
    if (existing === undefined) {
      changes.push({ kind: 'create', ...skill, publicId: createPublicId(skill.slug) })
    } else if (sameMutableFields(existing, skill)) {
      unchanged += 1
    } else {
      assert(typeof existing.public_id === 'string' && existing.public_id !== '', `Existing skill ${skill.slug} has no public ID.`)
      changes.push({ kind: 'update', ...skill, publicId: existing.public_id })
    }
  }

  return {
    changes,
    created: changes.filter((change) => change.kind === 'create').length,
    updated: changes.filter((change) => change.kind === 'update').length,
    unchanged,
    sourceSkillCount: resolvedSkills.length,
    existingUnmanagedCount: existingRows.filter((row) => !resolvedSkills.some((skill) => skill.slug === row.slug)).length,
  }
}

function sqlLiteral(value) {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    assert(Number.isSafeInteger(value), `Cannot serialize unsafe SQL integer ${String(value)}.`)
    return String(value)
  }
  return `'${String(value).replaceAll("'", "''")}'`
}

export function buildCanonicalSkillMutationSql(plan) {
  if (plan.changes.length === 0) return null
  const statements = plan.changes.map((skill) => `INSERT INTO skills (
  public_id, slug, taxonomy_version, subject_id, topic_id, related_lesson_id,
  title, description, status
) VALUES (
  ${sqlLiteral(skill.publicId)}, ${sqlLiteral(skill.slug)}, ${sqlLiteral(skill.taxonomyVersion)},
  ${sqlLiteral(skill.subjectId)}, ${sqlLiteral(skill.topicId)}, ${sqlLiteral(skill.relatedLessonId)},
  ${sqlLiteral(skill.title)}, ${sqlLiteral(skill.description)}, ${sqlLiteral(skill.status)}
)
ON CONFLICT(slug) DO UPDATE SET
  taxonomy_version = excluded.taxonomy_version,
  subject_id = excluded.subject_id,
  topic_id = excluded.topic_id,
  related_lesson_id = excluded.related_lesson_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;`)

  return statements.join('\n\n')
}
