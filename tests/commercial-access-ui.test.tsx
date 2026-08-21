import { describe, expect, it } from 'vitest'

import appSource from '../src/react-app/App.tsx?raw'
import commercialAccessPanelSource from '../src/react-app/components/CommercialAccessPanel.tsx?raw'
import adminNavigationSource from '../src/react-app/components/admin/AdminLayout.tsx?raw'
import adminPaymentsSource from '../src/react-app/pages/admin/AdminPaymentsPage.tsx?raw'
import adminSettingsSource from '../src/react-app/pages/admin/AdminCommercialSettingsPage.tsx?raw'
import adminCommercialRoutesSource from '../src/worker/routes/admin/commercial.routes.ts?raw'
import receiptStorageSource from '../src/worker/services/receipt-storage.service.ts?raw'

describe('Commercial Access System UI', () => {
  it('keeps checkout and pricing conditional while always showing current access', () => {
    const panel = commercialAccessPanelSource
    expect(panel).toContain('PasaWise access')
    expect(panel).toContain('data.access.accessType')
    expect(panel).toContain('!data.checkoutEnabled || !data.showPricing')
    expect(panel).toContain('Public upgrades and payment submission are not currently available.')
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
    expect(settings).toContain('AdminPaymentMethodForm')
    expect(settings).toContain('Private QR configured')
    expect(adminPaymentsSource).toContain('current access')
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
