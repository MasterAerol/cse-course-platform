import {
  ACTIVITY_WRITE_THROTTLE_MINUTES,
  DEFAULT_COMMERCIAL_SETTINGS,
  commercialSettingKeyToProperty,
  createPaymentRequestPublicId,
  evaluateCommercialAccess,
  normalizePaymentReference,
  type CommercialAccessDecision,
  type CommercialEntitlementSnapshot,
  type CommercialFeature,
  type CommercialSettingKey,
  type CommercialSettings,
  type PaymentState,
} from '../domain/commercial-access'
import type { PaymentProofInput } from '../schemas/commercial.schemas'
import type { AuthenticatedPrincipal } from '../types/auth'
import type { RegistrationMode } from '../types/bindings'
import { AppError } from '../utils/app-error'
import {
  deletePrivateObject,
  storePaymentReceipt,
} from './receipt-storage.service'

interface CommercialSettingRow {
  setting_key: CommercialSettingKey
  enabled: 0 | 1
  description: string
  updated_at: string
}

interface PlanRow {
  id: number
  public_id: string
  slug: string
  name: string
  description: string
  currency: string
  price_minor: number
  duration_type: 'fixed_days' | 'manual'
  duration_days: number | null
  access_type: 'PREMIUM' | 'TESTER'
  active: 0 | 1
  public_visible: 0 | 1
  checkout_enabled: 0 | 1
  counts_as_revenue: 0 | 1
  created_at: string
  updated_at: string
}

interface EntitlementRow {
  access_type: 'PREMIUM' | 'TESTER'
  status: 'active' | 'expired' | 'revoked' | 'refunded'
  starts_at: string
  expires_at: string
  plan_slug: string
  grant_source: 'tester' | 'admin' | 'payment'
}

interface PaymentMethodRow {
  id: number
  public_id: string
  slug: string
  display_name: string
  account_display_name: string | null
  masked_account_info: string | null
  instructions: string
  qr_object_key: string | null
  enabled: 0 | 1
  position: number
  created_at: string
  updated_at: string
}

interface PaymentRequestRow {
  id: number
  public_id: string
  user_id: number
  learner_public_id: string
  learner_first_name: string
  learner_last_name: string
  learner_email: string
  plan_id: number
  plan_slug: string
  plan_name: string
  plan_access_type: 'PREMIUM' | 'TESTER'
  plan_duration_days: number | null
  plan_counts_as_revenue: 0 | 1
  expected_amount_minor: number
  currency: string
  status: PaymentState
  created_at: string
  proof_submitted_at: string | null
  reviewed_at: string | null
  approved_at: string | null
  rejected_at: string | null
  refunded_at: string | null
  rejection_reason_code: string | null
  rejection_note: string | null
  payment_id: number | null
  payment_public_id: string | null
  payment_status: Exclude<PaymentState, 'awaiting_payment' | 'cancelled'> | null
  payment_method_id: number | null
  payment_method_public_id: string | null
  payment_method_slug: string | null
  payment_method_name: string | null
  transaction_reference: string | null
  normalized_reference: string | null
  payer_name: string | null
  sender_last_digits: string | null
  payment_occurred_at: string | null
  learner_note: string | null
  receipt_object_key: string | null
  receipt_content_type: string | null
  receipt_size_bytes: number | null
  receipt_sha256: string | null
  submitted_at: string | null
}

