import { useEffect, useState } from 'react'

import {
  createLearnerPaymentRequest,
  fetchCommercialAccess,
  fetchLearnerPaymentRequests,
  fetchLearnerPlans,
  fetchPaymentMethods,
  submitLearnerPaymentProof,
  type CommercialAccess,
  type CommercialPaymentRequest,
  type CommercialPlan,
  type PaymentMethod,
} from '../lib/commercial-api'

interface CommercialPanelData {
  access: CommercialAccess
  checkoutEnabled: boolean
  paymentMethodConfigured: boolean
  regularReferencePriceMinor: number | null
  showPricing: boolean
  plans: CommercialPlan[]
  methods: PaymentMethod[]
  requests: CommercialPaymentRequest[]
}

function formatAccessTitle(access: CommercialAccess): string {
  if (access.accessType === 'PREMIUM') return 'PasaWise Premium'
  if (access.accessType === 'TESTER') return 'Tester Premium'
  if (access.accessType === 'EXPIRED') return 'PasaWise access expired'
  return 'PasaWise Free'
}

function formatPlanName(planSlug: string): string {
  if (planSlug === 'founding-learner') return 'Founding Learner'
  if (planSlug === 'regular-monthly') return 'Regular Monthly'
  if (planSlug === 'tester-premium') return 'Tester Premium'
  return planSlug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function fetchCommercialPanelData(
  signal?: AbortSignal,
): Promise<CommercialPanelData> {
  const [access, plans, methods, requests] = await Promise.all([
    fetchCommercialAccess(signal),
    fetchLearnerPlans(signal),
    fetchPaymentMethods(signal),
    fetchLearnerPaymentRequests(signal),
  ])
  return { access, ...plans, methods, requests }
}

export function CommercialAccessPanel() {
  const [data, setData] = useState<CommercialPanelData | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [methodId, setMethodId] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [payerName, setPayerName] = useState('')
  const [senderLastDigits, setSenderLastDigits] = useState('')
  const [paymentOccurredAt, setPaymentOccurredAt] = useState('')
  const [learnerNote, setLearnerNote] = useState('')

  function refresh(): Promise<void> {
    return fetchCommercialPanelData().then(setData)
  }

  useEffect(() => {
    const controller = new AbortController()
    void fetchCommercialPanelData(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Access details could not be loaded.')
      })
    return () => controller.abort()
  }, [])

  const awaiting = data?.requests.find((request) => request.status === 'awaiting_payment') ?? null
  const underReview = data?.requests.find((request) =>
    request.status === 'proof_submitted' || request.status === 'under_review',
  ) ?? null
  const rejected = data?.requests.find((request) => request.status === 'rejected') ?? null

  return (
    <section className="account-panel commercial-access-panel" aria-labelledby="commercial-access-title">
      <div className="account-panel__heading"><p className="eyebrow">Access</p><h2 id="commercial-access-title">PasaWise access</h2></div>
      {data === null ? <p>Checking account access…</p> : <>
        <div className="commercial-access-summary"><strong>{formatAccessTitle(data.access)}</strong><span>{data.access.commerciallyActive ? 'Active' : data.access.enforcementEnabled ? 'Free access' : 'Platform access available during staged rollout'}</span></div>
        {data.access.entitlement !== null && <dl className="commercial-proof-detail commercial-entitlement-detail">
          <div><dt>Plan</dt><dd>{formatPlanName(data.access.entitlement.planSlug)}</dd></div>
          <div><dt>Started</dt><dd>{new Date(data.access.entitlement.startsAt).toLocaleString()}</dd></div>
          <div><dt>Expires</dt><dd>{new Date(data.access.entitlement.expiresAt).toLocaleString()}</dd></div>
        </dl>}
        {underReview !== null && <div className="commercial-review-state" role="status">
          <h3>Payment under review</h3>
          <p>We received your payment proof. Your PasaWise access will activate after verification.</p>
          <dl className="commercial-proof-detail">
            <div><dt>Request ID</dt><dd>{underReview.id}</dd></div>
            <div><dt>Plan</dt><dd>{underReview.plan.name}</dd></div>
            <div><dt>Expected amount</dt><dd>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(underReview.expectedAmountMinor / 100)}</dd></div>
            <div><dt>Submitted</dt><dd>{underReview.proofSubmittedAt === null ? 'Pending' : new Date(underReview.proofSubmittedAt).toLocaleString()}</dd></div>
            <div><dt>Current status</dt><dd>{underReview.status === 'proof_submitted' ? 'Pending verification' : 'Under review'}</dd></div>
          </dl>
        </div>}
        {rejected !== null && <div className="commercial-warning" role="status">
          <h3>Payment proof needs attention</h3>
          <p>{rejected.rejectionNote ?? 'This request was not approved. Create a new payment request if you want to submit corrected proof.'}</p>
          <p>Request {rejected.id} · {rejected.plan.name}</p>
        </div>}
        {data.access.commerciallyActive ? (
          <p>Your active access includes all PasaWise Premium features. Normal lesson prerequisites still apply.</p>
        ) : !data.showPricing ? (
          <p>Pricing and checkout are not currently available.</p>
        ) : (
          <div id="plans" className="commercial-pricing" aria-labelledby="plans-title">
            <div>
              <p className="eyebrow">PasaWise Pro</p>
              <h3 id="plans-title">Founding Learner Offer</h3>
              <p>Complete PasaWise access for focused CSE preparation.</p>
            </div>
            <div className="commercial-plan-grid">
              {data.plans.map((plan) => (
                <article className="commercial-plan-card" key={plan.id}>
                  <span className="commercial-discount">50% OFF</span>
                  <h3>{plan.name}</h3>
                  {data.regularReferencePriceMinor !== null && (
                    <span className="commercial-regular-price">
                      Regular {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(data.regularReferencePriceMinor / 100)}
                    </span>
                  )}
                  <strong className="commercial-launch-price">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(plan.priceMinor / 100)}
                    <small> / {plan.durationDays} days</small>
                  </strong>
                  <ul>
                    <li>Complete curriculum and practice</li>
                    <li>Assessments, Smart Recovery, and Mistake Notebook</li>
                    <li>Readiness Score and Full Mock Examination</li>
                  </ul>
                  <button
                    disabled={!data.checkoutEnabled || !plan.purchaseAvailable}
                    type="button"
                    onClick={() => void createLearnerPaymentRequest(plan.slug)
                      .then(refresh)
                      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payment request could not be created.'))}
                  >
                    {plan.purchaseAvailable ? 'Continue to payment' : 'Offer fully subscribed'}
                  </button>
                </article>
              ))}
            </div>
            {!data.checkoutEnabled && (
              <p className="commercial-warning" role="status">
                {data.paymentMethodConfigured
                  ? 'Public checkout is currently paused.'
                  : 'Payment setup is not configured yet. No payment request can be created.'}
              </p>
            )}
            {awaiting !== null && data.methods.length > 0 && (
              <>
                <div className="commercial-checkout-heading">
                  <p className="eyebrow">Payment request</p>
                  <h3>{awaiting.id}</h3>
                  <p>PasaWise {awaiting.plan.name}</p>
                  <p>
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(awaiting.expectedAmountMinor / 100)}
                    {awaiting.plan.durationDays === null ? '' : ` / ${awaiting.plan.durationDays} days`}
                  </p>
                  <p>Unlock complete lessons and practice, assessments, Smart Recovery, Mistake Notebook, Readiness Score, and Full Mock Examination.</p>
                </div>
                <div className="commercial-method-grid" aria-label="Payment instructions">
                  {data.methods.map((method) => <article key={method.id}>
                    <h3>{method.displayName}</h3>
                    {method.accountDisplayName !== null && <p>{method.accountDisplayName}</p>}
                    {method.maskedAccountInfo !== null && <p>{method.maskedAccountInfo}</p>}
                    <p>{method.instructions}</p>
                    {method.hasQr && <img className="commercial-method-qr" src={`/api/student/commercial/payment-methods/${encodeURIComponent(method.id)}/qr`} alt={`${method.displayName} payment QR code`} />}
                  </article>)}
                </div>
                <form className="commercial-proof-form" onSubmit={(event) => {
                  event.preventDefault()
                  if (receipt === null) { setMessage('Choose a receipt image.'); return }
                  void submitLearnerPaymentProof(awaiting.id, {
                    paymentMethodId: methodId.length > 0 ? methodId : data.methods[0]?.id ?? '',
                    transactionReference: reference,
                    payerName: payerName || undefined,
                    senderLastDigits: senderLastDigits || undefined,
                    paymentOccurredAt: new Date(paymentOccurredAt).toISOString(),
                    learnerNote: learnerNote || undefined,
                    receipt,
                  }).then(() => { setMessage('Payment proof submitted for administrator review.'); setReference(''); setReceipt(null); return refresh() }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payment proof could not be submitted.'))
                }}>
                  <h3>Submit payment proof</h3>
                  <label>Payment method<select value={methodId.length > 0 ? methodId : data.methods[0]?.id ?? ''} onChange={(event) => setMethodId(event.target.value)}>{data.methods.map((method) => <option key={method.id} value={method.id}>{method.displayName}</option>)}</select></label>
                  <label>Transaction reference<input required minLength={6} maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} /></label>
                  <label>Payer name (optional)<input maxLength={100} value={payerName} onChange={(event) => setPayerName(event.target.value)} /></label>
                  <label>Sender account/mobile last digits (optional)<input inputMode="numeric" pattern="[0-9]{2,8}" value={senderLastDigits} onChange={(event) => setSenderLastDigits(event.target.value)} /></label>
                  <label>Payment date and time<input required type="datetime-local" value={paymentOccurredAt} onChange={(event) => setPaymentOccurredAt(event.target.value)} /></label>
                  <label>Note (optional)<textarea maxLength={500} value={learnerNote} onChange={(event) => setLearnerNote(event.target.value)} /></label>
                  <label>Receipt image<input required accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} /></label>
                  <button type="submit">Submit proof for review</button>
                </form>
              </>
            )}
          </div>
        )}
        {data.requests.length > 0 && <div><h3>Payment history</h3><ul>{data.requests.map((request) => <li key={request.id}><strong>{request.id}</strong> — {request.plan.name} — {request.status}</li>)}</ul></div>}
      </>}
      {message !== null && <p role="status">{message}</p>}
    </section>
  )
}
