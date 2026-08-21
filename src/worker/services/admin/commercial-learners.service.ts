import { addUtcDays } from '../../domain/commercial-access'
import type {
  AdminExtendAccessInput,
  AdminGrantAccessInput,
  AdminRevokeAccessInput,
} from '../../schemas/commercial.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'
import {
  listLearnerPaymentRequests,
  type CommercialPaymentRequest,
} from '../commercial.service'

interface LearnerRow {
  internal_id: number
  public_id: string
  first_name: string
  last_name: string
  email: string
  status: 'active' | 'suspended'
  created_at: string
  last_active_at: string | null
  enrollment_status: string | null
  enrollment_expires_at: string | null
  entitlement_access_type: 'PREMIUM' | 'TESTER' | null
  entitlement_status: 'active' | 'expired' | 'revoked' | 'refunded' | null
  entitlement_starts_at: string | null
  entitlement_expires_at: string | null
  entitlement_plan_slug: string | null
  entitlement_plan_name: string | null
  entitlement_source: 'tester' | 'admin' | 'payment' | null
  completed_lessons: number
  total_lessons: number
}

interface PlanRow {
  id: number
  slug: string
  access_type: 'PREMIUM' | 'TESTER'
  duration_days: number | null
}

const adminLearnerSelect = `SELECT
  users.id AS internal_id,
  users.public_id,
  users.first_name,
  users.last_name,
  users.email,
  users.status,
  users.created_at,
  users.last_active_at,
  course_enrollments.enrollment_status,
  course_enrollments.access_expires_at AS enrollment_expires_at,
  commercial_entitlements.access_type AS entitlement_access_type,
  commercial_entitlements.status AS entitlement_status,
  commercial_entitlements.starts_at AS entitlement_starts_at,
  commercial_entitlements.expires_at AS entitlement_expires_at,
  subscription_plans.slug AS entitlement_plan_slug,
  subscription_plans.name AS entitlement_plan_name,
  subscriptions.grant_source AS entitlement_source,
  (SELECT COUNT(*)
    FROM lesson_progress
    INNER JOIN lessons ON lessons.id = lesson_progress.lesson_id
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    WHERE lesson_progress.user_id = users.id
      AND lesson_progress.status = 'completed'
      AND lessons.status = 'published'
      AND lessons.is_preview = 0
      AND subjects.course_id = courses.id
  ) AS completed_lessons,
  (SELECT COUNT(*)
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    WHERE lessons.status = 'published'
      AND lessons.is_preview = 0
      AND subjects.course_id = courses.id
  ) AS total_lessons
FROM users
LEFT JOIN courses ON courses.slug = 'cse-professional'
LEFT JOIN course_enrollments
  ON course_enrollments.user_id = users.id
  AND course_enrollments.course_id = courses.id
LEFT JOIN commercial_entitlements
  ON commercial_entitlements.id = (
    SELECT candidate.id
    FROM commercial_entitlements AS candidate
    WHERE candidate.user_id = users.id
    ORDER BY
      CASE
        WHEN candidate.status = 'active'
          AND datetime(candidate.starts_at) <= CURRENT_TIMESTAMP
          AND datetime(candidate.expires_at) > CURRENT_TIMESTAMP
        THEN 0 ELSE 1 END,
      datetime(candidate.expires_at) DESC,
      candidate.id DESC
    LIMIT 1
  )
LEFT JOIN subscriptions
  ON subscriptions.id = commercial_entitlements.subscription_id
LEFT JOIN subscription_plans
  ON subscription_plans.id = subscriptions.plan_id`

export interface AdminLearnerSummary {
  id: string
  name: string
  email: string
  accountStatus: 'active' | 'suspended'
  registeredAt: string
  lastActiveAt: string | null
  online: boolean
  currentAccess: 'FREE' | 'PREMIUM' | 'TESTER' | 'EXPIRED'
  accessExpiresAt: string | null
  enrollmentStatus: string | null
  enrollmentExpiresAt: string | null
  courseProgressPercent: number
}