const paymentRequestSelect = `SELECT
  payment_requests.id,
  payment_requests.public_id,
  payment_requests.user_id,
  users.public_id AS learner_public_id,
  users.first_name AS learner_first_name,
  users.last_name AS learner_last_name,
  users.email AS learner_email,
  payment_requests.plan_id,
  subscription_plans.slug AS plan_slug,
  subscription_plans.name AS plan_name,
  subscription_plans.access_type AS plan_access_type,
  subscription_plans.duration_days AS plan_duration_days,
  subscription_plans.counts_as_revenue AS plan_counts_as_revenue,
  payment_requests.expected_amount_minor,
  payment_requests.currency,
  payment_requests.status,
  payment_requests.created_at,
  payment_requests.proof_submitted_at,
  payment_requests.reviewed_at,
  payment_requests.approved_at,
  payment_requests.rejected_at,
  payment_requests.refunded_at,
  payment_requests.rejection_reason_code,
  payment_requests.rejection_note,
  payments.id AS payment_id,
  payments.public_id AS payment_public_id,
  payments.status AS payment_status,
  payment_proofs.payment_method_id,
  commercial_payment_methods.public_id AS payment_method_public_id,
  commercial_payment_methods.slug AS payment_method_slug,
  commercial_payment_methods.display_name AS payment_method_name,
  payment_proofs.transaction_reference,
  payment_proofs.normalized_reference,
  payment_proofs.payer_name,
  payment_proofs.sender_last_digits,
  payment_proofs.payment_occurred_at,
  payment_proofs.learner_note,
  payment_proofs.receipt_object_key,
  payment_proofs.receipt_content_type,
  payment_proofs.receipt_size_bytes,
  payment_proofs.receipt_sha256,
  payment_proofs.submitted_at
FROM payment_requests
INNER JOIN users ON users.id = payment_requests.user_id
INNER JOIN subscription_plans ON subscription_plans.id = payment_requests.plan_id
LEFT JOIN payment_proofs ON payment_proofs.payment_request_id = payment_requests.id
LEFT JOIN commercial_payment_methods
  ON commercial_payment_methods.id = payment_proofs.payment_method_id
LEFT JOIN payments ON payments.payment_request_id = payment_requests.id`

export interface CommercialPlan {
  id: string
  slug: string
  name: string
  description: string
  currency: string
  priceMinor: number
  durationType: 'fixed_days' | 'manual'
  durationDays: number | null
  accessType: 'PREMIUM' | 'TESTER'
  active: boolean
  publicVisible: boolean
  checkoutEnabled: boolean
  countsAsRevenue: boolean
  createdAt: string
  updatedAt: string
}

