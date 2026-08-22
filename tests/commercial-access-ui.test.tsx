import { describe, expect, it } from 'vitest'

import appSource from '../src/react-app/App.tsx?raw'
import feedbackFormSource from '../src/react-app/components/BetaFeedbackForm.tsx?raw'
import commercialAccessPanelSource from '../src/react-app/components/CommercialAccessPanel.tsx?raw'
import premiumRouteSource from '../src/react-app/components/PremiumRoute.tsx?raw'
import adminNavigationSource from '../src/react-app/components/admin/AdminLayout.tsx?raw'
import adminFeedbackSource from '../src/react-app/pages/admin/AdminFeedbackPage.tsx?raw'
import adminPaymentsSource from '../src/react-app/pages/admin/AdminPaymentsPage.tsx?raw'
import adminSettingsSource from '../src/react-app/pages/admin/AdminCommercialSettingsPage.tsx?raw'
import adminCommercialRoutesSource from '../src/worker/routes/admin/commercial.routes.ts?raw'
import receiptStorageSource from '../src/worker/services/receipt-storage.service.ts?raw'

describe('Commercial Access System UI', () => {
  it('keeps pricing conditional while showing the truthful Founding Learner checkout', () => {
    const panel = commercialAccessPanelSource
    expect(panel).toContain('PasaWise access')
    expect(panel).toContain('PasaWise Premium')
    expect(panel).toContain('Tester Premium')
    expect(panel).toContain('<dt>Started</dt>')
    expect(panel).toContain('<dt>Expires</dt>')
    expect(panel).toContain('Normal lesson prerequisites still apply.')
    expect(panel).toContain('!data.showPricing')
    expect(panel).toContain('PasaWise Pro')
    expect(panel).toContain('Founding Learner Offer')
    expect(panel).toContain('50% OFF')
    expect(panel).toContain('regularReferencePriceMinor')
    expect(panel).toContain('Continue to payment')
    expect(panel).toContain('awaiting.plan.durationDays')
    expect(panel).toContain('Unlock complete lessons and practice')
    expect(panel).toContain('Payment setup is not configured yet.')
    expect(panel).toContain('submitLearnerPaymentProof')
    expect(panel).toContain('image/jpeg,image/png,image/webp')
    expect(panel).toContain('Payment under review')
    expect(panel).toContain('Your PasaWise access will activate after verification.')
    expect(panel).toContain('/api/student/commercial/payment-methods/')
    expect(panel).toContain('payment QR code')
    expect(panel).toContain('type="datetime-local"')
  })

  it('provides the complete guarded admin control surface', () => {
    const app = appSource
    const navigation = adminNavigationSource
    const settings = adminSettingsSource
    for (const route of [
      'commercial-learners',
      'payments',
      'business',
      'commercial-settings',
      'feedback',
    ]) {
      expect(app).toContain(route)
      expect(navigation).toContain(route)
    }
    for (const control of [
      'publicSignup',
      'showPricing',
      'publicCheckout',
      'premiumAccessEnforcement',
    ]) expect(settings).toContain(control)
    expect(settings).toContain('REGISTRATION_MODE remains the master signup gate')
    expect(settings).toContain('Launch Readiness')
    expect(settings).toContain('readyForInternalSimulation')
    expect(settings).toContain('purchaseLimit')
    expect(settings).toContain('AdminPaymentMethodForm')
    expect(settings).toContain('Private QR configured')
    expect(adminPaymentsSource).toContain('current access')
  })

  it('provides calm Premium locks and a small plain-text beta feedback workflow', () => {
    expect(premiumRouteSource).toContain('PasaWise Premium')
    expect(premiumRouteSource).toContain('Unlock the complete PasaWise experience.')
    expect(premiumRouteSource).toContain('View plans')
    expect(premiumRouteSource).toContain('fetchLearnerPlans')
    expect(premiumRouteSource).toContain('state.showPlans')
    expect(appSource).toContain('feature="smart_recovery"')
    expect(appSource).toContain('feature="subject_assessments"')
    expect(appSource).toContain('feature="full_mock"')
    expect(feedbackFormSource).toContain('Report a problem')
    expect(feedbackFormSource).toContain('location.pathname')
    expect(feedbackFormSource).toContain('maxLength={2000}')
    expect(adminFeedbackSource).toContain('Beta feedback')
    expect(adminFeedbackSource).toContain('never rendered as HTML')
    expect(adminFeedbackSource).not.toContain('dangerouslySetInnerHTML')
  })

  it('uses authenticated private receipt routes rather than public R2 URLs', () => {
    const payments = adminPaymentsSource
    const routes = adminCommercialRoutesSource
    const storage = receiptStorageSource
    expect(payments).toContain('/api/admin/commercial/payments/')
    expect(routes).toContain("requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS)")
    expect(storage).toContain("cache-control', 'private, no-store")
    expect(storage).toContain("content-security-policy', \"default-src 'none'; sandbox\"")
    expect(storage).not.toContain('publicUrl')
  })
})