function learnerAccess(
  row: LearnerRow,
  now: Date,
): 'FREE' | 'PREMIUM' | 'TESTER' | 'EXPIRED' {
  if (
    row.entitlement_access_type !== null &&
    row.entitlement_status === 'active' &&
    row.entitlement_starts_at !== null &&
    row.entitlement_expires_at !== null &&
    Date.parse(row.entitlement_starts_at) <= now.getTime() &&
    now.getTime() < Date.parse(row.entitlement_expires_at)
  ) {
    return row.entitlement_access_type
  }
  return row.entitlement_access_type === null ? 'FREE' : 'EXPIRED'
}

function mapAdminLearner(row: LearnerRow, now: Date): AdminLearnerSummary {
  return {
    id: row.public_id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    accountStatus: row.status,
    registeredAt: row.created_at,
    lastActiveAt: row.last_active_at,
    online:
      row.last_active_at !== null &&
      Date.parse(row.last_active_at) >= now.getTime() - 5 * 60 * 1000,
    currentAccess: learnerAccess(row, now),
    accessExpiresAt: row.entitlement_expires_at,
    enrollmentStatus: row.enrollment_status,
    enrollmentExpiresAt: row.enrollment_expires_at,
    courseProgressPercent:
      row.total_lessons === 0
        ? 0
        : Math.round((row.completed_lessons / row.total_lessons) * 100),
  }
}

export async function listAdminLearners(
  database: D1Database,
  input: {
    query?: string
    access?: 'FREE' | 'PREMIUM' | 'TESTER' | 'EXPIRED'
  },
): Promise<AdminLearnerSummary[]> {
  const result = await database
    .prepare(`${adminLearnerSelect}
      WHERE users.role = 'student'
      ORDER BY users.created_at DESC, users.id DESC`)
    .all<LearnerRow>()
  const now = new Date()
  const query = input.query?.toLocaleLowerCase()
  return result.results
    .map((row) => mapAdminLearner(row, now))
    .filter(
      (learner) =>
        (input.access === undefined || learner.currentAccess === input.access) &&
        (query === undefined ||
          learner.name.toLocaleLowerCase().includes(query) ||
          learner.email.toLocaleLowerCase().includes(query)),
    )
}

async function findLearnerRow(
  database: D1Database,
  publicId: string,
): Promise<LearnerRow | null> {
  return database
    .prepare(`${adminLearnerSelect}
      WHERE users.role = 'student' AND users.public_id = ?1
      LIMIT 1`)
    .bind(publicId)
    .first<LearnerRow>()
}

export interface AdminLearnerDetail {
  learner: AdminLearnerSummary
  access: {
    planSlug: string | null
    planName: string | null
    source: string | null
    startsAt: string | null
    expiresAt: string | null
    status: 'FREE' | 'PREMIUM' | 'TESTER' | 'EXPIRED'
  }
  payments: CommercialPaymentRequest[]
}

export async function getAdminLearnerDetail(
  database: D1Database,
  publicId: string,
): Promise<AdminLearnerDetail> {
  const row = await findLearnerRow(database, publicId)
  if (row === null) {
    throw new AppError(404, 'LEARNER_NOT_FOUND', 'Learner account not found.')
  }
  return {
    learner: mapAdminLearner(row, new Date()),
    access: {
      planSlug: row.entitlement_plan_slug,
      planName: row.entitlement_plan_name,
      source: row.entitlement_source,
      startsAt: row.entitlement_starts_at,
      expiresAt: row.entitlement_expires_at,
      status: learnerAccess(row, new Date()),
    },
    payments: await listLearnerPaymentRequests(database, row.internal_id),
  }
}

