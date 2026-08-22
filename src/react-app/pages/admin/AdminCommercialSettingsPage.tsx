import { useCallback, useEffect, useState } from 'react'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import { AdminPaymentMethodForm } from '../../components/admin/AdminPaymentMethodForm'
import {
  fetchAdminCommercialSettings,
  saveAdminCommercialSettings,
  type AdminCommercialSettings,
  type CommercialSettings,
} from '../../lib/commercial-api'

const labels: Record<keyof CommercialSettings, string> = {
  publicSignup: 'Public signup',
  showPricing: 'Show pricing',
  publicCheckout: 'Public checkout',
  premiumAccessEnforcement: 'Premium access enforcement',
}

export function AdminCommercialSettingsPage() {
  const [data, setData] = useState<AdminCommercialSettings | null>(null)
  const [draft, setDraft] = useState<CommercialSettings | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback((signal?: AbortSignal): Promise<void> =>
    fetchAdminCommercialSettings(signal).then((result) => {
      setData(result)
      setDraft(result.settings)
    }), [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMessage(error instanceof Error ? error.message : 'Commercial settings could not be loaded.')
        }
      })
    return () => controller.abort()
  }, [load])

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Commercial controls"
        description="Manage server-authoritative launch, pricing, checkout, and access controls."
      />
      {message !== null && <p className="form-error" role="status">{message}</p>}
      {data !== null && (
        <section className="admin-panel launch-readiness" aria-labelledby="launch-readiness-title">
          <div className="launch-readiness__heading">
            <div><p className="eyebrow">Production checks</p><h2 id="launch-readiness-title">Launch Readiness</h2></div>
            <span className={`admin-status admin-status--${data.launchReadiness.readyForInternalSimulation ? 'active' : 'warning'}`}>
              {data.launchReadiness.readyForInternalSimulation ? 'READY' : 'ACTION REQUIRED'}
            </span>
          </div>
          <div className="launch-readiness__grid">
            {Object.entries(data.launchReadiness.checks).map(([key, check]) => (
              <article key={key}>
                <span>{key.replaceAll(/([A-Z])/gu, ' $1')}</span>
                <strong>{check.value ?? (check.ready ? 'READY' : 'MISSING')}</strong>
                <span aria-label={check.ready ? 'Ready' : 'Action required'}>
                  {check.ready ? '✓ Ready' : 'Needs attention'}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
      {draft !== null && (
        <section className="admin-panel">
          <h2>Platform controls</h2>
          <p className="commercial-warning">The deployment REGISTRATION_MODE remains the master signup gate. Enabling this page alone cannot open registration.</p>
          <form
            className="admin-form commercial-settings-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!window.confirm(
                'Apply these server-authoritative commercial control changes?',
              )) return
              setMessage(null)
              void saveAdminCommercialSettings(draft)
                .then(() => load())
                .then(() => {
                  setMessage('Commercial controls saved and audit logged.')
                })
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Settings could not be saved.'))
            }}
          >
            {(Object.keys(labels) as Array<keyof CommercialSettings>).map((key) => (
              <label className="admin-checkbox-label commercial-control" key={key}>
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })}
                />
                <span><strong>{labels[key]}</strong><small>{data?.controls.find((control) => control.setting_key.replaceAll(/_([a-z])/gu, (_match, letter: string) => letter.toUpperCase()) === key)?.description}</small></span>
              </label>
            ))}
            <button type="submit">Save commercial controls</button>
          </form>
        </section>
      )}
      <section className="admin-panel">
        <h2>Subscription plans</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Plan</th><th>Price</th><th>Duration</th><th>Access</th><th>Visibility</th><th>Offer limit</th><th>Revenue</th></tr></thead>
            <tbody>
              {data?.plans.map((plan) => (
                <tr key={plan.id}>
                  <td><strong>{plan.name}</strong><br /><small>{plan.slug}</small></td>
                  <td>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(plan.priceMinor / 100)}</td>
                  <td>{plan.durationDays === null ? 'Manual' : `${plan.durationDays} days`}</td>
                  <td>{plan.accessType}</td>
                  <td>{plan.publicVisible && plan.checkoutEnabled ? 'Public checkout' : 'Hidden'}</td>
                  <td>{plan.purchaseLimit === null ? 'None' : `${plan.approvedPurchaseCount} / ${plan.purchaseLimit} approved`}</td>
                  <td>{plan.countsAsRevenue ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel">
        <h2>Manual payment methods</h2>
        <p>
          Configure only safe receiving details. QR images stay private and are
          served through authenticated learner and administrator routes.
        </p>
        {data?.paymentMethods.length === 0 ? (
          <p>No payment methods configured.</p>
        ) : (
          <div className="commercial-method-grid">
            {data?.paymentMethods.map((method) => (
              <article key={method.id}>
                <h3>{method.displayName}</h3>
                <p>{method.accountDisplayName ?? 'No account display name'}</p>
                <p>{method.maskedAccountInfo ?? 'No masked account information'}</p>
                <p>{method.instructions}</p>
                <p>
                  {method.enabled ? 'Enabled' : 'Disabled'} · position {method.position} ·{' '}
                  {method.hasQr ? 'Private QR configured' : 'No QR configured'}
                </p>
                {method.hasQr && (
                  <a
                    href={`/api/admin/commercial/payment-methods/${encodeURIComponent(method.id)}/qr`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View private QR
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
        <AdminPaymentMethodForm
          methods={data?.paymentMethods ?? []}
          onSaved={() => {
            void load().catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : 'Launch readiness could not be refreshed.')
            })
          }}
        />
      </section>
    </main>
  )
}
