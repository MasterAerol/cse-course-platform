#!/usr/bin/env node

import { pathToFileURL } from 'node:url'
import {
  formatHttpError,
  formatNetworkError,
  isLocalBaseUrl,
  isQaEmail,
  normalizeBaseUrl,
  parseArgs,
  resolveApiUrl,
} from './lib/qa-student-script-guards.mjs'

const confirmationPhrase = 'configure-cse-qa-student'
const csrfHeaderValue = 'same-origin-admin-mutation'
const defaultLocalBaseUrl = 'http://127.0.0.1:5173'

const helpText = `CSE Professional QA student configuration

Usage:
  node scripts/create-or-reset-qa-student.mjs [options]

Boolean flags (do not pass true or false):
  --remote                 Authorize targeting a non-local Worker origin.
  --inspect-only           Inspect the account and access state without QA mutations.
  --help                   Print this help and exit.

Value options:
  --base-url <url>         Worker origin. Required with --remote.
  --qa-email <email>       Target QA student. Required.
  --admin-email <email>    Administrator login email. Required for normal use.
  --mode <unlocked|fresh>  Required for mutations.
  --confirm <phrase>       Remote mutation confirmation phrase.
  --cookie <cookie>        Advanced existing-admin-session alternative for local/inspection use.
  --allow-non-qa-email <email>
                           Exact extra confirmation for a non-QA-looking target.

Environment variables:
  CSE_QA_ADMIN_PASSWORD    Administrator password used only for authentication.
  CSE_QA_STUDENT_PASSWORD  QA student password used for configuration and login verification.

Safety requirements:
  Remote mutation requires --remote, explicit --base-url, --qa-email,
  --admin-email, --mode, and --confirm configure-cse-qa-student.
  Passwords are never accepted as command-line options or printed.
  test@pasawise.com is recognized as a QA-pattern address.

Examples:
  node scripts/create-or-reset-qa-student.mjs --base-url http://127.0.0.1:5173 --admin-email admin@example.com --qa-email test@pasawise.com --mode unlocked

  node scripts/create-or-reset-qa-student.mjs --remote --base-url https://cse-course-platform.master-course.workers.dev --admin-email admin@example.com --qa-email test@pasawise.com --mode unlocked --confirm configure-cse-qa-student

  node scripts/create-or-reset-qa-student.mjs --remote --base-url https://cse-course-platform.master-course.workers.dev --admin-email admin@example.com --qa-email test@pasawise.com --inspect-only
`

function createApiClient(baseUrl, initialCookie = null) {
  let cookie = initialCookie

  return {
    async request(path, options = {}) {
      const method = options.method ?? 'GET'
      const url = resolveApiUrl(baseUrl, path)
      const headers = new Headers(options.headers)
      headers.set('accept', 'application/json')
      if (cookie !== null) headers.set('cookie', cookie)
      if (options.body !== undefined) headers.set('content-type', 'application/json')
      if (method !== 'GET' && method !== 'HEAD') {
        headers.set('x-cse-admin-csrf', csrfHeaderValue)
      }

      let response
      try {
        response = await fetch(url, { ...options, method, headers })
      } catch (error) {
        throw new Error(formatNetworkError(error, method, url), { cause: error })
      }

      const setCookie = response.headers.get('set-cookie')
      if (setCookie !== null) cookie = setCookie.split(';')[0] ?? null
      const responseText = await response.text()
      let body = null
      if (responseText.length > 0) {
        try {
          body = JSON.parse(responseText)
        } catch {
          throw new Error(
            `HTTP ${response.status} from ${method} ${url} returned a non-JSON response.`,
          )
        }
      }
      if (!response.ok || body?.success !== true) {
        throw new Error(formatHttpError(response.status, method, url, body))
      }
      return body.data
    },
  }
}

function requireValue(args, name) {
  const value = args.get(name)?.trim()
  if (value === undefined || value.length === 0) {
    throw new Error(`Pass --${name} <value>.`)
  }
  return value
}

