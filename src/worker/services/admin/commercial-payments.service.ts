import { addUtcDays, type PaymentState } from '../../domain/commercial-access'
import type { PaymentDecisionInput } from '../../schemas/commercial.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'
import {
  getLearnerPaymentRequest,
  type CommercialPaymentRequest,
} from '../commercial.service'

interface PaymentAdminRow {
  id: number
  public_id: string
  user_id: number
  learner_public_id: string
  plan_id: number
  plan_slug: string
  plan_access_type: 'PREMIUM' | 'TESTER'
  duration_days: number | null
  expected_amount_minor: number
  currency: string
  status: PaymentState
  payment_id: number | null
  payment_method_id: number | null
  normalized_reference: string | null
}

async function findPaymentAdminRow(
  database: D1Database,
  publicId: string,
): Promise<PaymentAdminRow | null> {
  return database
    .prepare(
      `SELECT
        payment_requests.id,
        payment_requests.public_id,
        payment_requests.user_id,
        users.public_id AS learner_public_id,
        payment_requests.plan_id,
        subscription_plans.slug AS plan_slug,
        subscription_plans.access_type AS plan_access_type,
        subscription_plans.duration_days,
        payment_requests.expected_amount_minor,
        payment_requests.currency,
        payment_requests.status,
        payments.id AS payment_id,
        payment_proofs.payment_method_id,
        payment_proofs.normalized_reference
      FROM payment_requests
      INNER JOIN users ON users.id = payment_requests.user_id
      INNER JOIN subscription_plans
        ON subscription_plans.id = payment_requests.plan_id
      LEFT JOIN payments ON payments.payment_request_id = payment_requests.id
      LEFT JOIN payment_proofs
        ON payment_proofs.payment_request_id = payment_requests.id
      WHERE payment_requests.public_id = ?1
      LIMIT 1`,
    )
    .bind(publicId)
    .first<PaymentAdminRow>()
}

function notFound(): AppError {
  return new AppError(
    404,
    'PAYMENT_REQUEST_NOT_FOUND',
    'Payment request not found.',
  )
}

export async function getAdminPaymentRequest(
  database: D1Database,
  publicId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentAdminRow(database, publicId)
  if (row === null) throw notFound()
  return getLearnerPaymentRequest(database, row.user_id, publicId)
}

export async function listAdminPaymentRequests(
  database: D1Database,
  status?: Exclude<PaymentState, 'awaiting_payment' | 'cancelled'>,
): Promise<CommercialPaymentRequest[]> {
  const result = await database
    .prepare(
      `SELECT public_id, user_id
      FROM payment_requests
      WHERE ?1 IS NULL OR status = ?1
      ORDER BY
        CASE status
          WHEN 'proof_submitted' THEN 1
          WHEN 'under_review' THEN 2
          ELSE 3 END,
        proof_submitted_at DESC,
        id DESC`,
    )
    .bind(status ?? null)
    .all<{ public_id: string; user_id: number }>()
  return Promise.all(
    result.results.map((row) =>
      getLearnerPaymentRequest(database, row.user_id, row.public_id),
    ),
  )
}

export async function getAdminReceiptKey(
  database: D1Database,
  paymentRequestPublicId: string,
): Promise<string> {
  const row = await database
    .prepare(
      `SELECT payment_proofs.receipt_object_key
      FROM payment_proofs
      INNER JOIN payment_requests
        ON payment_requests.id = payment_proofs.payment_request_id
      WHERE payment_requests.public_id = ?1
      LIMIT 1`,
    )
    .bind(paymentRequestPublicId)
    .first<{ receipt_object_key: string }>()
  if (row === null) {
    throw new AppError(404, 'RECEIPT_NOT_FOUND', 'Receipt image not found.')
  }
  return row.receipt_object_key
}

export async function markPaymentUnderReview(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  publicId: string,
  requestId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentAdminRow(database, publicId)
  if (row === null) throw notFound()
  if (row.status === 'under_review') {
    return getAdminPaymentRequest(database, publicId)
  }
  if (row.status !== 'proof_submitted' || row.payment_id === null) {
    throw new AppError(
      409,
      'INVALID_PAYMENT_TRANSITION',
      'Only submitted payment proof can enter review.',
    )
  }
  const reviewedAt = new Date().toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE payment_requests
        SET status = 'under_review', reviewed_at = ?1,
            reviewer_user_id = ?2, updated_at = ?1
        WHERE id = ?3 AND status = 'proof_submitted'`,
      )
      .bind(reviewedAt, actor.internalUserId, row.id),
    database
      .prepare(
        `UPDATE payments
        SET status = 'under_review', updated_at = ?1
        WHERE id = ?2 AND status = 'proof_submitted'`,
      )
      .bind(reviewedAt, row.payment_id),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        )
        SELECT ?1, 'payment.review_started', 'payment_request', ?2, ?3
        FROM payment_requests
        WHERE id = ?4 AND reviewed_at = ?5`,
      )
      .bind(
        actor.internalUserId,
        publicId,
        JSON.stringify({ requestId }),
        row.id,
        reviewedAt,
      ),
  ])
  return getAdminPaymentRequest(database, publicId)
}