export interface CommercialPaymentMethod {
  id: string
  slug: string
  displayName: string
  accountDisplayName: string | null
  maskedAccountInfo: string | null
  instructions: string
  hasQr: boolean
  enabled: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface CommercialPaymentRequest {
  id: string
  learner: {
    id: string
    name: string
    email: string
    currentAccess: CommercialAccessDecision['accessType']
  }
  plan: { slug: string; name: string; accessType: 'PREMIUM' | 'TESTER' }
  expectedAmountMinor: number
  currency: string
  status: PaymentState
  createdAt: string
  proofSubmittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  refundedAt: string | null
  rejectionReason: string | null
  rejectionNote: string | null
  proof: {
    paymentMethodId: string
    paymentMethod: string
    transactionReference: string
    payerName: string | null
    senderLastDigits: string | null
    paymentOccurredAt: string
    learnerNote: string | null
    submittedAt: string
    receiptAvailable: boolean
    receiptSizeBytes: number
  } | null
  duplicateReferenceWarning: boolean
}

function mapPlan(row: PlanRow): CommercialPlan {
  return {
    id: row.public_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    currency: row.currency,
    priceMinor: row.price_minor,
    durationType: row.duration_type,
    durationDays: row.duration_days,
    accessType: row.access_type,
    active: row.active === 1,
    publicVisible: row.public_visible === 1,
    checkoutEnabled: row.checkout_enabled === 1,
    countsAsRevenue: row.counts_as_revenue === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPaymentMethod(row: PaymentMethodRow): CommercialPaymentMethod {
  return {
    id: row.public_id,
    slug: row.slug,
    displayName: row.display_name,
    accountDisplayName: row.account_display_name,
    maskedAccountInfo: row.masked_account_info,
    instructions: row.instructions,
    hasQr: row.qr_object_key !== null,
    enabled: row.enabled === 1,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function hasDuplicateReference(
  database: D1Database,
  row: PaymentRequestRow,
): Promise<boolean> {
  if (row.payment_method_id === null || row.normalized_reference === null) {
    return false
  }
  const duplicate = await database
    .prepare(
      `SELECT 1 AS duplicate_reference
      FROM payment_proofs
      WHERE payment_method_id = ?1
        AND normalized_reference = ?2
        AND payment_request_id <> ?3
      LIMIT 1`,
    )
    .bind(row.payment_method_id, row.normalized_reference, row.id)
    .first<{ duplicate_reference: number }>()
  return duplicate !== null
}

async function mapPaymentRequest(
  database: D1Database,
  row: PaymentRequestRow,
): Promise<CommercialPaymentRequest> {
  const [duplicateReferenceWarning, learnerAccess] = await Promise.all([
    hasDuplicateReference(database, row),
    getLearnerCommercialAccess(database, row.user_id),
  ])
  return {
    id: row.public_id,
    learner: {
      id: row.learner_public_id,
      name: `${row.learner_first_name} ${row.learner_last_name}`,
      email: row.learner_email,
      currentAccess: learnerAccess.accessType,
    },
    plan: {
      slug: row.plan_slug,
      name: row.plan_name,
      accessType: row.plan_access_type,
    },
    expectedAmountMinor: row.expected_amount_minor,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    proofSubmittedAt: row.proof_submitted_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    refundedAt: row.refunded_at,
    rejectionReason: row.rejection_reason_code,
    rejectionNote: row.rejection_note,
    proof:
      row.payment_method_public_id === null ||
      row.payment_method_name === null ||
      row.transaction_reference === null ||
      row.payment_occurred_at === null ||
      row.submitted_at === null ||
      row.receipt_size_bytes === null
        ? null
        : {
            paymentMethodId: row.payment_method_public_id,
            paymentMethod: row.payment_method_name,
            transactionReference: row.transaction_reference,
            payerName: row.payer_name,
            senderLastDigits: row.sender_last_digits,
            paymentOccurredAt: row.payment_occurred_at,
            learnerNote: row.learner_note,
            submittedAt: row.submitted_at,
            receiptAvailable: row.receipt_object_key !== null,
            receiptSizeBytes: row.receipt_size_bytes,
          },
    duplicateReferenceWarning,
  }
}

async function findPaymentRequestRow(
  database: D1Database,
  publicId: string,
): Promise<PaymentRequestRow | null> {
  return database
    .prepare(`${paymentRequestSelect}
      WHERE payment_requests.public_id = ?1
      LIMIT 1`)
    .bind(publicId)
    .first<PaymentRequestRow>()
}

function assertOwnedPaymentRequest(
  row: PaymentRequestRow | null,
  userId: number,
): asserts row is PaymentRequestRow {
  if (row === null || row.user_id !== userId) {
    throw new AppError(
      404,
      'PAYMENT_REQUEST_NOT_FOUND',
      'Payment request not found.',
    )
  }
}

export async function getCommercialSettings(
  database: D1Database,
): Promise<CommercialSettings> {
  const result = await database
    .prepare(
      `SELECT setting_key, enabled, description, updated_at
      FROM commercial_settings`,
    )
    .all<CommercialSettingRow>()
  const settings = { ...DEFAULT_COMMERCIAL_SETTINGS }
  for (const row of result.results) {
    settings[commercialSettingKeyToProperty(row.setting_key)] = row.enabled === 1
  }
  return settings
}

export async function getCommercialSettingsDetail(
  database: D1Database,
): Promise<{
  settings: CommercialSettings
  controls: CommercialSettingRow[]
}> {
  const result = await database
    .prepare(
      `SELECT setting_key, enabled, description, updated_at
      FROM commercial_settings
      ORDER BY CASE setting_key
        WHEN 'public_signup' THEN 1
        WHEN 'show_pricing' THEN 2
        WHEN 'public_checkout' THEN 3
        ELSE 4 END`,
    )
    .all<CommercialSettingRow>()
  return {
    settings: await getCommercialSettings(database),
    controls: result.results,
  }
}

export async function isEffectivePublicSignupEnabled(
  database: D1Database,
  deploymentMode: RegistrationMode,
): Promise<boolean> {
  if (deploymentMode !== 'open') return false
  return (await getCommercialSettings(database)).publicSignup
}

async function findLatestEntitlement(
  database: D1Database,
  userId: number,
): Promise<CommercialEntitlementSnapshot | null> {
  const row = await database
    .prepare(
      `SELECT
        commercial_entitlements.access_type,
        commercial_entitlements.status,
        commercial_entitlements.starts_at,
        commercial_entitlements.expires_at,
        subscription_plans.slug AS plan_slug,
        subscriptions.grant_source
      FROM commercial_entitlements
      INNER JOIN subscriptions
        ON subscriptions.id = commercial_entitlements.subscription_id
      INNER JOIN subscription_plans
        ON subscription_plans.id = subscriptions.plan_id
      WHERE commercial_entitlements.user_id = ?1
      ORDER BY
        CASE
          WHEN commercial_entitlements.status = 'active'
            AND datetime(commercial_entitlements.starts_at) <= CURRENT_TIMESTAMP
            AND datetime(commercial_entitlements.expires_at) > CURRENT_TIMESTAMP
          THEN 0 ELSE 1 END,
        datetime(commercial_entitlements.expires_at) DESC,
        commercial_entitlements.id DESC
      LIMIT 1`,
    )
    .bind(userId)
    .first<EntitlementRow>()
  return row === null
    ? null
    : {
        accessType: row.access_type,
        status: row.status,
        startsAt: row.starts_at,
        expiresAt: row.expires_at,
        planSlug: row.plan_slug,
        source: row.grant_source,
      }
}

export async function getLearnerCommercialAccess(
  database: D1Database,
  userId: number,
  now = new Date(),
): Promise<CommercialAccessDecision> {
  const [settings, entitlement] = await Promise.all([
    getCommercialSettings(database),
    findLatestEntitlement(database, userId),
  ])
  return evaluateCommercialAccess({
    entitlement,
    enforcementEnabled: settings.premiumAccessEnforcement,
    now,
  })
}

export async function assertCommercialFeatureAccess(
  database: D1Database,
  userId: number,
  feature: CommercialFeature,
): Promise<void> {
  const decision = await getLearnerCommercialAccess(database, userId)
  if (!decision.features[feature]) {
    throw new AppError(
      403,
      'PREMIUM_ACCESS_REQUIRED',
      'An active PasaWise Premium or Tester entitlement is required.',
    )
  }
}

export async function recordLearnerActivity(
  database: D1Database,
  principal: AuthenticatedPrincipal,
  tokenHash: string,
): Promise<void> {
  if (principal.role !== 'student') return
  await database.batch([
    database
      .prepare(
        `UPDATE users
        SET last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?1
          AND (
            last_active_at IS NULL
            OR datetime(last_active_at) <= datetime('now', ?2)
          )`,
      )
      .bind(
        principal.internalUserId,
        `-${ACTIVITY_WRITE_THROTTLE_MINUTES} minutes`,
      ),
    database
      .prepare(
        `UPDATE user_sessions
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE token_hash = ?1
          AND (
            last_used_at IS NULL
            OR datetime(last_used_at) <= datetime('now', ?2)
          )`,
      )
      .bind(tokenHash, `-${ACTIVITY_WRITE_THROTTLE_MINUTES} minutes`),
  ])
}

export async function listInternalPlans(
  database: D1Database,
): Promise<CommercialPlan[]> {
  const result = await database
    .prepare(
      `SELECT * FROM subscription_plans
      ORDER BY price_minor ASC, id ASC`,
    )
    .all<PlanRow>()
  return result.results.map(mapPlan)
}

export async function listLearnerPlans(
  database: D1Database,
): Promise<{ checkoutEnabled: boolean; showPricing: boolean; plans: CommercialPlan[] }> {
  const settings = await getCommercialSettings(database)
  if (!settings.publicCheckout || !settings.showPricing) {
    return { checkoutEnabled: false, showPricing: false, plans: [] }
  }
  const result = await database
    .prepare(
      `SELECT * FROM subscription_plans
      WHERE active = 1 AND public_visible = 1 AND checkout_enabled = 1
      ORDER BY price_minor ASC, id ASC`,
    )
    .all<PlanRow>()
  return {
    checkoutEnabled: true,
    showPricing: true,
    plans: result.results.map(mapPlan),
  }
}

export async function listPaymentMethods(
  database: D1Database,
  includeDisabled = false,
): Promise<CommercialPaymentMethod[]> {
  const result = await database
    .prepare(
      `SELECT * FROM commercial_payment_methods
      WHERE ?1 = 1 OR enabled = 1
      ORDER BY position ASC, id ASC`,
    )
    .bind(includeDisabled ? 1 : 0)
    .all<PaymentMethodRow>()
  return result.results.map(mapPaymentMethod)
}

export async function getLearnerPaymentMethodQrKey(
  database: D1Database,
  paymentMethodPublicId: string,
): Promise<string> {
  const settings = await getCommercialSettings(database)
  if (!settings.publicCheckout || !settings.showPricing) {
    throw new AppError(
      404,
      'PAYMENT_METHOD_QR_NOT_FOUND',
      'Payment method QR image not found.',
    )
  }
  const row = await database
    .prepare(
      `SELECT qr_object_key
      FROM commercial_payment_methods
      WHERE public_id = ?1
        AND enabled = 1
        AND qr_object_key IS NOT NULL
      LIMIT 1`,
    )
    .bind(paymentMethodPublicId)
    .first<{ qr_object_key: string }>()
  if (row === null) {
    throw new AppError(
      404,
      'PAYMENT_METHOD_QR_NOT_FOUND',
      'Payment method QR image not found.',
    )
  }
  return row.qr_object_key
}

export async function createLearnerPaymentRequest(
  database: D1Database,
  userId: number,
  planSlug: string,
): Promise<CommercialPaymentRequest> {
  const settings = await getCommercialSettings(database)
  if (!settings.showPricing || !settings.publicCheckout) {
    throw new AppError(
      403,
      'PUBLIC_CHECKOUT_DISABLED',
      'Public checkout is not currently available.',
    )
  }
  const plan = await database
    .prepare(
      `SELECT * FROM subscription_plans
      WHERE slug = ?1
        AND active = 1
        AND public_visible = 1
        AND checkout_enabled = 1
        AND duration_type = 'fixed_days'
      LIMIT 1`,
    )
    .bind(planSlug)
    .first<PlanRow>()
  if (plan === null) {
    throw new AppError(404, 'PLAN_NOT_FOUND', 'Subscription plan not found.')
  }

  let publicId = ''
  for (let attempt = 0; attempt < 5; attempt += 1) {
    publicId = createPaymentRequestPublicId()
    try {
      await database
        .prepare(
          `INSERT INTO payment_requests(
            public_id, user_id, plan_id, expected_amount_minor, currency
          ) VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(publicId, userId, plan.id, plan.price_minor, plan.currency)
        .run()
      break
    } catch (error: unknown) {
      if (attempt === 4) throw error
      publicId = ''
    }
  }
  if (publicId.length === 0) {
    throw new Error('A unique payment request ID could not be created.')
  }
  return getLearnerPaymentRequest(database, userId, publicId)
}

export async function getLearnerPaymentRequest(
  database: D1Database,
  userId: number,
  publicId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentRequestRow(database, publicId)
  assertOwnedPaymentRequest(row, userId)
  return mapPaymentRequest(database, row)
}

export async function listLearnerPaymentRequests(
  database: D1Database,
  userId: number,
): Promise<CommercialPaymentRequest[]> {
  const result = await database
    .prepare(`${paymentRequestSelect}
      WHERE payment_requests.user_id = ?1
      ORDER BY payment_requests.created_at DESC, payment_requests.id DESC`)
    .bind(userId)
    .all<PaymentRequestRow>()
  return Promise.all(result.results.map((row) => mapPaymentRequest(database, row)))
}

export async function submitLearnerPaymentProof(
  database: D1Database,
  bucket: R2Bucket,
  userId: number,
  paymentRequestPublicId: string,
  input: PaymentProofInput & { receipt: File },
): Promise<CommercialPaymentRequest> {
  const requestRow = await findPaymentRequestRow(database, paymentRequestPublicId)
  assertOwnedPaymentRequest(requestRow, userId)
  if (requestRow.status !== 'awaiting_payment') {
    throw new AppError(
      409,
      'PAYMENT_PROOF_NOT_ACCEPTED',
      'This payment request is not awaiting payment proof.',
    )
  }
  const method = await database
    .prepare(
      `SELECT * FROM commercial_payment_methods
      WHERE public_id = ?1 AND enabled = 1
      LIMIT 1`,
    )
    .bind(input.paymentMethodId)
    .first<PaymentMethodRow>()
  if (method === null) {
    throw new AppError(
      404,
      'PAYMENT_METHOD_NOT_FOUND',
      'Payment method not found.',
    )
  }
  const normalizedReference = normalizePaymentReference(
    input.transactionReference,
  )
  if (normalizedReference.length < 6 || normalizedReference.length > 80) {
    throw new AppError(
      400,
      'INVALID_TRANSACTION_REFERENCE',
      'Enter a valid transaction reference.',
    )
  }
  const alreadyVerified = await database
    .prepare(
      `SELECT payment_request_id
      FROM verified_payment_references
      WHERE payment_method_id = ?1 AND normalized_reference = ?2
      LIMIT 1`,
    )
    .bind(method.id, normalizedReference)
    .first<{ payment_request_id: number }>()
  if (
    alreadyVerified !== null &&
    alreadyVerified.payment_request_id !== requestRow.id
  ) {
    throw new AppError(
      409,
      'TRANSACTION_REFERENCE_ALREADY_USED',
      'This transaction reference has already been verified.',
    )
  }

  const stored = await storePaymentReceipt(bucket, {
    file: input.receipt,
    learnerPublicId: requestRow.learner_public_id,
    paymentRequestPublicId,
  })
  const submittedAt = new Date().toISOString()
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO payment_proofs(
            public_id, payment_request_id, payment_method_id,
            transaction_reference, normalized_reference, payer_name,
            sender_last_digits, payment_occurred_at, learner_note,
            receipt_object_key, receipt_content_type, receipt_size_bytes,
            receipt_sha256, submitted_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
        )
        .bind(
          crypto.randomUUID(),
          requestRow.id,
          method.id,
          input.transactionReference.trim(),
          normalizedReference,
          input.payerName ?? null,
          input.senderLastDigits ?? null,
          input.paymentOccurredAt,
          input.learnerNote ?? null,
          stored.key,
          stored.contentType,
          stored.size,
          stored.sha256,
          submittedAt,
        ),
      database
        .prepare(
          `INSERT INTO payments(
            public_id, payment_request_id, amount_minor, currency, status
          ) VALUES (?1, ?2, ?3, ?4, 'proof_submitted')`,
        )
        .bind(
          crypto.randomUUID(),
          requestRow.id,
          requestRow.expected_amount_minor,
          requestRow.currency,
        ),
      database
        .prepare(
          `UPDATE payment_requests
          SET status = 'proof_submitted',
              proof_submitted_at = ?1,
              updated_at = ?1
          WHERE id = ?2 AND status = 'awaiting_payment'`,
        )
        .bind(submittedAt, requestRow.id),
    ])
  } catch (error: unknown) {
    await deletePrivateObject(bucket, stored.key)
    throw error
  }
  return getLearnerPaymentRequest(database, userId, paymentRequestPublicId)
}

export async function cancelLearnerPaymentRequest(
  database: D1Database,
  userId: number,
  publicId: string,
): Promise<CommercialPaymentRequest> {
  const row = await findPaymentRequestRow(database, publicId)
  assertOwnedPaymentRequest(row, userId)
  if (row.status !== 'awaiting_payment') {
    throw new AppError(
      409,
      'PAYMENT_REQUEST_NOT_CANCELLABLE',
      'Only an unpaid payment request can be cancelled.',
    )
  }
  await database
    .prepare(
      `UPDATE payment_requests
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND status = 'awaiting_payment'`,
    )
    .bind(row.id)
    .run()
  return getLearnerPaymentRequest(database, userId, publicId)
}

export async function getOwnedReceiptKey(
  database: D1Database,
  userId: number,
  paymentRequestPublicId: string,
): Promise<string> {
  const row = await database
    .prepare(
      `SELECT payment_proofs.receipt_object_key
      FROM payment_proofs
      INNER JOIN payment_requests
        ON payment_requests.id = payment_proofs.payment_request_id
      WHERE payment_requests.public_id = ?1
        AND payment_requests.user_id = ?2
      LIMIT 1`,
    )
    .bind(paymentRequestPublicId, userId)
    .first<{ receipt_object_key: string }>()
  if (row === null) {
    throw new AppError(404, 'RECEIPT_NOT_FOUND', 'Receipt image not found.')
  }
  return row.receipt_object_key
}
