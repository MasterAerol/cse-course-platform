import { useState } from 'react'

import {
  saveAdminPaymentMethod,
  uploadAdminPaymentMethodQr,
  type PaymentMethod,
} from '../../lib/commercial-api'

export function AdminPaymentMethodForm({
  methods,
  onSaved,
}: {
  methods: readonly PaymentMethod[]
  onSaved: (method: PaymentMethod) => void
}) {
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accountDisplayName, setAccountDisplayName] = useState('')
  const [maskedAccountInfo, setMaskedAccountInfo] = useState('')
  const [instructions, setInstructions] = useState('')
  const [position, setPosition] = useState(1)
  const [enabled, setEnabled] = useState(false)
  const [saved, setSaved] = useState<PaymentMethod | null>(null)
  const [qr, setQr] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function chooseMethod(publicId: string): void {
    const method = methods.find((item) => item.id === publicId) ?? null
    setSaved(method)
    setQr(null)
    setMessage(null)
    if (method === null) {
      setSlug('')
      setDisplayName('')
      setAccountDisplayName('')
      setMaskedAccountInfo('')
      setInstructions('')
      setPosition(1)
      setEnabled(false)
      return
    }
    setSlug(method.slug)
    setDisplayName(method.displayName)
    setAccountDisplayName(method.accountDisplayName ?? '')
    setMaskedAccountInfo(method.maskedAccountInfo ?? '')
    setInstructions(method.instructions)
    setPosition(method.position)
    setEnabled(method.enabled)
  }

  return (
    <div className="commercial-action-grid">
      <form onSubmit={(event) => {
        event.preventDefault()
        void saveAdminPaymentMethod({
          publicId: saved?.id,
          slug,
          displayName,
          accountDisplayName: accountDisplayName || undefined,
          maskedAccountInfo: maskedAccountInfo || undefined,
          instructions,
          enabled,
          position,
        }).then((method) => {
          setSaved(method)
          setMessage('Payment method saved and audit logged.')
          onSaved(method)
        }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Payment method could not be saved.'))
      }}>
        <h3>Configure manual payment method</h3>
        <label>Existing configuration<select value={saved?.id ?? ''} onChange={(event) => chooseMethod(event.target.value)}>
          <option value="">Create a new payment method</option>
          {methods.map((method) => <option key={method.id} value={method.id}>{method.displayName}</option>)}
        </select></label>
        <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
        <label>Display name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label>Account display name<input value={accountDisplayName} onChange={(event) => setAccountDisplayName(event.target.value)} /></label>
        <label>Safe masked account info<input value={maskedAccountInfo} onChange={(event) => setMaskedAccountInfo(event.target.value)} /></label>
        <label>Instructions<textarea required value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
        <label>Order<input type="number" min="1" max="100" value={position} onChange={(event) => setPosition(event.target.valueAsNumber)} /></label>
        <label className="admin-checkbox-label"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enabled for checkout</label>
        <button type="submit">Save payment method</button>
      </form>
      <form onSubmit={(event) => {
        event.preventDefault()
        if (saved === null || qr === null) { setMessage('Save the payment method and choose a QR image first.'); return }
        void uploadAdminPaymentMethodQr(saved.id, qr)
          .then((method) => { setSaved(method); setMessage('Private QR asset saved and audit logged.'); onSaved(method) })
          .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'QR image could not be saved.'))
      }}>
        <h3>Upload QR asset</h3>
        <p>Save the method first. QR images stay private and are served only through authenticated routes.</p>
        <label>QR image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setQr(event.target.files?.[0] ?? null)} /></label>
        <button type="submit" disabled={saved === null}>Upload private QR</button>
      </form>
      {message !== null && <p role="status">{message}</p>}
    </div>
  )
}