export async function approvePaymentRequest(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  publicId: string,
  requestId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentAdminRow(database, publicId)
  if (row === null) throw notFound()
  if (row.status === 'approved') {
    return getAdminPaymentRequest(database, publicId)
  }
  if (
    !['proof_submitted', 'under_review'].includes(row.status) ||
    row.payment_id === null ||
    row.payment_method_id === null ||
    row.normalized_reference === null ||
    row.duration_days === null
  ) {
    throw new AppError(
      409,
      'INVALID_PAYMENT_TRANSITION',
      'This payment is not eligible for approval.',
    )
  }

  const approvedAt = new Date().toISOString()
  const expiresAt = addUtcDays(new Date(approvedAt), row.duration_days).toISOString()
  const subscriptionPublicId = crypto.randomUUID()
  const entitlementPublicId = crypto.randomUUID()
  const metadata = JSON.stringify({
    learnerId: row.learner_public_id,
    planSlug: row.plan_slug,
    amountMinor: row.expected_amount_minor,
    currency: row.currency,
    requestId,
  })

  await database.batch([
    database
      .prepare(
        `INSERT INTO verified_payment_references(
          payment_method_id, normalized_reference,
          payment_request_id, payment_id, verified_at
        ) VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(payment_method_id, normalized_reference) DO NOTHING`,
      )
      .bind(
        row.payment_method_id,
        row.normalized_reference,
        row.id,
        row.payment_id,
        approvedAt,
      ),
    database
      .prepare(
        `UPDATE payment_requests
        SET status = 'approved', approved_at = ?1,
            reviewed_at = COALESCE(reviewed_at, ?1),
            reviewer_user_id = ?2, updated_at = ?1
        WHERE id = ?3
          AND status IN ('proof_submitted', 'under_review')
          AND EXISTS (
            SELECT 1 FROM verified_payment_references
            WHERE payment_request_id = ?3 AND payment_id = ?4
          )`,
      )
      .bind(approvedAt, actor.internalUserId, row.id, row.payment_id),
    database
      .prepare(
        `UPDATE payments
        SET status = 'approved', verified_by_user_id = ?1,
            verified_at = ?2, updated_at = ?2
        WHERE id = ?3
          AND status IN ('proof_submitted', 'under_review')
          AND EXISTS (
            SELECT 1 FROM payment_requests
            WHERE id = ?4 AND status = 'approved'
          )`,
      )
      .bind(actor.internalUserId, approvedAt, row.payment_id, row.id),
    database
      .prepare(
        `UPDATE commercial_entitlements
        SET status = 'revoked', updated_at = ?1
        WHERE user_id = ?2 AND status = 'active'
          AND EXISTS (
            SELECT 1 FROM payments
            WHERE id = ?3 AND status = 'approved' AND verified_at = ?1
          )`,
      )
      .bind(approvedAt, row.user_id, row.payment_id),
    database
      .prepare(
        `UPDATE subscriptions
        SET status = 'revoked', revoked_at = ?1, updated_at = ?1
        WHERE user_id = ?2 AND status = 'active'
          AND EXISTS (
            SELECT 1 FROM payments
            WHERE id = ?3 AND status = 'approved' AND verified_at = ?1
          )`,
      )
      .bind(approvedAt, row.user_id, row.payment_id),
    database
      .prepare(
        `INSERT INTO subscriptions(
          public_id, user_id, plan_id, payment_id, access_type,
          status, grant_source, starts_at, expires_at, granted_by_user_id
        )
        SELECT ?1, ?2, ?3, ?4, ?5,
          'active', 'payment', ?6, ?7, ?8
        FROM payments
        WHERE id = ?4 AND status = 'approved' AND verified_at = ?6
        ON CONFLICT(payment_id) DO NOTHING`,
      )
      .bind(
        subscriptionPublicId,
        row.user_id,
        row.plan_id,
        row.payment_id,
        row.plan_access_type,
        approvedAt,
        expiresAt,
        actor.internalUserId,
      ),
    database
      .prepare(
        `INSERT INTO commercial_entitlements(
          public_id, user_id, subscription_id, access_type,
          entitlement_key, status, starts_at, expires_at
        )
        SELECT ?1, ?2, subscriptions.id, subscriptions.access_type,
          'premium_suite', 'active', subscriptions.starts_at, subscriptions.expires_at
        FROM subscriptions
        WHERE subscriptions.payment_id = ?3
        ON CONFLICT(subscription_id) DO NOTHING`,
      )
      .bind(entitlementPublicId, row.user_id, row.payment_id),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        )
        SELECT ?1, 'payment.approved', 'payment_request', ?2, ?3
        FROM payments
        WHERE id = ?4 AND status = 'approved' AND verified_at = ?5`,
      )
      .bind(
        actor.internalUserId,
        publicId,
        metadata,
        row.payment_id,
        approvedAt,
      ),
  ])

  const approved = await findPaymentAdminRow(database, publicId)
  if (approved?.status !== 'approved') {
    const duplicate = await database
      .prepare(
        `SELECT payment_request_id
        FROM verified_payment_references
        WHERE payment_method_id = ?1 AND normalized_reference = ?2
        LIMIT 1`,
      )
      .bind(row.payment_method_id, row.normalized_reference)
      .first<{ payment_request_id: number }>()
    if (duplicate !== null && duplicate.payment_request_id !== row.id) {
      throw new AppError(
        409,
        'DUPLICATE_TRANSACTION_REFERENCE',
        'This transaction reference has already activated another account.',
      )
    }
    throw new AppError(
      409,
      'PAYMENT_APPROVAL_FAILED',
      'Payment approval did not complete.',
    )
  }
  return getAdminPaymentRequest(database, publicId)
}

export async function rejectPaymentRequest(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  publicId: string,
  input: PaymentDecisionInput,
  requestId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentAdminRow(database, publicId)
  if (row === null) throw notFound()
  if (row.status === 'rejected') {
    return getAdminPaymentRequest(database, publicId)
  }
  if (
    !['proof_submitted', 'under_review'].includes(row.status) ||
    row.payment_id === null ||
    input.rejectionReason === undefined
  ) {
    throw new AppError(
      409,
      'INVALID_PAYMENT_TRANSITION',
      'This payment is not eligible for rejection.',
    )
  }
  const rejectedAt = new Date().toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE payment_requests
        SET status = 'rejected', rejected_at = ?1,
            reviewed_at = COALESCE(reviewed_at, ?1), reviewer_user_id = ?2,
            rejection_reason_code = ?3, rejection_note = ?4, updated_at = ?1
        WHERE id = ?5 AND status IN ('proof_submitted', 'under_review')`,
      )
      .bind(
        rejectedAt,
        actor.internalUserId,
        input.rejectionReason,
        input.note ?? null,
        row.id,
      ),
    database
      .prepare(
        `UPDATE payments
        SET status = 'rejected', verified_by_user_id = ?1,
            rejected_at = ?2, updated_at = ?2
        WHERE id = ?3 AND status IN ('proof_submitted', 'under_review')`,
      )
      .bind(actor.internalUserId, rejectedAt, row.payment_id),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        )
        SELECT ?1, 'payment.rejected', 'payment_request', ?2, ?3
        FROM payments WHERE id = ?4 AND rejected_at = ?5`,
      )
      .bind(
        actor.internalUserId,
        publicId,
        JSON.stringify({
          reason: input.rejectionReason,
          learnerId: row.learner_public_id,
          requestId,
        }),
        row.payment_id,
        rejectedAt,
      ),
  ])
  return getAdminPaymentRequest(database, publicId)
}

export async function refundPaymentRequest(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  publicId: string,
  requestId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentAdminRow(database, publicId)
  if (row === null) throw notFound()
  if (row.status === 'refunded') {
    return getAdminPaymentRequest(database, publicId)
  }
  if (row.status !== 'approved' || row.payment_id === null) {
    throw new AppError(
      409,
      'INVALID_PAYMENT_TRANSITION',
      'Only an approved payment can be refunded.',
    )
  }
  const refundedAt = new Date().toISOString()
  await database.batch([
    database
      .prepare(
        `UPDATE payment_requests
        SET status = 'refunded', refunded_at = ?1,
            reviewer_user_id = ?2, updated_at = ?1
        WHERE id = ?3 AND status = 'approved'`,
      )
      .bind(refundedAt, actor.internalUserId, row.id),
    database
      .prepare(
        `UPDATE payments
        SET status = 'refunded', refunded_at = ?1,
            verified_by_user_id = ?2, updated_at = ?1
        WHERE id = ?3 AND status = 'approved'`,
      )
      .bind(refundedAt, actor.internalUserId, row.payment_id),
    database
      .prepare(
        `UPDATE commercial_entitlements
        SET status = 'refunded', updated_at = ?1
        WHERE subscription_id IN (
          SELECT id FROM subscriptions WHERE payment_id = ?2
        ) AND status = 'active'`,
      )
      .bind(refundedAt, row.payment_id),
    database
      .prepare(
        `UPDATE subscriptions
        SET status = 'refunded', revoked_at = ?1, updated_at = ?1
        WHERE payment_id = ?2 AND status = 'active'`,
      )
      .bind(refundedAt, row.payment_id),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        )
        SELECT ?1, 'payment.refunded', 'payment_request', ?2, ?3
        FROM payments WHERE id = ?4 AND refunded_at = ?5`,
      )
      .bind(
        actor.internalUserId,
        publicId,
        JSON.stringify({ learnerId: row.learner_public_id, requestId }),
        row.payment_id,
        refundedAt,
      ),
  ])
  return getAdminPaymentRequest(database, publicId)
}
