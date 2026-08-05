import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

interface MigrationEnv extends Cloudflare.Env {
  FRESH_MIGRATION_TEST_DB: D1Database
  UPGRADE_MIGRATION_TEST_DB: D1Database
  TEST_MIGRATIONS: D1Migration[]
}
const testEnv = env as MigrationEnv
const fresh = testEnv.FRESH_MIGRATION_TEST_DB
const upgrade = testEnv.UPGRADE_MIGRATION_TEST_DB
let subjectId = 0, topicId = 0, lessonId = 0, practiceQuestionId = 0, quizQuestionId = 0

async function id(db: D1Database, sql: string): Promise<number> {
  const row = await db.prepare(sql).first<{ id: number }>()
  if (row === null) throw new Error(`Fixture missing for ${sql}`)
  return row.id
}
async function addUser(db: D1Database, key: string): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO users(public_id,email,password_hash,first_name,last_name)
     VALUES(?1,?2,'test-only','Recovery','Learner')`,
  ).bind(`user-${key}`, `${key}@example.test`).run()
  return Number(result.meta.last_row_id)
}
async function addSkill(db: D1Database, slug: string): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO skills(public_id,slug,taxonomy_version,subject_id,topic_id,related_lesson_id,title)
     VALUES(?1,?2,1,?3,?4,?5,?6)`,
  ).bind(`skill-${slug}`, slug, subjectId, topicId, lessonId, `Skill ${slug}`).run()
  return Number(result.meta.last_row_id)
}
async function addAttempt(db: D1Database, key: string, userId: number, count = 1): Promise<number> {
  const courseId = await id(db, "SELECT id FROM courses WHERE slug='cse-professional'")
  const result = await db.prepare(
    `INSERT INTO recovery_attempts(public_id,user_id,course_id,attempt_seed,idempotency_key,
      taxonomy_version,weakness_formula_version,question_count)
     VALUES(?1,?2,?3,?4,?5,1,1,?6)`,
  ).bind(`attempt-${key}`, userId, courseId, `seed-${key}`, `idem-${key}`, count).run()
  return Number(result.meta.last_row_id)
}
async function addSnapshot(db: D1Database, key: string, attemptId: number, skillId: number, position = 1): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO recovery_question_snapshots(public_id,attempt_id,source_position,skill_id,
      skill_slug,skill_title,subject_slug,subject_title,topic_slug,topic_title,source_kind,
      generator_slug,generator_version,generator_seed,difficulty,prompt,explanation_json,parameters_json,metadata_json)
     VALUES(?1,?2,?3,?4,'finding-percentage','Finding Percentage','numerical-ability',
      'Numerical Ability','percentages','Percentages','generated','finding-percentage',1,?5,
      'easy',?6,'{}','{}','{}')`,
  ).bind(`snapshot-${key}`, attemptId, position, skillId, `gseed-${key}`, `Prompt ${key}`).run()
  return Number(result.meta.last_row_id)
}

beforeAll(async () => {
  expect(testEnv.TEST_MIGRATIONS).toHaveLength(15)
  await applyD1Migrations(fresh, testEnv.TEST_MIGRATIONS, 'fresh_migrations')
  await applyD1Migrations(upgrade, testEnv.TEST_MIGRATIONS.slice(0, 14), 'upgrade_migrations')
  subjectId = await id(fresh, "SELECT id FROM subjects WHERE slug='numerical-ability'")
  topicId = await id(fresh, "SELECT id FROM topics WHERE slug='percentages'")
  lessonId = await id(fresh, "SELECT id FROM lessons WHERE slug='finding-the-percentage'")
  practiceQuestionId = await id(fresh, 'SELECT id FROM practice_questions ORDER BY id LIMIT 1')
  quizQuestionId = await id(fresh, 'SELECT id FROM questions ORDER BY id LIMIT 1')

  const userId = await addUser(upgrade, 'upgrade')
  const courseId = await id(upgrade, "SELECT id FROM courses WHERE slug='cse-professional'")
  await upgrade.prepare('INSERT INTO course_enrollments(user_id,course_id) VALUES(?1,?2)').bind(userId, courseId).run()
  const practiceSetId = await id(upgrade, 'SELECT id FROM practice_sets ORDER BY id LIMIT 1')
  await upgrade.prepare(
    `INSERT INTO practice_attempts(public_id,practice_set_id,user_id,attempt_number,total_points)
     VALUES('upgrade-practice',?1,?2,1,5)`,
  ).bind(practiceSetId, userId).run()
  const upSubject = await id(upgrade, "SELECT id FROM subjects WHERE slug='numerical-ability'")
  const assessment = await upgrade.prepare(
    `INSERT INTO subject_assessments(public_id,subject_id,title,slug,position,question_count)
     VALUES('upgrade-assessment',?1,'Upgrade Assessment','upgrade-assessment',99,1)`,
  ).bind(upSubject).run()
  const assessmentId = Number(assessment.meta.last_row_id)
  const blueprint = await upgrade.prepare(
    `INSERT INTO subject_assessment_blueprints(assessment_id,version,total_questions,passing_score_percent)
     VALUES(?1,1,1,70)`,
  ).bind(assessmentId).run()
  await upgrade.prepare(
    `INSERT INTO subject_assessment_attempts(public_id,assessment_id,blueprint_id,user_id,
      attempt_seed,attempt_number,total_points) VALUES('upgrade-subject-attempt',?1,?2,?3,'up-sa',1,1)`,
  ).bind(assessmentId, Number(blueprint.meta.last_row_id), userId).run()
  const mock = await upgrade.prepare(
    `INSERT INTO mock_examinations(public_id,course_id,title,slug,description,simulation_label,
      position,passing_score,question_count,timed_duration_minutes,current_blueprint_version,status,source_url)
     VALUES('upgrade-mock',?1,'Upgrade Mock','upgrade-mock','test','Test Distribution',99,80,1,10,1,'draft','https://example.test')`,
  ).bind(courseId).run()
  const mockId = Number(mock.meta.last_row_id)
  const mockBlueprint = await upgrade.prepare(
    `INSERT INTO mock_exam_blueprints(mock_exam_id,version,label,total_questions,passing_score_percent,
      timed_duration_minutes,easy_count,medium_count,hard_count) VALUES(?1,1,'test',1,80,10,1,0,0)`,
  ).bind(mockId).run()
  await upgrade.prepare(
    `INSERT INTO mock_exam_attempts(public_id,mock_exam_id,blueprint_id,user_id,attempt_seed,
      attempt_number,mode,total_points) VALUES('upgrade-mock-attempt',?1,?2,?3,'up-mock',1,'untimed',1)`,
  ).bind(mockId, Number(mockBlueprint.meta.last_row_id), userId).run()
  await applyD1Migrations(upgrade, testEnv.TEST_MIGRATIONS, 'upgrade_migrations')
})

describe('0015 fresh and upgrade migration paths', () => {
  it('creates the seven empty tables, required indexes, and triggers', async () => {
    const tables = await fresh.prepare(
      "SELECT name FROM sqlite_schema WHERE type='table' AND (name='skills' OR name LIKE '%question_skills' OR name LIKE 'recovery_%')",
    ).all<{ name: string }>()
    expect(new Set(tables.results.map((row) => row.name))).toEqual(new Set([
      'skills','practice_question_skills','quiz_question_skills','recovery_attempts',
      'recovery_question_snapshots','recovery_question_choices','recovery_answers',
    ]))
    const objects = await fresh.prepare(
      "SELECT name FROM sqlite_schema WHERE type IN('index','trigger') AND (name LIKE 'idx_recovery_%' OR name LIKE 'trg_recovery_%' OR name LIKE 'idx_%question_skills%' OR name='trg_skills_slug_immutable')",
    ).all<{ name: string }>()
    expect(objects.results.length).toBeGreaterThanOrEqual(24)
    expect((await fresh.prepare('PRAGMA foreign_key_check').all()).results).toHaveLength(0)
  })

  it('preserves representative pre-0015 learner and attempt rows', async () => {
    for (const table of ['users','course_enrollments','practice_attempts','subject_assessment_attempts','mock_exam_attempts']) {
      const row = await upgrade.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<{ count: number }>()
      expect(row?.count).toBeGreaterThan(0)
    }
    for (const table of ['skills','practice_question_skills','quiz_question_skills','recovery_attempts']) {
      expect((await upgrade.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<{ count: number }>())?.count).toBe(0)
    }
    expect((await upgrade.prepare('PRAGMA foreign_key_check').all()).results).toHaveLength(0)
  })
})

describe('0015 constraints and lifecycle protections', () => {
  it('enforces skill identity, status, and primary mapping constraints', async () => {
    const skill1 = await addSkill(fresh, 'constraint-one')
    const skill2 = await addSkill(fresh, 'constraint-two')
    await expect(addSkill(fresh, 'constraint-one')).rejects.toThrow()
    await expect(fresh.prepare("UPDATE skills SET slug='renamed' WHERE id=?1").bind(skill1).run()).rejects.toThrow(/immutable/)
    await expect(fresh.prepare("UPDATE skills SET status='invalid' WHERE id=?1").bind(skill1).run()).rejects.toThrow()
    await fresh.prepare('INSERT INTO practice_question_skills VALUES(?1,?2,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(practiceQuestionId,skill1).run()
    await expect(fresh.prepare('INSERT INTO practice_question_skills VALUES(?1,?2,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(practiceQuestionId,skill2).run()).rejects.toThrow()
    await fresh.prepare('INSERT INTO quiz_question_skills VALUES(?1,?2,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(quizQuestionId,skill1).run()
    await expect(fresh.prepare('INSERT INTO quiz_question_skills VALUES(?1,?2,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(quizQuestionId,skill2).run()).rejects.toThrow()
  })

  it('enforces attempt uniqueness, active state, status, and score/count checks', async () => {
    const user = await addUser(fresh, 'attempt-rules')
    await addAttempt(fresh, 'attempt-rules', user)
    await expect(addAttempt(fresh, 'attempt-rules-2', user)).rejects.toThrow()
    const course = await id(fresh, "SELECT id FROM courses WHERE slug='cse-professional'")
    await expect(fresh.prepare(
      `INSERT INTO recovery_attempts(public_id,user_id,course_id,attempt_seed,idempotency_key,status,
       taxonomy_version,weakness_formula_version,question_count) VALUES('bad-status',?1,?2,'x','y','bad',1,1,1)`,
    ).bind(user,course).run()).rejects.toThrow()
    await expect(fresh.prepare('UPDATE recovery_attempts SET correct_count=2 WHERE user_id=?1').bind(user).run()).rejects.toThrow()
  })

  it('enforces snapshot source, position, seed, and fixed-source uniqueness', async () => {
    const user = await addUser(fresh, 'snapshot-rules')
    const skill = await addSkill(fresh, 'snapshot-rules')
    const attempt = await addAttempt(fresh, 'snapshot-rules', user, 3)
    await addSnapshot(fresh, 'snapshot-one', attempt, skill, 1)
    await expect(addSnapshot(fresh, 'snapshot-pos', attempt, skill, 1)).rejects.toThrow()
    await expect(fresh.prepare(
      `INSERT INTO recovery_question_snapshots(public_id,attempt_id,source_position,skill_id,skill_slug,skill_title,
       subject_slug,subject_title,source_kind,generator_slug,generator_version,generator_seed,prompt,explanation_json,parameters_json,metadata_json)
       VALUES('bad-source',?1,2,?2,'x','x','x','x','fixed_practice','g',1,'s','p','{}','{}','{}')`,
    ).bind(attempt,skill).run()).rejects.toThrow()
    await expect(fresh.prepare(
      `INSERT INTO recovery_question_snapshots(public_id,attempt_id,source_position,skill_id,skill_slug,skill_title,
       subject_slug,subject_title,source_kind,generator_slug,generator_version,generator_seed,prompt,explanation_json,parameters_json,metadata_json)
       VALUES('dup-seed',?1,2,?2,'x','x','x','x','generated','finding-percentage',1,'gseed-snapshot-one','p','{}','{}','{}')`,
    ).bind(attempt,skill).run()).rejects.toThrow()
  })

  it('enforces immutable snapshots/choices, answer ownership, and submission integrity', async () => {
    const user = await addUser(fresh, 'lifecycle')
    const skill = await addSkill(fresh, 'lifecycle')
    const attempt = await addAttempt(fresh, 'lifecycle', user)
    const snapshot = await addSnapshot(fresh, 'lifecycle', attempt, skill)
    const wrong = await fresh.prepare(
      "INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('life-wrong',?1,'Wrong',0,1)",
    ).bind(snapshot).run()
    const correct = await fresh.prepare(
      "INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('life-correct',?1,'Correct',1,2)",
    ).bind(snapshot).run()
    await expect(fresh.prepare("UPDATE recovery_question_snapshots SET prompt='changed' WHERE id=?1").bind(snapshot).run()).rejects.toThrow(/immutable/)
    await expect(fresh.prepare("UPDATE recovery_question_choices SET choice_text='changed' WHERE id=?1").bind(Number(wrong.meta.last_row_id)).run()).rejects.toThrow(/immutable/)
    await expect(fresh.prepare("INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('life-correct-2',?1,'Also',1,3)").bind(snapshot).run()).rejects.toThrow()
    const otherUser = await addUser(fresh, 'other-snapshot')
    const otherAttempt = await addAttempt(fresh, 'other-snapshot', otherUser)
    const otherSnapshot = await addSnapshot(fresh, 'other-snapshot', otherAttempt, skill)
    await expect(fresh.prepare(
      'INSERT INTO recovery_answers(attempt_id,snapshot_id,selected_choice_id) VALUES(?1,?2,?3)',
    ).bind(otherAttempt,otherSnapshot,Number(correct.meta.last_row_id)).run()).rejects.toThrow(/does not belong/)
    await fresh.prepare(
      "UPDATE recovery_attempts SET status='submitted',score_percent=0,submitted_at=CURRENT_TIMESTAMP WHERE id=?1",
    ).bind(attempt).run()
    await expect(fresh.prepare('INSERT INTO recovery_answers(attempt_id,snapshot_id) VALUES(?1,?2)').bind(attempt,snapshot).run()).rejects.toThrow(/not open/)
  })

  it('rejects submission without a correct choice but allows unanswered questions', async () => {
    const skill = await addSkill(fresh, 'submission')
    const badUser = await addUser(fresh, 'submission-bad')
    const badAttempt = await addAttempt(fresh, 'submission-bad', badUser)
    const badSnapshot = await addSnapshot(fresh, 'submission-bad', badAttempt, skill)
    await fresh.prepare("INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('submission-wrong',?1,'Wrong',0,1)").bind(badSnapshot).run()
    await expect(fresh.prepare("UPDATE recovery_attempts SET status='submitted',score_percent=0,submitted_at=CURRENT_TIMESTAMP WHERE id=?1").bind(badAttempt).run()).rejects.toThrow(/exactly one/)
    const goodUser = await addUser(fresh, 'submission-good')
    const goodAttempt = await addAttempt(fresh, 'submission-good', goodUser)
    const goodSnapshot = await addSnapshot(fresh, 'submission-good', goodAttempt, skill)
    await fresh.prepare("INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('submission-correct',?1,'Correct',1,1)").bind(goodSnapshot).run()
    await fresh.prepare("UPDATE recovery_attempts SET status='submitted',score_percent=0,submitted_at=CURRENT_TIMESTAMP WHERE id=?1").bind(goodAttempt).run()
    expect((await fresh.prepare('SELECT status FROM recovery_attempts WHERE id=?1').bind(goodAttempt).first<{status:string}>())?.status).toBe('submitted')
  })
})