export async function grantAdminAccess(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  learnerPublicId: string,
  input: AdminGrantAccessInput,
  requestId: string,
): Promise<AdminLearnerDetail> {
  const [learner, plan] = await Promise.all([
    findLearnerRow(database, learnerPublicId),
    database
      .prepare(
        `SELECT id, slug, access_type, duration_days
        FROM subscription_plans
        WHERE slug = ?1 AND active = 1 AND duration_type = 'fixed_days'
        LIMIT 1`,
      )
      .bind(input.planSlug)
      .first<PlanRow>(),
  ])
  if (learner === null) {
    throw new AppError(404, 'LEARNER_NOT_FOUND', 'Learner account not found.')
  }
  if (plan === null || plan.duration_days === null) {
    throw new AppError(404, 'PLAN_NOT_FOUND', 'Subscription plan not found.')
  }
  const startsAt = new Date()
  const durationDays = input.durationDays ?? plan.duration_days
  const expiresAt = addUtcDays(startsAt, durationDays)
  const source = plan.access_type === 'TESTER' ? 'tester' : 'admin'
  const changedAt = startsAt.toISOString()
  const subscriptionPublicId = crypto.randomUUID()

  await database.batch([
    database
      .prepare(
        `UPDATE commercial_entitlements
        SET status = 'revoked', updated_at = ?1
        WHERE user_id = ?2 AND status = 'active'`,
      )
      .bind(changedAt, learner.internal_id),
    database
      .prepare(
        `UPDATE subscriptions
        SET status = 'revoked', revoked_at = ?1, updated_at = ?1
        WHERE user_id = ?2 AND status = 'active'`,
      )
      .bind(changedAt, learner.internal_id),
    database
      .prepare(
        `INSERT INTO subscriptions(
          public_id, user_id, plan_id, access_type, status,
          grant_source, starts_at, expires_at, granted_by_user_id
        ) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6, ?7, ?8)`,
      )
      .bind(
        subscriptionPublicId,
        learner.internal_id,
        plan.id,
        plan.access_type,
        source,
        changedAt,
        expiresAt.toISOString(),
        actor.internalUserId,
      ),
    database
      .prepare(
        `INSERT INTO commercial_entitlements(
          public_id, user_id, subscription_id, access_type,
          entitlement_key, status, starts_at, expires_at
        ) VALUES (
          ?1, ?2,
          (SELECT id FROM subscriptions WHERE public_id = ?3),
          ?4, 'premium_suite', 'active', ?5, ?6
        )`,
      )
      .bind(
        crypto.randomUUID(),
        learner.internal_id,
        subscriptionPublicId,
        plan.access_type,
        changedAt,
        expiresAt.toISOString(),
      ),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (?1, ?2, 'user', ?3, ?4)`,
      )
      .bind(
        actor.internalUserId,
        plan.access_type === 'TESTER'
          ? 'commercial.tester_granted'
          : 'commercial.premium_granted',
        learnerPublicId,
        JSON.stringify({
          planSlug: plan.slug,
          durationDays,
          expiresAt: expiresAt.toISOString(),
          revenueMinor: 0,
          requestId,
        }),
      ),
  ])
  return getAdminLearnerDetail(database, learnerPublicId)
}

export async function extendAdminAccess(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  learnerPublicId: string,
  input: AdminExtendAccessInput,
  requestId: string,
): Promise<AdminLearnerDetail> {
  const learner = await findLearnerRow(database, learnerPublicId)
  if (
    learner === null ||
    learner.entitlement_expires_at === null ||
    learner.entitlement_status !== 'active'
  ) {
    throw new AppError(
      409,
      'ACTIVE_ACCESS_REQUIRED',
      'The learner does not have active commercial access to extend.',
    )
  }
  const currentExpiry = new Date(learner.entitlement_expires_at)
  const now = new Date()
  const base = currentExpiry.getTime() > now.getTime() ? currentExpiry : now
  const expiresAt = addUtcDays(base, input.additionalDays).toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE subscriptions
        SET expires_at = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT subscription_id FROM commercial_entitlements
          WHERE user_id = ?2 AND status = 'active'
          ORDER BY id DESC LIMIT 1
        )`,
      )
      .bind(expiresAt, learner.internal_id),
    database
      .prepare(
        `UPDATE commercial_entitlements
        SET expires_at = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?2 AND status = 'active'`,
      )
      .bind(expiresAt, learner.internal_id),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (?1, 'commercial.access_extended', 'user', ?2, ?3)`,
      )
      .bind(
        actor.internalUserId,
        learnerPublicId,
        JSON.stringify({
          additionalDays: input.additionalDays,
          expiresAt,
          requestId,
        }),
      ),
  ])
  return getAdminLearnerDetail(database, learnerPublicId)
}

export async function revokeAdminAccess(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  learnerPublicId: string,
  input: AdminRevokeAccessInput,
  requestId: string,
): Promise<AdminLearnerDetail> {
  const learner = await findLearnerRow(database, learnerPublicId)
  if (learner === null) {
    throw new AppError(404, 'LEARNER_NOT_FOUND', 'Learner account not found.')
  }
  const revokedAt = new Date().toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE commercial_entitlements
        SET status = 'revoked', updated_at = ?1
        WHERE user_id = ?2 AND status = 'active'`,
      )
      .bind(revokedAt, learner.internal_id),
    database
      .prepare(
        `UPDATE subscriptions
        SET status = 'revoked', revoked_at = ?1, updated_at = ?1
        WHERE user_id = ?2 AND status = 'active'`,
      )
      .bind(revokedAt, learner.internal_id),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (?1, 'commercial.access_revoked', 'user', ?2, ?3)`,
      )
      .bind(
        actor.internalUserId,
        learnerPublicId,
        JSON.stringify({ reason: input.reason, requestId }),
      ),
  ])
  return getAdminLearnerDetail(database, learnerPublicId)
}

interface BusinessMetricsRow {
  total_registered: number
  new_today: number
  new_week: number
  new_month: number
  online_now: number
  active_premium: number
  tester_accounts: number
  free_learners: number
  expiring_soon: number
  expired_access: number
  pending_verification: number
  approved_payments: number
  rejected_payments: number
  refunded_payments: number
  revenue_today: number
  revenue_week: number
  revenue_month: number
  revenue_all_time: number
  paid_customers: number
  approved_paid_transactions: number
}

export async function getBusinessOverview(database: D1Database) {
  const row = await database
    .prepare(
      `WITH learner_access AS (
        SELECT
          users.id, users.created_at, users.last_active_at,
          commercial_entitlements.access_type,
          commercial_entitlements.status AS entitlement_status,
          commercial_entitlements.expires_at
        FROM users
        LEFT JOIN commercial_entitlements
          ON commercial_entitlements.id = (
            SELECT candidate.id
            FROM commercial_entitlements AS candidate
            WHERE candidate.user_id = users.id
            ORDER BY
              CASE WHEN candidate.status = 'active'
                AND datetime(candidate.starts_at) <= CURRENT_TIMESTAMP
                AND datetime(candidate.expires_at) > CURRENT_TIMESTAMP
              THEN 0 ELSE 1 END,
              datetime(candidate.expires_at) DESC, candidate.id DESC
            LIMIT 1
          )
        WHERE users.role = 'student'
      ), revenue_payments AS (
        SELECT payments.id, payment_requests.user_id,
          payments.amount_minor, payments.verified_at
        FROM payments
        INNER JOIN payment_requests
          ON payment_requests.id = payments.payment_request_id
        INNER JOIN subscription_plans
          ON subscription_plans.id = payment_requests.plan_id
        WHERE payments.status = 'approved'
          AND payments.amount_minor > 0
          AND subscription_plans.counts_as_revenue = 1
      )
      SELECT
        (SELECT COUNT(*) FROM learner_access) AS total_registered,
        (SELECT COUNT(*) FROM learner_access WHERE date(created_at) = date('now')) AS new_today,
        (SELECT COUNT(*) FROM learner_access
          WHERE date(created_at) >= date('now', '-' || ((CAST(strftime('%w','now') AS INTEGER) + 6) % 7) || ' days')) AS new_week,
        (SELECT COUNT(*) FROM learner_access
          WHERE date(created_at) >= date('now', 'start of month')) AS new_month,
        (SELECT COUNT(*) FROM learner_access
          WHERE datetime(last_active_at) >= datetime('now', '-5 minutes')) AS online_now,
        (SELECT COUNT(*) FROM learner_access
          WHERE access_type = 'PREMIUM' AND entitlement_status = 'active'
            AND datetime(expires_at) > CURRENT_TIMESTAMP) AS active_premium,
        (SELECT COUNT(*) FROM learner_access
          WHERE access_type = 'TESTER' AND entitlement_status = 'active'
            AND datetime(expires_at) > CURRENT_TIMESTAMP) AS tester_accounts,
        (SELECT COUNT(*) FROM learner_access WHERE access_type IS NULL) AS free_learners,
        (SELECT COUNT(*) FROM learner_access
          WHERE entitlement_status = 'active'
            AND datetime(expires_at) > CURRENT_TIMESTAMP
            AND datetime(expires_at) <= datetime('now', '+7 days')) AS expiring_soon,
        (SELECT COUNT(*) FROM learner_access
          WHERE access_type IS NOT NULL
            AND NOT (entitlement_status = 'active' AND datetime(expires_at) > CURRENT_TIMESTAMP)) AS expired_access,
        (SELECT COUNT(*) FROM payments WHERE status IN ('proof_submitted', 'under_review')) AS pending_verification,
        (SELECT COUNT(*) FROM payments WHERE status = 'approved') AS approved_payments,
        (SELECT COUNT(*) FROM payments WHERE status = 'rejected') AS rejected_payments,
        (SELECT COUNT(*) FROM payments WHERE status = 'refunded') AS refunded_payments,
        (SELECT COALESCE(SUM(amount_minor), 0) FROM revenue_payments
          WHERE date(verified_at) = date('now')) AS revenue_today,
        (SELECT COALESCE(SUM(amount_minor), 0) FROM revenue_payments
          WHERE date(verified_at) >= date('now', '-' || ((CAST(strftime('%w','now') AS INTEGER) + 6) % 7) || ' days')) AS revenue_week,
        (SELECT COALESCE(SUM(amount_minor), 0) FROM revenue_payments
          WHERE date(verified_at) >= date('now', 'start of month')) AS revenue_month,
        (SELECT COALESCE(SUM(amount_minor), 0) FROM revenue_payments) AS revenue_all_time,
        (SELECT COUNT(DISTINCT user_id) FROM revenue_payments) AS paid_customers,
        (SELECT COUNT(*) FROM revenue_payments) AS approved_paid_transactions`,
    )
    .first<BusinessMetricsRow>()
  if (row === null) throw new Error('Business metrics could not be loaded.')
  return {
    students: {
      totalRegistered: row.total_registered,
      newToday: row.new_today,
      newThisWeek: row.new_week,
      newThisMonth: row.new_month,
    },
    online: { onlineNow: row.online_now, definitionMinutes: 5 as const },
    access: {
      activePremium: row.active_premium,
      testerAccounts: row.tester_accounts,
      freeLearners: row.free_learners,
      expiringSoon: row.expiring_soon,
      expired: row.expired_access,
    },
    payments: {
      pendingVerification: row.pending_verification,
      approved: row.approved_payments,
      rejected: row.rejected_payments,
      refunded: row.refunded_payments,
    },
    revenue: {
      currency: 'PHP' as const,
      todayMinor: row.revenue_today,
      thisWeekMinor: row.revenue_week,
      thisMonthMinor: row.revenue_month,
      allTimeMinor: row.revenue_all_time,
      paidCustomers: row.paid_customers,
      approvedPaidTransactions: row.approved_paid_transactions,
    },
  }
}