function assertDashboardEnrollment(dashboard) {
  const courses = Array.isArray(dashboard?.courses) ? dashboard.courses : []
  const cse = courses.find((entry) => entry?.course?.slug === 'cse-professional')
  const enrollment = cse?.enrollment ?? cse?.course?.enrollment ?? null
  if (cse === undefined || enrollment?.hasAccess !== true) {
    throw new Error('QA login succeeded, but the dashboard did not show an active CSE Professional enrollment.')
  }
}

function flattenCurriculum(curriculum) {
  const rows = []
  for (const subject of curriculum?.subjects ?? []) {
    for (const topic of subject?.topics ?? []) {
      for (const lesson of topic?.lessons ?? []) {
        rows.push({ subject, topic, lesson })
      }
    }
  }
  return rows
}

async function verifyStudentHttpAccess(client, configured) {
  const me = await client.request('/api/auth/me')
  if (me?.user?.email !== configured.target.email || me?.user?.role !== 'student') {
    throw new Error('QA login verification returned the wrong user or a non-student role.')
  }

  const dashboard = await client.request('/api/student/dashboard')
  assertDashboardEnrollment(dashboard)
  const curriculum = await client.request('/api/student/courses/cse-professional/curriculum')
  const lessons = flattenCurriculum(curriculum)
  const lockedLessons = lessons.filter(({ lesson }) => lesson?.isAccessible !== true)
  if (configured.mode === 'unlocked' && lockedLessons.length > 0) {
    throw new Error(`Authenticated curriculum verification found ${lockedLessons.length} locked lesson(s).`)
  }

  const representativeLessons = []
  const subjectSlugs = new Set()
  for (const row of lessons) {
    if (subjectSlugs.has(row.subject.slug) || row.lesson.isAccessible !== true) {
      continue
    }
    subjectSlugs.add(row.subject.slug)
    await client.request(`/api/student/lessons/${encodeURIComponent(row.lesson.publicId)}`)
    representativeLessons.push({
      subjectSlug: row.subject.slug,
      lessonPublicId: row.lesson.publicId,
      passed: true,
    })
  }
  if (configured.mode === 'unlocked' && representativeLessons.length !== 4) {
    throw new Error('Authenticated verification could not open a representative lesson from every subject.')
  }

  for (const assessment of configured.verification.subjectAssessments) {
    await client.request(`/api/student/subject-assessments/${encodeURIComponent(assessment.assessmentSlug)}`)
  }
  const mockSlug = configured.verification.fullMockExamination.slug
  if (mockSlug === null) throw new Error('The Full Mock Examination was not present.')
  await client.request(`/api/student/mock-examinations/${encodeURIComponent(mockSlug)}`)

  return {
    login: 'passed',
    authMe: 'passed',
    dashboard: 'passed',
    activeEnrollment: 'passed',
    curriculum: 'passed',
    curriculumLessonCount: lessons.length,
    lockedCurriculumLessonCount: lockedLessons.length,
    representativeLessons,
    subjectAssessmentsChecked: configured.verification.subjectAssessments.length,
    fullMockChecked: true,
  }
}

