const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const PASAWISE_SENDER = 'PasaWise <noreply@pasawise.com>'
const PASAWISE_EMAIL_SUBJECT = 'Your PasaWise verification code'
const PASAWISE_USER_AGENT = 'PasaWise-Worker/1.0'

export interface RegistrationVerificationEmail {
  to: string
  firstName: string
  code: string
  expiresInMinutes: number
}

export interface TransactionalEmailService {
  sendRegistrationVerificationCode(
    input: RegistrationVerificationEmail,
  ): Promise<void>
}

export type EmailProviderFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createEmailContent(input: RegistrationVerificationEmail): {
  html: string
  text: string
} {
  const safeName = escapeHtml(input.firstName)
  const safeCode = escapeHtml(input.code)
  const text = [
    `Hi ${input.firstName},`,
    '',
    'Your verification code is:',
    '',
    input.code,
    '',
    `This code expires in ${input.expiresInMinutes} minutes.`,
    '',
    "If you didn't create a PasaWise account, you can ignore this email.",
    '',
    'PasaWise',
    'Aral nang wais. Pasa nang handa.',
  ].join('\n')
  const html = [
    `<p>Hi ${safeName},</p>`,
    '<p>Your verification code is:</p>',
    `<p style="font-size:24px;font-weight:700;letter-spacing:0.2em">${safeCode}</p>`,
    `<p>This code expires in ${input.expiresInMinutes} minutes.</p>`,
    "<p>If you didn't create a PasaWise account, you can ignore this email.</p>",
    '<p>PasaWise<br>Aral nang wais. Pasa nang handa.</p>',
  ].join('')

  return { html, text }
}

function deliveryFailedError(): Error {
  return new Error('Transactional email delivery failed.')
}

export function createTransactionalEmailService(
  apiKey: string | undefined,
  providerFetch: EmailProviderFetch = fetch,
): TransactionalEmailService {
  return {
    async sendRegistrationVerificationCode(input): Promise<void> {
      const normalizedApiKey = apiKey?.trim()
      if (normalizedApiKey === undefined || normalizedApiKey.length === 0) {
        throw deliveryFailedError()
      }

      const { html, text } = createEmailContent(input)
      let response: Response
      try {
        response = await providerFetch(RESEND_EMAIL_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${normalizedApiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': PASAWISE_USER_AGENT,
          },
          body: JSON.stringify({
            from: PASAWISE_SENDER,
            to: [input.to],
            subject: PASAWISE_EMAIL_SUBJECT,
            html,
            text,
          }),
        })
      } catch {
        throw deliveryFailedError()
      }

      if (!response.ok) throw deliveryFailedError()

      let result: unknown
      try {
        result = await response.json()
      } catch {
        throw deliveryFailedError()
      }
      if (
        typeof result !== 'object' ||
        result === null ||
        !('id' in result) ||
        typeof result.id !== 'string' ||
        result.id.length === 0
      ) {
        throw deliveryFailedError()
      }
    },
  }
}
