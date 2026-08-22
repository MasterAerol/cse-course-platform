import type {
  CreateFeedbackInput,
  FeedbackStatus,
} from '../schemas/feedback.schemas'
import type { AuthenticatedPrincipal } from '../types/auth'
import { AppError } from '../utils/app-error'

interface FeedbackRow {
  public_id: string
  user_id: number
  learner_public_id: string
  learner_first_name: string
  learner_last_name: string
  learner_email: string
  category: CreateFeedbackInput['category']
  message: string
  page_path: string
  status: FeedbackStatus
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface BetaFeedback {
  id: string
  learner: {
    id: string
    name: string
    email: string
  }
  category: CreateFeedbackInput['category']
  message: string
  pagePath: string
  status: FeedbackStatus
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

const feedbackSelect = `SELECT
  beta_feedback.public_id,
  beta_feedback.user_id,
  users.public_id AS learner_public_id,
  users.first_name AS learner_first_name,
  users.last_name AS learner_last_name,
  users.email AS learner_email,
  beta_feedback.category,
  beta_feedback.message,
  beta_feedback.page_path,
  beta_feedback.status,
  beta_feedback.reviewed_at,
  beta_feedback.created_at,
  beta_feedback.updated_at
FROM beta_feedback
INNER JOIN users ON users.id = beta_feedback.user_id`

function sanitizePlainText(value: string): string {
  return Array.from(value.normalize('NFKC'))
    .filter((character) => {
      const codePoint = character.codePointAt(0)
      return (
        codePoint === undefined ||
        !(
          codePoint <= 8 ||
          codePoint === 11 ||
          codePoint === 12 ||
          (codePoint >= 14 && codePoint <= 31) ||
          codePoint === 127
        )
      )
    })
    .join('')
    .trim()
}

function mapFeedback(row: FeedbackRow): BetaFeedback {
  return {
    id: row.public_id,
    learner: {
      id: row.learner_public_id,
      name: `${row.learner_first_name} ${row.learner_last_name}`,
      email: row.learner_email,
    },
    category: row.category,
    message: row.message,
    pagePath: row.page_path,
    status: row.status,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function findFeedback(
  database: D1Database,
  publicId: string,
): Promise<FeedbackRow | null> {
  return database
    .prepare(`${feedbackSelect}
      WHERE beta_feedback.public_id = ?1
      LIMIT 1`)
    .bind(publicId)
    .first<FeedbackRow>()
}

export async function submitLearnerFeedback(
  database: D1Database,
  userId: number,
  input: CreateFeedbackInput,
): Promise<BetaFeedback> {
  const message = sanitizePlainText(input.message)
  const pagePath = sanitizePlainText(input.pagePath)
  if (message.length < 10 || pagePath.length === 0 || !pagePath.startsWith('/')) {
    throw new AppError(
      400,
      'INVALID_FEEDBACK',
      'Enter a message of at least 10 characters and try again.',
    )
  }
  const publicId = crypto.randomUUID()
  await database
    .prepare(
      `INSERT INTO beta_feedback(public_id, user_id, category, message, page_path)
      VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(publicId, userId, input.category, message, pagePath)
    .run()
  const row = await findFeedback(database, publicId)
  if (row === null) throw new Error('Feedback submission could not be loaded.')
  return mapFeedback(row)
}

export async function listAdminFeedback(
  database: D1Database,
  status?: FeedbackStatus,
): Promise<BetaFeedback[]> {
  const result = await database
    .prepare(
      `${feedbackSelect}
      WHERE ?1 IS NULL OR beta_feedback.status = ?1
      ORDER BY
        CASE beta_feedback.status
          WHEN 'new' THEN 1
          WHEN 'reviewed' THEN 2
          ELSE 3 END,
        datetime(beta_feedback.created_at) DESC,
        beta_feedback.id DESC`,
    )
    .bind(status ?? null)
    .all<FeedbackRow>()
  return result.results.map(mapFeedback)
}

export async function updateAdminFeedbackStatus(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  publicId: string,
  status: FeedbackStatus,
): Promise<BetaFeedback> {
  const existing = await findFeedback(database, publicId)
  if (existing === null) {
    throw new AppError(404, 'FEEDBACK_NOT_FOUND', 'Feedback was not found.')
  }
  await database.batch([
    database
      .prepare(
        `UPDATE beta_feedback
        SET status = ?1,
            reviewed_by_user_id = ?2,
            reviewed_at = CASE WHEN ?1 = 'new' THEN NULL ELSE CURRENT_TIMESTAMP END,
            updated_at = CURRENT_TIMESTAMP
        WHERE public_id = ?3`,
      )
      .bind(status, actor.internalUserId, publicId),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (?1, 'beta_feedback.status_changed', 'beta_feedback', ?2, ?3)`,
      )
      .bind(actor.internalUserId, publicId, JSON.stringify({ status })),
  ])
  const updated = await findFeedback(database, publicId)
  if (updated === null) throw new Error('Feedback could not be loaded.')
  return mapFeedback(updated)
}
