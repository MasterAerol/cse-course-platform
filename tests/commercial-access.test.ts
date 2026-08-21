import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { hashPassword } from '../src/worker/auth/password'
import {
  evaluateCommercialAccess,
  normalizePaymentReference,
} from '../src/worker/domain/commercial-access'
import {
  getBusinessOverview,
  grantAdminAccess,
} from '../src/worker/services/admin/commercial-learners.service'
import {
  approvePaymentRequest,
  refundPaymentRequest,
  rejectPaymentRequest,
} from '../src/worker/services/admin/commercial-payments.service'
import {
  getAdminPaymentMethodQrKey,
  setCommercialPaymentMethodQr,
  upsertCommercialPaymentMethod,
} from '../src/worker/services/admin/commercial-settings.service'
import {
  authenticateSession,
  loginUser,
} from '../src/worker/services/auth.service'
import {
  createLearnerPaymentRequest,
  getCommercialSettings,
  getLearnerCommercialAccess,
  getLearnerPaymentRequest,
  getOwnedReceiptKey,
  isEffectivePublicSignupEnabled,
  listLearnerPaymentRequests,
  submitLearnerPaymentProof,
} from '../src/worker/services/commercial.service'
import type { AuthenticatedPrincipal } from '../src/worker/types/auth'
import { AppError } from '../src/worker/utils/app-error'

async function createUser(role: 'student' | 'admin') {
  const id = crypto.randomUUID()
  const email = `${role}-${id}@example.test`
  const password = 'CommercialPassword123'
  const inserted = await env.DB.prepare(
    `INSERT INTO users(public_id,email,password_hash,first_name,last_name,role,status)
     VALUES(?1,?2,?3,'Commercial',?4,?5,'active')`,
  ).bind(id, email, await hashPassword(password), role, role).run()
  const principal: AuthenticatedPrincipal = {
    internalUserId: Number(inserted.meta.last_row_id),
    id,
    email,
    firstName: 'Commercial',
    lastName: role,
    role,
    emailVerification: {
      verified: true,
      method: 'legacy',
    },
  }
  return { principal, email, password }
}

const metadata = { userAgent: 'commercial-test', ipAddress: '127.0.0.1' }

let paymentMethodPosition = 100

