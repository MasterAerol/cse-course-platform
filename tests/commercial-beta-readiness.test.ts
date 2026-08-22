import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { hashPassword } from '../src/worker/auth/password'
import {
  FREE_PREVIEW_LESSON_COUNT,
  TESTER_PROGRAM_CAPACITY,
} from '../src/worker/domain/commercial-access'
import type { CurriculumLessonRow } from '../src/worker/repositories/course.repository'
import {
  getBusinessOverview,
  grantAdminAccess,
} from '../src/worker/services/admin/commercial-learners.service'
import {
  listAdminFeedback,
  submitLearnerFeedback,
  updateAdminFeedbackStatus,
} from '../src/worker/services/feedback.service'
import {
  getLessonAccessibilityFromOrderedRows,
  getLockReason,
} from '../src/worker/services/lesson-access.service'
import type { AuthenticatedPrincipal } from '../src/worker/types/auth'

async function createPrincipal(role: 'student' | 'admin') {
  const publicId = crypto.randomUUID()
  const email = `beta-${publicId}@example.test`
  const inserted = await env.DB.prepare(
    `INSERT INTO users(
      public_id,email,password_hash,first_name,last_name,role,status
    ) VALUES(?1,?2,?3,'Beta','Readiness',?4,'active')`,
  )
    .bind(publicId, email, await hashPassword('BetaReadiness123'), role)
    .run()
  return {
    internalUserId: Number(inserted.meta.last_row_id),
    id: publicId,
    email,
    firstName: 'Beta',
    lastName: 'Readiness',
    role,
    emailVerification: { verified: true, method: 'legacy' },
  } satisfies AuthenticatedPrincipal
}

function lesson(position: number): CurriculumLessonRow {
  return {
    subject_id: 1,
    subject_title: 'Numerical Ability',
    subject_slug: 'numerical-ability',
    subject_position: 1,
    topic_id: 1,
    topic_title: 'Percentages',
    topic_slug: 'percentages',
    topic_position: 1,
    lesson_id: position,
    lesson_public_id: `lesson-${position}`,
    lesson_title: `Lesson ${position}`,
    lesson_slug: `lesson-${position}`,
    lesson_type: 'reading',
    lesson_position: position,
    estimated_minutes: 10,
    is_preview: 0,
    requires_previous: position === 1 ? 0 : 1,
    progress_status: position < 4 ? 'completed' : 'not_started',
    completed_at: position < 4 ? '2026-08-01T00:00:00.000Z' : null,
  }
}