function printHumanResult(result, loginVerification) {
  console.log('\nQA STUDENT CONFIGURATION')
  console.log(`Email: ${result.target.email}`)
  console.log(`Account: ${result.accountCreated ? 'Created' : 'Reused'}`)
  console.log(`Role: ${result.target.role}`)
  console.log(`Enrollment: CSE Professional — ${result.verification.enrollmentActive ? 'active' : 'inactive'}`)
  console.log(`Mode: ${result.mode}`)
  console.log(`Required completions seeded: ${result.changes.completionRecordsCreated + result.changes.completionRecordsUpdated}`)
  console.log('\nACCESS VERIFICATION')
  for (const subject of result.verification.subjects) {
    console.log(`${subject.title}: ${subject.accessible}/${subject.total} accessible`)
  }
  const accessibleAssessments = result.verification.subjectAssessments.filter((item) => item.available).length
  console.log(`Subject assessments: ${accessibleAssessments}/${result.verification.subjectAssessments.length} accessible`)
  console.log(`Full Mock: ${result.verification.fullMockExamination.available ? 'accessible' : 'locked'}`)
  console.log(`Login verification: ${loginVerification.login}`)
  console.log('Unrelated users modified: 0')
  console.log('\nQA CONFIGURATION: PASS')
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  if (args.get('help') === 'true') {
    console.log(helpText)
    return
  }

  const remote = args.get('remote') === 'true'
  const inspectOnly = args.get('inspect-only') === 'true'
  const qaEmail = requireValue(args, 'qa-email').toLowerCase()
  const mode = args.get('mode')
  if (!inspectOnly && mode !== 'unlocked' && mode !== 'fresh') {
    throw new Error('Pass --mode unlocked or --mode fresh.')
  }
  if (inspectOnly && mode !== undefined && mode !== 'unlocked' && mode !== 'fresh') {
    throw new Error('If supplied, --mode must be unlocked or fresh.')
  }

  if (remote && !args.has('base-url')) {
    throw new Error('Remote targets require --base-url <production-origin>.')
  }
  const baseUrl = normalizeBaseUrl(args.get('base-url') ?? defaultLocalBaseUrl)
  const local = isLocalBaseUrl(baseUrl)
  if (!local && !remote) {
    throw new Error('Remote targets require the explicit --remote flag.')
  }
  if (remote && local) {
    throw new Error('--remote requires a non-local --base-url production origin.')
  }
  if (remote && !inspectOnly && args.get('confirm') !== confirmationPhrase) {
    throw new Error(`Remote mutation requires --confirm ${confirmationPhrase}.`)
  }

  const nonQaConfirmation = args.get('allow-non-qa-email')?.trim().toLowerCase()
  if (!isQaEmail(qaEmail) && nonQaConfirmation !== qaEmail) {
    throw new Error(
      'The target does not look like a QA email. Pass '
        + `--allow-non-qa-email ${qaEmail} to confirm the exact address.`,
    )
  }

  const adminEmail = args.get('admin-email')?.trim().toLowerCase()
  const adminPassword = process.env.CSE_QA_ADMIN_PASSWORD
  const adminCookie = args.get('cookie') ?? null
  if (remote && !inspectOnly && (adminEmail === undefined || adminPassword === undefined)) {
    throw new Error('Remote mutation requires --admin-email and CSE_QA_ADMIN_PASSWORD.')
  }
  if (adminCookie === null && (adminEmail === undefined || adminPassword === undefined)) {
    throw new Error('Pass --admin-email and set CSE_QA_ADMIN_PASSWORD. Advanced cookie mode is available through --cookie.')
  }

  const adminClient = createApiClient(baseUrl, adminCookie)
  if (adminCookie === null) {
    await adminClient.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    })
  }
  await adminClient.request('/api/admin/auth-check')
  const inspection = await adminClient.request(
    `/api/admin/qa-students/target?email=${encodeURIComponent(qaEmail)}`,
  )
  console.log('QA STUDENT INSPECTION')
  console.log(JSON.stringify({ baseUrl, qaEmail, mutationPlanned: !inspectOnly, mode: inspectOnly ? null : mode, ...inspection }, null, 2))
  if (inspectOnly) {
    console.log('\nQA INSPECTION: PASS (no QA records mutated)')
    return
  }

  const qaPassword = process.env.CSE_QA_STUDENT_PASSWORD
  if (qaPassword === undefined) {
    throw new Error('Set CSE_QA_STUDENT_PASSWORD before mutation.')
  }
  const configured = await adminClient.request('/api/admin/qa-students/configure', {
    method: 'POST',
    body: JSON.stringify({
      email: qaEmail,
      password: qaPassword,
      mode,
      confirmation: confirmationPhrase,
      confirmNonQaEmail: !isQaEmail(qaEmail),
    }),
  })

  const studentClient = createApiClient(baseUrl)
  await studentClient.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: qaEmail, password: qaPassword }),
  })
  const loginVerification = await verifyStudentHttpAccess(studentClient, configured)
  printHumanResult(configured, loginVerification)
  console.log('\nQA_CONFIGURATION_JSON')
  console.log(JSON.stringify({
    operation: 'configure-cse-qa-student',
    result: configured,
    loginVerification,
    unrelatedUsersModified: 0,
    status: 'PASS',
  }, null, 2))
}

const isDirectExecution = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    console.error('\nQA CONFIGURATION: FAIL')
    process.exitCode = 1
  })
}