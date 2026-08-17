#!/usr/bin/env node

import { pathToFileURL } from 'node:url'
import { isLocalBaseUrl, isQaEmail, parseArgs } from './lib/qa-student-script-guards.mjs'

const confirmationPhrase = 'configure-cse-qa-student'
const csrfHeaderValue = 'same-origin-admin-mutation'

async function main() {
  const args = parseArgs()
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  const qaEmail = args.get('qa-email')?.trim().toLowerCase()
  const mode = args.get('mode')
  const inspectOnly = args.get('inspect-only') === 'true'

  if (qaEmail === undefined) throw new Error('Pass --qa-email <address>.')
  if (!inspectOnly && mode !== 'unlocked' && mode !== 'fresh') {
    throw new Error('Pass --mode unlocked or --mode fresh.')
  }

  const local = isLocalBaseUrl(baseUrl)
  if (!local) {
    if (args.get('remote') !== 'true') {
      throw new Error('Remote targets require the explicit --remote flag.')
    }
    if (!inspectOnly && args.get('confirm') !== confirmationPhrase) {
      throw new Error(
        `Remote mutation requires --confirm ${confirmationPhrase}.`,
      )
    }
  }

  const nonQaConfirmation = args.get('allow-non-qa-email')
  if (!isQaEmail(qaEmail) && nonQaConfirmation !== qaEmail) {
    throw new Error(
      'The target does not look like a QA email. Pass '
        + `--allow-non-qa-email ${qaEmail} to confirm the exact address.`,
    )
  }

  let cookie = args.get('cookie') ?? null
  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') {
      headers.set('x-cse-admin-csrf', csrfHeaderValue)
    }
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) {
      throw new Error(
        `${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`,
      )
    }
    return body.data
  }

  if (cookie === null) {
    const adminEmail = args.get('admin-email')
    const adminPassword = process.env.CSE_QA_ADMIN_PASSWORD
    if (adminEmail === undefined || adminPassword === undefined) {
      throw new Error(
        'Pass --cookie, or --admin-email with CSE_QA_ADMIN_PASSWORD set.',
      )
    }
    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    })
  }

  await request('/api/admin/auth-check')
  const target = await request(
    `/api/admin/qa-students/target?email=${encodeURIComponent(qaEmail)}`,
  )
  console.log(JSON.stringify({
    operation: 'inspect-cse-qa-student',
    baseUrl,
    target,
    mutationPlanned: !inspectOnly,
    mode: inspectOnly ? null : mode,
  }, null, 2))

  if (inspectOnly) return

  const qaPassword = process.env.CSE_QA_STUDENT_PASSWORD
  if (qaPassword === undefined) {
    throw new Error('Set CSE_QA_STUDENT_PASSWORD before mutation.')
  }

  const result = await request('/api/admin/qa-students/configure', {
    method: 'POST',
    body: JSON.stringify({
      email: qaEmail,
      password: qaPassword,
      mode,
      confirmation: confirmationPhrase,
      confirmNonQaEmail: !isQaEmail(qaEmail),
    }),
  })
  console.log(JSON.stringify({
    operation: 'configure-cse-qa-student',
    ...result,
  }, null, 2))
}

const isDirectExecution = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