describe('PasaWise Commercial Access System v1', () => {
  it('defaults every public and enforcement control off and layers signup gates', async () => {
    await env.DB.prepare('UPDATE commercial_settings SET enabled=0').run()
    await expect(getCommercialSettings(env.DB)).resolves.toEqual({
      publicSignup: false,
      showPricing: false,
      publicCheckout: false,
      premiumAccessEnforcement: false,
    })
    await expect(isEffectivePublicSignupEnabled(env.DB, 'open')).resolves.toBe(false)
    await env.DB.prepare("UPDATE commercial_settings SET enabled=1 WHERE setting_key='public_signup'").run()
    await expect(isEffectivePublicSignupEnabled(env.DB, 'closed')).resolves.toBe(false)
    await expect(isEffectivePublicSignupEnabled(env.DB, 'open')).resolves.toBe(true)
  })

  it('distinguishes FREE, PREMIUM, TESTER, and EXPIRED without enforcement ambiguity', () => {
    const now = new Date('2026-08-21T00:00:00.000Z')
    expect(evaluateCommercialAccess({ entitlement: null, enforcementEnabled: false, now })).toMatchObject({ accessType: 'FREE', commerciallyActive: false, features: { full_mock: true } })
    expect(evaluateCommercialAccess({ entitlement: null, enforcementEnabled: true, now })).toMatchObject({ accessType: 'FREE', features: { full_mock: false } })
    for (const accessType of ['PREMIUM', 'TESTER'] as const) {
      expect(evaluateCommercialAccess({
        entitlement: { accessType, status: 'active', startsAt: '2026-08-20T00:00:00.000Z', expiresAt: '2026-08-22T00:00:00.000Z', planSlug: 'test', source: accessType === 'TESTER' ? 'tester' : 'admin' },
        enforcementEnabled: true,
        now,
      })).toMatchObject({ accessType, commerciallyActive: true, features: { full_curriculum: true } })
    }
    expect(evaluateCommercialAccess({
      entitlement: { accessType: 'PREMIUM', status: 'active', startsAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-08-20T00:00:00.000Z', planSlug: 'expired', source: 'admin' },
      enforcementEnabled: true,
      now,
    })).toMatchObject({ accessType: 'EXPIRED', commerciallyActive: false, features: { smart_recovery: false } })
  })

  it('keeps only the latest learner login active while allowing concurrent admin sessions', async () => {
    const learner = await createUser('student')
    const first = await loginUser(env.DB, learner, metadata)
    const second = await loginUser(env.DB, learner, metadata)
    await expect(authenticateSession(env.DB, first.sessionToken)).rejects.toMatchObject({ code: 'SESSION_REPLACED' })
    await expect(authenticateSession(env.DB, second.sessionToken)).resolves.toMatchObject({ id: learner.principal.id })

    const admin = await createUser('admin')
    const adminFirst = await loginUser(env.DB, admin, metadata)
    const adminSecond = await loginUser(env.DB, admin, metadata)
    await expect(authenticateSession(env.DB, adminFirst.sessionToken)).resolves.toMatchObject({ id: admin.principal.id })
    await expect(authenticateSession(env.DB, adminSecond.sessionToken)).resolves.toMatchObject({ id: admin.principal.id })
  })

  it('grants tester access without changing learning records or counting revenue', async () => {
    const [admin, learner] = await Promise.all([createUser('admin'), createUser('student')])
    const revenueBefore = await getBusinessOverview(env.DB)
    const enrollmentBefore = await env.DB.prepare('SELECT enrollment_status FROM course_enrollments WHERE user_id=?1').bind(learner.principal.internalUserId).first()
    const before = await env.DB.prepare('SELECT COUNT(*) AS value FROM lesson_progress WHERE user_id=?1').bind(learner.principal.internalUserId).first<{ value: number }>()
    const detail = await grantAdminAccess(
      env.DB,
      admin.principal,
      learner.principal.id,
      { planSlug: 'tester-premium', confirmation: 'confirm-access-grant' },
      crypto.randomUUID(),
    )
    const after = await env.DB.prepare('SELECT COUNT(*) AS value FROM lesson_progress WHERE user_id=?1').bind(learner.principal.internalUserId).first<{ value: number }>()
    const enrollmentAfter = await env.DB.prepare('SELECT enrollment_status FROM course_enrollments WHERE user_id=?1').bind(learner.principal.internalUserId).first()
    const revenueAfter = await getBusinessOverview(env.DB)
    expect(detail.access.status).toBe('TESTER')
    expect(before?.value).toBe(after?.value)
    expect(enrollmentAfter).toEqual(enrollmentBefore)
    expect(revenueAfter.revenue.allTimeMinor).toBe(revenueBefore.revenue.allTimeMinor)
  })

  it('stores proof privately, normalizes references, approves atomically, and is idempotent', async () => {
    const [admin, learner] = await Promise.all([createUser('admin'), createUser('student')])
    await env.DB.batch([
      env.DB.prepare("UPDATE commercial_settings SET enabled=1 WHERE setting_key IN('show_pricing','public_checkout')"),
      env.DB.prepare("UPDATE subscription_plans SET public_visible=1,checkout_enabled=1 WHERE slug='founding-learner'"),
    ])
    const method = await upsertCommercialPaymentMethod(
      env.DB,
      admin.principal,
      { slug: `manual-${crypto.randomUUID()}`, displayName: 'Manual transfer', instructions: 'Transfer and submit proof.', enabled: true, position: paymentMethodPosition++ },
      crypto.randomUUID(),
    )
    const paymentRequest = await createLearnerPaymentRequest(env.DB, learner.principal.internalUserId, 'founding-learner')
    expect(paymentRequest.id).toMatch(/^PW-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/u)
    const reference = ` pw-${crypto.randomUUID()} `
    const submitted = await submitLearnerPaymentProof(
      env.DB,
      env.PAYMENT_RECEIPTS,
      learner.principal.internalUserId,
      paymentRequest.id,
      {
        paymentMethodId: method.id,
        transactionReference: reference,
        paymentOccurredAt: new Date().toISOString(),
        receipt: new File([new Uint8Array([137, 80, 78, 71])], 'receipt.png', { type: 'image/png' }),
      },
    )
    expect(submitted.status).toBe('proof_submitted')
    expect(submitted.learner.currentAccess).toBe('FREE')
    expect(normalizePaymentReference(reference)).toMatch(/^PW/u)
    const approved = await approvePaymentRequest(env.DB, admin.principal, paymentRequest.id, crypto.randomUUID())
    const approvedAgain = await approvePaymentRequest(env.DB, admin.principal, paymentRequest.id, crypto.randomUUID())
    expect(approved.status).toBe('approved')
    expect(approvedAgain).toEqual(approved)
    const rows = await env.DB.prepare('SELECT COUNT(*) AS value FROM subscriptions WHERE user_id=?1 AND status=\'active\'').bind(learner.principal.internalUserId).first<{ value: number }>()
    expect(rows?.value).toBe(1)
    await expect(getLearnerCommercialAccess(env.DB, learner.principal.internalUserId)).resolves.toMatchObject({ accessType: 'PREMIUM', commerciallyActive: true })

    const duplicate = await createLearnerPaymentRequest(env.DB, learner.principal.internalUserId, 'founding-learner')
    await expect(submitLearnerPaymentProof(
      env.DB,
      env.PAYMENT_RECEIPTS,
      learner.principal.internalUserId,
      duplicate.id,
      {
        paymentMethodId: method.id,
        transactionReference: reference,
        paymentOccurredAt: new Date().toISOString(),
        receipt: new File([new Uint8Array([137, 80, 78, 71])], 'duplicate.png', { type: 'image/png' }),
      },
    )).rejects.toSatisfy((error: unknown) => error instanceof AppError && error.code === 'TRANSACTION_REFERENCE_ALREADY_USED')
  })

  it('enforces payment and receipt ownership and keeps rejected proof non-entitling', async () => {
    const [admin, owner, otherLearner] = await Promise.all([
      createUser('admin'),
      createUser('student'),
      createUser('student'),
    ])
    await env.DB.batch([
      env.DB.prepare("UPDATE commercial_settings SET enabled=1 WHERE setting_key IN('show_pricing','public_checkout')"),
      env.DB.prepare("UPDATE subscription_plans SET public_visible=1,checkout_enabled=1 WHERE slug='founding-learner'"),
    ])
    const method = await upsertCommercialPaymentMethod(
      env.DB,
      admin.principal,
      { slug: `ownership-${crypto.randomUUID()}`, displayName: 'Ownership test', instructions: 'Private transfer.', enabled: true, position: paymentMethodPosition++ },
      crypto.randomUUID(),
    )
    const request = await createLearnerPaymentRequest(env.DB, owner.principal.internalUserId, 'founding-learner')
    await expect(getLearnerPaymentRequest(
      env.DB,
      otherLearner.principal.internalUserId,
      request.id,
    )).rejects.toMatchObject({ code: 'PAYMENT_REQUEST_NOT_FOUND' })
    const submitted = await submitLearnerPaymentProof(
      env.DB,
      env.PAYMENT_RECEIPTS,
      owner.principal.internalUserId,
      request.id,
      {
        paymentMethodId: method.id,
        transactionReference: `reject-${crypto.randomUUID()}`,
        payerName: 'A family member',
        paymentOccurredAt: new Date().toISOString(),
        receipt: new File([new Uint8Array([137, 80, 78, 71])], 'proof.png', { type: 'image/png' }),
      },
    )
    expect(submitted.proof?.payerName).toBe('A family member')
    await expect(getOwnedReceiptKey(
      env.DB,
      otherLearner.principal.internalUserId,
      request.id,
    )).rejects.toMatchObject({ code: 'RECEIPT_NOT_FOUND' })
    await expect(getOwnedReceiptKey(
      env.DB,
      owner.principal.internalUserId,
      request.id,
    )).resolves.toContain(owner.principal.id)
    const rejected = await rejectPaymentRequest(
      env.DB,
      admin.principal,
      request.id,
      {
        confirmation: 'confirm-payment-decision',
        rejectionReason: 'transaction_not_found',
        note: 'Transaction not found in the receiving account.',
      },
      crypto.randomUUID(),
    )
    expect(rejected.status).toBe('rejected')
    await expect(approvePaymentRequest(
      env.DB,
      admin.principal,
      request.id,
      crypto.randomUUID(),
    )).rejects.toMatchObject({ code: 'INVALID_PAYMENT_TRANSITION' })
    await expect(getLearnerCommercialAccess(
      env.DB,
      owner.principal.internalUserId,
    )).resolves.toMatchObject({ accessType: 'FREE', commerciallyActive: false })
  })

  it('keeps QR assets private and removes refunded payments from revenue', async () => {
    const [admin, learner] = await Promise.all([createUser('admin'), createUser('student')])
    await env.DB.batch([
      env.DB.prepare("UPDATE commercial_settings SET enabled=1 WHERE setting_key IN('show_pricing','public_checkout')"),
      env.DB.prepare("UPDATE subscription_plans SET public_visible=1,checkout_enabled=1 WHERE slug='founding-learner'"),
    ])
    const method = await upsertCommercialPaymentMethod(
      env.DB,
      admin.principal,
      { slug: `qr-${crypto.randomUUID()}`, displayName: 'QR method', instructions: 'Scan the private QR.', enabled: true, position: paymentMethodPosition++ },
      crypto.randomUUID(),
    )
    const withQr = await setCommercialPaymentMethodQr(
      env.DB,
      env.PAYMENT_RECEIPTS,
      admin.principal,
      method.id,
      new File([new Uint8Array([137, 80, 78, 71])], 'ignored-name.png', { type: 'image/png' }),
      crypto.randomUUID(),
    )
    expect(withQr.hasQr).toBe(true)
    const qrKey = await getAdminPaymentMethodQrKey(env.DB, method.id)
    expect(qrKey).toMatch(/^payment-method-qr\//u)
    await expect(env.PAYMENT_RECEIPTS.get(qrKey)).resolves.not.toBeNull()

    const request = await createLearnerPaymentRequest(env.DB, learner.principal.internalUserId, 'founding-learner')
    await submitLearnerPaymentProof(env.DB, env.PAYMENT_RECEIPTS, learner.principal.internalUserId, request.id, {
      paymentMethodId: method.id,
      transactionReference: `refund-${crypto.randomUUID()}`,
      paymentOccurredAt: new Date().toISOString(),
      receipt: new File([new Uint8Array([137, 80, 78, 71])], 'receipt.png', { type: 'image/png' }),
    })
    const revenueBefore = await getBusinessOverview(env.DB)
    await approvePaymentRequest(env.DB, admin.principal, request.id, crypto.randomUUID())
    const revenueApproved = await getBusinessOverview(env.DB)
    expect(revenueApproved.revenue.allTimeMinor - revenueBefore.revenue.allTimeMinor).toBe(14900)
    const refunded = await refundPaymentRequest(env.DB, admin.principal, request.id, crypto.randomUUID())
    expect(refunded.status).toBe('refunded')
    const revenueRefunded = await getBusinessOverview(env.DB)
    expect(revenueRefunded.revenue.allTimeMinor).toBe(revenueBefore.revenue.allTimeMinor)
    await expect(getLearnerCommercialAccess(env.DB, learner.principal.internalUserId)).resolves.toMatchObject({ accessType: 'EXPIRED', commerciallyActive: false })
    await expect(listLearnerPaymentRequests(env.DB, learner.principal.internalUserId)).resolves.toHaveLength(1)
  })
})
