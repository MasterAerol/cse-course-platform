import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { describe, expect, it } from 'vitest'

const migrationRoot = path.resolve(import.meta.dirname, '..', 'migrations')
const migrations = readdirSync(migrationRoot)
  .filter((name) => /^\d{4}_.+\.sql$/u.test(name))
  .sort()
  .map((name) => ({
    name,
    sql: readFileSync(path.join(migrationRoot, name), 'utf8'),
  }))

const learnerDataTables = [
  'user_sessions',
  'course_enrollments',
  'lesson_progress',
  'practice_attempts',
  'practice_attempt_answers',
  'generated_question_snapshots',
  'generated_question_choices',
  'generated_practice_attempt_answers',
  'quiz_attempts',
  'quiz_attempt_answers',
  'subject_assessment_attempts',
  'subject_assessment_question_snapshots',
  'subject_assessment_question_choices',
  'subject_assessment_answers',
  'recovery_attempts',
  'recovery_question_snapshots',
  'recovery_question_choices',
  'recovery_answers',
  'mock_exam_attempts',
  'mock_exam_question_snapshots',
  'mock_exam_question_choices',
  'mock_exam_answers',
  'mock_exam_subject_results',
  'mock_exam_topic_results',
  'payment_requests',
  'payment_proofs',
  'payments',
  'subscriptions',
  'commercial_entitlements',
] as const

interface TableSnapshot {
  rowCount: number
  schema: string
}

function snapshotLearnerDataTables(
  database: DatabaseSync,
): Record<string, TableSnapshot> {
  const snapshot: Record<string, TableSnapshot> = {}
  for (const table of learnerDataTables) {
    const schema = database.prepare(
      "SELECT sql FROM sqlite_schema WHERE type='table' AND name=?",
    ).get(table)
    const count = database.prepare(
      `SELECT COUNT(*) AS row_count FROM "${table}"`,
    ).get()
    if (typeof schema?.sql !== 'string' || typeof count?.row_count !== 'number') {
      throw new Error(`Missing learner data table: ${table}`)
    }
    snapshot[table] = { rowCount: count.row_count, schema: schema.sql }
  }
  return snapshot
}

function scalar(database: DatabaseSync, sql: string): number {
  const value = database.prepare(sql).get()?.value
  if (typeof value !== 'number') throw new Error(`Missing scalar: ${sql}`)
  return value
}

describe('0018 direct SQLite migration compatibility', () => {
  it('preserves pre-0018 users, hashes, learner data, and foreign keys', () => {
    const database = new DatabaseSync(':memory:')
    try {
      for (const migration of migrations.slice(0, 17)) {
        database.exec(migration.sql)
      }
      database.exec(`
        INSERT INTO users(
          public_id, email, password_hash, first_name, last_name
        ) VALUES(
          'legacy-google-migration',
          'legacy-google-migration@example.test',
          'legacy-hash',
          'Legacy',
          'Learner'
        );
        INSERT INTO user_sessions(user_id,token_hash,expires_at)
        SELECT id,'legacy-google-session','2099-01-01T00:00:00.000Z'
        FROM users WHERE public_id='legacy-google-migration';
        INSERT INTO course_enrollments(
          user_id,course_id,enrollment_status,enrollment_source
        )
        SELECT users.id,courses.id,'active','free'
        FROM users,courses
        WHERE users.public_id='legacy-google-migration'
          AND courses.slug='cse-professional';
      `)
      const userId = scalar(
        database,
        "SELECT id AS value FROM users WHERE public_id='legacy-google-migration'",
      )
      const sessionId = scalar(
        database,
        "SELECT id AS value FROM user_sessions WHERE token_hash='legacy-google-session'",
      )
      const enrollmentId = scalar(
        database,
        `SELECT course_enrollments.id AS value
        FROM course_enrollments
        INNER JOIN users ON users.id=course_enrollments.user_id
        WHERE users.public_id='legacy-google-migration'`,
      )
      const learnerDataBefore = snapshotLearnerDataTables(database)

      expect(migrations[17]?.name)
        .toBe('0018_google_account_authentication.sql')
      database.exec(migrations[17]?.sql ?? '')

      expect(database.prepare(
        "SELECT id,password_hash FROM users WHERE public_id='legacy-google-migration'",
      ).get()).toEqual({ id: userId, password_hash: 'legacy-hash' })
      expect(database.prepare(
        "SELECT id,user_id FROM user_sessions WHERE token_hash='legacy-google-session'",
      ).get()).toEqual({ id: sessionId, user_id: userId })
      expect(database.prepare(
        'SELECT id,user_id FROM course_enrollments WHERE id=?',
      ).get(enrollmentId)).toEqual({ id: enrollmentId, user_id: userId })
      expect(snapshotLearnerDataTables(database)).toEqual(learnerDataBefore)
      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([])

      const passwordColumn = database.prepare(
        "SELECT \"notnull\" AS is_not_null FROM pragma_table_info('users') WHERE name='password_hash'",
      ).get()
      expect(passwordColumn).toEqual({ is_not_null: 0 })
    } finally {
      database.close()
    }
  })
})
