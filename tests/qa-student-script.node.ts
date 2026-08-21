import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  formatHttpError,
  formatNetworkError,
  isLocalBaseUrl,
  isQaEmail,
  normalizeBaseUrl,
  parseArgs,
  resolveApiUrl,
  supportedQaStudentOptions,
} from '../scripts/lib/qa-student-script-guards.mjs'

const script = path.resolve('scripts/create-or-reset-qa-student.mjs')

function run(args: string[]) {
  const environment = { ...process.env }
  delete environment.CSE_QA_ADMIN_PASSWORD
  delete environment.CSE_QA_STUDENT_PASSWORD
  return spawnSync(process.execPath, [script, ...args], {
    cwd: path.resolve('.'),
    encoding: 'utf8',
    env: environment,
    windowsHide: true,
  })
}

describe('QA student script safety', () => {
  it('documents the exact boolean flags and value-taking options', () => {
    expect(supportedQaStudentOptions.booleanFlags).toEqual([
      'help',
      'remote',
      'inspect-only',
    ])
    expect(supportedQaStudentOptions.valueOptions).toEqual([
      'base-url',
      'qa-email',
      'admin-email',
      'mode',
      'confirm',
      'cookie',
      'allow-non-qa-email',
    ])
  })

  it('prints normal help without requiring values or credentials', () => {
    const result = run(['--help'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Usage:')
    expect(result.stdout).toContain('--remote')
    expect(result.stdout).toContain('Boolean flags (do not pass true or false)')
    expect(result.stdout).toContain('CSE_QA_STUDENT_PASSWORD')
    expect(result.stderr).toBe('')
  })

  it('treats --remote as boolean and rejects the stray value in --remote true', () => {
    expect(parseArgs(['--remote'])).toEqual(new Map([['remote', 'true']]))
    expect(() => parseArgs(['--remote', 'true'])).toThrow(
      'Invalid argument near true. Boolean flags do not take values.',
    )
  })

  it('validates missing option values, unknown options, and invalid modes', () => {
    expect(() => parseArgs(['--base-url'])).toThrow('Missing value for --base-url.')
    expect(() => parseArgs(['--unknown'])).toThrow('Unsupported option --unknown')
    const invalidMode = run([
      '--qa-email', 'test@pasawise.com',
      '--mode', 'complete',
    ])
    expect(invalidMode.status).toBe(1)
    expect(invalidMode.stderr).toContain('Pass --mode unlocked or --mode fresh.')
  })

  it('normalizes an explicit origin and constructs production API URLs', () => {
    const origin = normalizeBaseUrl(
      'https://pasawise.com/',
    )
    expect(origin).toBe('https://pasawise.com')
    expect(resolveApiUrl(origin, '/api/admin/qa-students/configure')).toBe(
      'https://pasawise.com/api/admin/qa-students/configure',
    )
    expect(isLocalBaseUrl('http://127.0.0.1:5173')).toBe(true)
    expect(isLocalBaseUrl(origin)).toBe(false)
    expect(
      normalizeBaseUrl(
        'https://cse-course-platform.master-course.workers.dev/',
      ),
    ).toBe('https://cse-course-platform.master-course.workers.dev')
  })

  it('requires explicit remote origin, confirmation, and administrator authentication', () => {
    const missingOrigin = run([
      '--remote',
      '--qa-email', 'test@pasawise.com',
      '--mode', 'unlocked',
    ])
    const missingConfirmation = run([
      '--remote',
      '--base-url', 'https://example.com',
      '--qa-email', 'test@pasawise.com',
      '--mode', 'unlocked',
    ])
    const missingAdmin = run([
      '--remote',
      '--base-url', 'https://example.com',
      '--qa-email', 'test@pasawise.com',
      '--mode', 'unlocked',
      '--confirm', 'configure-cse-qa-student',
    ])

    expect(missingOrigin.stderr).toContain(
      'Remote targets require --base-url <production-origin>.',
    )
    expect(missingConfirmation.stderr).toContain(
      '--confirm configure-cse-qa-student',
    )
    expect(missingAdmin.stderr).toContain(
      'Remote mutation requires --admin-email and CSE_QA_ADMIN_PASSWORD.',
    )
  })

  it('recognizes test@pasawise.com and protects arbitrary addresses', () => {
    expect(isQaEmail('test@pasawise.com')).toBe(true)
    expect(isQaEmail('cse+qa@example.test')).toBe(true)
    expect(isQaEmail('learner@example.test')).toBe(false)

    const result = run([
      '--qa-email', 'learner@example.test',
      '--mode', 'fresh',
    ])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      '--allow-non-qa-email learner@example.test',
    )
  })

  it('formats network failures with method, resolved URL, and safe cause', () => {
    const cause = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })
    const message = formatNetworkError(
      new Error('fetch failed', { cause }),
      'POST',
      'https://example.com/api/admin/qa-students/configure',
    )

    expect(message).toContain('Failed to POST https://example.com/api/admin/qa-students/configure.')
    expect(message).toContain('No HTTP response was received.')
    expect(message).toContain('ECONNRESET: socket reset')
    expect(message).not.toContain('password')
  })

  it('formats safe HTTP status, error code, and message diagnostics', () => {
    expect(formatHttpError(403, 'GET', 'https://example.com/api/admin/auth-check', {
      success: false,
      error: { code: 'ADMIN_AUTH_REQUIRED', message: 'Administrator access is required.' },
    })).toContain('HTTP 403 while calling GET https://example.com/api/admin/auth-check.\nADMIN_AUTH_REQUIRED')
  })
})