describe('Commercial simulation and beta readiness', () => {
  it('keeps exactly the first three normal-progression lessons free and distinguishes later Premium locks', () => {
    const rows = Array.from({ length: 5 }, (_, index) => lesson(index + 1))
    const enrollment = {
      status: 'active',
      accessStartsAt: '2026-08-01T00:00:00.000Z',
      accessExpiresAt: null,
      hasAccess: true,
    }
    expect(FREE_PREVIEW_LESSON_COUNT).toBe(3)
    for (const row of rows.slice(0, FREE_PREVIEW_LESSON_COUNT)) {
      expect(
        getLessonAccessibilityFromOrderedRows(row, rows, enrollment, false),
      ).toMatchObject({ canAccess: true })
    }
    const premiumLock = getLessonAccessibilityFromOrderedRows(
      rows[3],
      rows,
      enrollment,
      false,
    )
    expect(premiumLock).toEqual({
      canAccess: false,
      reason: 'commercial_premium_required',
    })
    expect(getLockReason(premiumLock)).toBe(
      'Premium — Unlock the complete PasaWise experience.',
    )
    expect(
      getLessonAccessibilityFromOrderedRows(rows[3], rows, enrollment, true),
    ).toEqual({ canAccess: true, reason: 'active_enrollment' })
    expect(
      getLessonAccessibilityFromOrderedRows(rows[4], rows, enrollment, true),
    ).toEqual({
      canAccess: false,
      reason: 'previous_required_lesson_incomplete',
    })
  })

  it('enforces the 20-person active Tester Program limit with 14-day zero-revenue grants', async () => {
    const admin = await createPrincipal('admin')
    const learners = await Promise.all(
      Array.from({ length: TESTER_PROGRAM_CAPACITY + 1 }, () =>
        createPrincipal('student'),
      ),
    )
    const before = await getBusinessOverview(env.DB)
    for (const learner of learners.slice(0, TESTER_PROGRAM_CAPACITY)) {
      await grantAdminAccess(
        env.DB,
        admin,
        learner.id,
        {
          planSlug: 'tester-premium',
          confirmation: 'confirm-access-grant',
        },
        crypto.randomUUID(),
      )
    }
    await expect(
      grantAdminAccess(
        env.DB,
        admin,
        learners[TESTER_PROGRAM_CAPACITY].id,
        {
          planSlug: 'tester-premium',
          confirmation: 'confirm-access-grant',
        },
        crypto.randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'TESTER_PROGRAM_FULL' })

    const testerPlan = await env.DB.prepare(
      "SELECT id FROM subscription_plans WHERE slug='tester-premium'",
    ).first<{ id: number }>()
    expect(testerPlan).not.toBeNull()
    if (testerPlan === null) throw new Error('Tester plan fixture is missing.')
    const startsAt = new Date(Date.now() - 1_000).toISOString()
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1_000).toISOString()
    const directSubscriptionId = crypto.randomUUID()
    await expect(env.DB.batch([
      env.DB.prepare(
        `INSERT INTO subscriptions(
          public_id,user_id,plan_id,access_type,status,grant_source,
          starts_at,expires_at,granted_by_user_id
        ) VALUES(?1,?2,?3,'TESTER','active','tester',?4,?5,?6)`,
      ).bind(
        directSubscriptionId,
        learners[TESTER_PROGRAM_CAPACITY].internalUserId,
        testerPlan.id,
        startsAt,
        expiresAt,
        admin.internalUserId,
      ),
      env.DB.prepare(
        `INSERT INTO commercial_entitlements(
          public_id,user_id,subscription_id,access_type,entitlement_key,
          status,starts_at,expires_at
        ) VALUES(
          ?1,?2,(SELECT id FROM subscriptions WHERE public_id=?3),
          'TESTER','premium_suite','active',?4,?5
        )`,
      ).bind(
        crypto.randomUUID(),
        learners[TESTER_PROGRAM_CAPACITY].internalUserId,
        directSubscriptionId,
        startsAt,
        expiresAt,
      ),
    ])).rejects.toThrow('tester program capacity reached')
    const rolledBack = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM subscriptions WHERE user_id=?1',
    ).bind(
      learners[TESTER_PROGRAM_CAPACITY].internalUserId,
    ).first<{ count: number }>()
    expect(rolledBack?.count).toBe(0)

    const after = await getBusinessOverview(env.DB)
    expect(after.testerProgram).toMatchObject({
      capacity: 20,
      available: 0,
      durationDays: 14,
      revenueMinor: 0,
    })
    expect(after.revenue.allTimeMinor).toBe(before.revenue.allTimeMinor)
  })

  it('stores sanitized learner feedback and restricts global review operations to the admin service', async () => {
    const [admin, learner] = await Promise.all([
      createPrincipal('admin'),
      createPrincipal('student'),
    ])
    const submitted = await submitLearnerFeedback(
      env.DB,
      learner.internalUserId,
      {
        category: 'bug',
        message: '  A control\u0007 did not respond on mobile.  ',
        pagePath: '/account?panel=feedback',
      },
    )
    expect(submitted.message).toBe('A control did not respond on mobile.')
    expect(submitted.learner.id).toBe(learner.id)
    expect(submitted.status).toBe('new')

    const listed = await listAdminFeedback(env.DB, 'new')
    expect(listed).toContainEqual(expect.objectContaining({ id: submitted.id }))
    const reviewed = await updateAdminFeedbackStatus(
      env.DB,
      admin,
      submitted.id,
      'reviewed',
    )
    expect(reviewed.status).toBe('reviewed')
    expect(reviewed.reviewedAt).not.toBeNull()
  })

  it('applies the provider-independent 0020 schema with authoritative plan values', async () => {
    const plan = await env.DB.prepare(
      `SELECT price_minor,duration_days,access_type,public_visible,
        checkout_enabled,counts_as_revenue,purchase_limit
      FROM subscription_plans WHERE slug='founding-learner'`,
    ).first()
    expect(plan).toEqual({
      price_minor: 14900,
      duration_days: 30,
      access_type: 'PREMIUM',
      public_visible: 1,
      checkout_enabled: 1,
      counts_as_revenue: 1,
      purchase_limit: 100,
    })
    const schema = await env.DB.prepare(
      `SELECT COUNT(*) AS value FROM sqlite_schema
      WHERE type='table' AND name='beta_feedback'`,
    ).first<{ value: number }>()
    const trigger = await env.DB.prepare(
      `SELECT COUNT(*) AS value FROM sqlite_schema
      WHERE type='trigger' AND name='trg_plan_purchase_limit'`,
    ).first<{ value: number }>()
    const testerTrigger = await env.DB.prepare(
      `SELECT COUNT(*) AS value FROM sqlite_schema
      WHERE type='trigger' AND name='trg_tester_program_capacity'`,
    ).first<{ value: number }>()
    expect(schema?.value).toBe(1)
    expect(trigger?.value).toBe(1)
    expect(testerTrigger?.value).toBe(1)
    expect((await env.DB.prepare('PRAGMA foreign_key_check').all()).results).toEqual([])
  })
})
