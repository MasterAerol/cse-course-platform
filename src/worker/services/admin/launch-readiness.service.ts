import { getRegistrationMode } from '../../config/registration'
import { TESTER_PROGRAM_CAPACITY } from '../../domain/commercial-access'
import type { Bindings } from '../../types/bindings'
import { getCommercialSettings } from '../commercial.service'

interface ReadinessPlanRow {
  slug: string
  price_minor: number
  duration_days: number | null
  access_type: 'PREMIUM' | 'TESTER'
  active: 0 | 1
  public_visible: 0 | 1
  checkout_enabled: 0 | 1
  counts_as_revenue: 0 | 1
  purchase_limit: number | null
}

async function canReachReceiptStorage(bucket: R2Bucket | undefined) {
  if (bucket === undefined) return false
  try {
    await bucket.head('__pasawise_launch_readiness_probe__')
    return true
  } catch {
    return false
  }
}

export async function getLaunchReadiness(
  database: D1Database,
  bindings: Bindings,
  hostname: string,
) {
  const [settings, founding, tester, paymentMethod, receiptsReady] = await Promise.all([
    getCommercialSettings(database),
    database
      .prepare(
        `SELECT * FROM subscription_plans
        WHERE slug = 'founding-learner' LIMIT 1`,
      )
      .first<ReadinessPlanRow>(),
    database
      .prepare(
        `SELECT * FROM subscription_plans
        WHERE slug = 'tester-premium' LIMIT 1`,
      )
      .first<ReadinessPlanRow>(),
    database
      .prepare(
        `SELECT 1 AS configured FROM commercial_payment_methods
        WHERE enabled = 1
          AND qr_object_key IS NOT NULL
          AND length(trim(instructions)) > 0
        LIMIT 1`,
      )
      .first<{ configured: number }>(),
    canReachReceiptStorage(bindings.PAYMENT_RECEIPTS),
  ])

  const registrationOpen = getRegistrationMode(bindings) === 'open'
  const domainReady = hostname === 'pasawise.com'
  const googleReady = (bindings.GOOGLE_CLIENT_ID?.trim().length ?? 0) > 0
  const emailVerificationReady =
    (bindings.EMAIL_VERIFICATION_SECRET?.trim().length ?? 0) > 0
  const resendReady = (bindings.RESEND_API_KEY?.trim().length ?? 0) > 0
  const paymentMethodReady = paymentMethod !== null
  const foundingReady =
    founding?.price_minor === 14900 &&
    founding.duration_days === 30 &&
    founding.access_type === 'PREMIUM' &&
    founding.active === 1 &&
    founding.public_visible === 1 &&
    founding.checkout_enabled === 1 &&
    founding.counts_as_revenue === 1 &&
    founding.purchase_limit === 100
  const testerReady =
    tester?.price_minor === 0 &&
    tester.duration_days === 14 &&
    tester.access_type === 'TESTER' &&
    tester.active === 1 &&
    tester.public_visible === 0 &&
    tester.checkout_enabled === 0 &&
    tester.counts_as_revenue === 0

  const checks = {
    domain: { ready: domainReady, value: hostname },
    google: { ready: googleReady },
    emailOtp: { ready: emailVerificationReady },
    resend: { ready: resendReady },
    r2Receipts: { ready: receiptsReady },
    registration: { ready: registrationOpen, value: registrationOpen ? 'OPEN' : 'CLOSED' },
    publicSignup: { ready: settings.publicSignup, value: settings.publicSignup ? 'ON' : 'OFF' },
    premiumEnforcement: {
      ready: settings.premiumAccessEnforcement,
      value: settings.premiumAccessEnforcement ? 'ON' : 'OFF',
    },
    pricing: { ready: settings.showPricing, value: settings.showPricing ? 'ON' : 'OFF' },
    checkout: {
      ready: settings.publicCheckout,
      value: settings.publicCheckout ? 'ON' : 'OFF',
    },
    paymentMethod: {
      ready: paymentMethodReady,
      value: paymentMethodReady ? 'CONFIGURED' : 'NOT CONFIGURED',
    },
    foundingLearner: {
      ready: foundingReady,
      value: foundingReady ? 'READY' : 'MISSING OR MISCONFIGURED',
    },
    testerPremium: {
      ready: testerReady,
      value: testerReady ? 'READY' : 'MISSING OR MISCONFIGURED',
      capacity: TESTER_PROGRAM_CAPACITY,
    },
  }

  return {
    readyForInternalSimulation: Object.values(checks).every(
      (check) => check.ready,
    ),
    checks,
  }
}
