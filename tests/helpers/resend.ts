import type { EmailProviderFetch } from '../../src/worker/services/transactional-email.service'

export const TEST_RESEND_API_KEY = 'test-only-resend-api-key'

export interface CapturedResendRequest {
  url: string
  method: string | undefined
  headers: Headers
  body: {
    from?: unknown
    to?: unknown
    subject?: unknown
    html?: unknown
    text?: unknown
  }
}

export class CapturingResendFetch {
  readonly requests: CapturedResendRequest[] = []
  latestCode: string | null = null

  readonly fetch: EmailProviderFetch = (input, init) => {
    if (typeof init?.body !== 'string') {
      throw new Error('Expected a JSON Resend request body.')
    }
    const body = JSON.parse(init.body) as CapturedResendRequest['body']
    const url = typeof input === 'string'
      ? input
      : input instanceof URL ? input.href : input.url
    this.requests.push({
      url,
      method: init.method,
      headers: new Headers(init.headers),
      body,
    })
    this.latestCode = typeof body.text === 'string'
      ? body.text.match(/\b\d{6}\b/u)?.[0] ?? null
      : null

    return Promise.resolve(Response.json({ id: crypto.randomUUID() }))
  }
}

export const discardResendFetch: EmailProviderFetch = () =>
  Promise.resolve(Response.json({ id: crypto.randomUUID() }))
