import { useEffect, useState } from 'react'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import {
  decidePayment,
  fetchAdminPayments,
  type CommercialPaymentRequest,
} from '../../lib/commercial-api'

const rejectionReasons = [
  ['transaction_not_found', 'Transaction not found'],
  ['reference_mismatch', 'Reference does not match'],
  ['incorrect_amount', 'Incorrect amount'],
  ['duplicate_transaction', 'Duplicate transaction'],
  ['unreadable_proof', 'Unreadable proof'],
  ['other', 'Other'],
] as const
type RejectionReason = (typeof rejectionReasons)[number][0]

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<CommercialPaymentRequest[]>([])
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>('transaction_not_found')
  const [rejectionNote, setRejectionNote] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetchAdminPayments(status || undefined, controller.signal)
      .then((result) => { setPayments(result); setMessage(null) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Payments could not be loaded.')
      })
    return () => controller.abort()
  }, [status])

  function act(id: string, action: 'review' | 'approve' | 'reject' | 'refund'): void {
    if (action !== 'review' && !window.confirm(
      action === 'approve'
        ? `Approve ${id} only after verifying the real external transaction?`
        : action === 'reject'
          ? `Reject payment request ${id}?`
          : `Mark payment request ${id} as refunded and revoke its paid entitlement?`,
    )) return
    const options = action === 'reject'
      ? {
          rejectionReason,
          note: rejectionNote || 'Payment proof was not verified.',
        }
      : {}
    void decidePayment(id, action, options)
      .then(() => {
        setMessage(`Payment ${action} action completed and audit logged.`)
        return fetchAdminPayments(status || undefined).then(setPayments)
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payment action failed.'))
  }

  return (
    <main className="admin-page">
      <AdminPageHeader title="Payment verification" description="Review private receipt proofs and approve only verified transactions. Approval is idempotent and duplicate references fail closed." />
      <section className="admin-panel commercial-filter-bar">
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All submitted</option><option value="proof_submitted">Proof submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="refunded">Refunded</option></select></label>
        <label>Rejection reason<select value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value as RejectionReason)}>{rejectionReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Safe learner-facing rejection note<input maxLength={500} value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} /></label>
      </section>
      {message !== null && <p role="status">{message}</p>}
      <section className="admin-panel">
        {payments.length === 0 ? <p>No matching payment requests.</p> : payments.map((payment) => <article className="commercial-payment-row" key={payment.id}>
          <div>
            <strong>{payment.id} · {payment.learner.name}</strong>
            <p>{payment.learner.email} · current access {payment.learner.currentAccess}</p>
            <p>{payment.plan.name} · {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(payment.expectedAmountMinor / 100)} · {payment.status}</p>
            {payment.proof === null ? <p>No proof</p> : <dl className="commercial-proof-detail">
              <div><dt>Payment method</dt><dd>{payment.proof.paymentMethod}</dd></div>
              <div><dt>Reference</dt><dd>{payment.proof.transactionReference}</dd></div>
              <div><dt>Payer</dt><dd>{payment.proof.payerName ?? 'Not provided'}</dd></div>
              <div><dt>Payment date</dt><dd>{new Date(payment.proof.paymentOccurredAt).toLocaleString()}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(payment.proof.submittedAt).toLocaleString()}</dd></div>
            </dl>}
            {payment.duplicateReferenceWarning && <p className="form-error">Possible duplicate reference — do not approve without investigation.</p>}
          </div>
          <div className="commercial-payment-actions">
            {payment.proof?.receiptAvailable === true && <a href={`/api/admin/commercial/payments/${encodeURIComponent(payment.id)}/receipt`} target="_blank" rel="noreferrer">View private receipt</a>}
            {payment.status === 'proof_submitted' && <button onClick={() => act(payment.id, 'review')}>Start review</button>}
            {(payment.status === 'proof_submitted' || payment.status === 'under_review') && <><button onClick={() => act(payment.id, 'approve')}>Approve</button><button className="button-danger" onClick={() => act(payment.id, 'reject')}>Reject</button></>}
            {payment.status === 'approved' && <button className="button-danger" onClick={() => act(payment.id, 'refund')}>Mark refunded</button>}
          </div>
        </article>)}
      </section>
    </main>
  )
}
