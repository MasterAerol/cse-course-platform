import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  isLocalBaseUrl,
  isQaEmail,
  parseArgs,
} from '../scripts/lib/qa-student-script-guards.mjs'

const script = path.resolve('scripts/create-or-reset-qa-student.mjs')

function run(args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: path.resolve('.'),
    encoding: 'utf8',
    env: { ...process.env },
    windowsHide: true,
  })
}

describe('QA student script safety', () => {
  it('parses supported modes and recognizes deliberately named QA addresses', () => {
    expect(
      parseArgs(['--mode', 'unlocked', '--qa-email', 'cse+qa@example.test']),
    ).toEqual(new Map([
      ['mode', 'unlocked'],
      ['qa-email', 'cse+qa@example.test'],
    ]))
    expect(isQaEmail('cse+qa@example.test')).toBe(true)
    expect(isQaEmail('learner@example.test')).toBe(false)
    expect(isLocalBaseUrl('http://127.0.0.1:5173')).toBe(true)
    expect(isLocalBaseUrl('https://example.com')).toBe(false)
  })

  it('refuses remote mutation without both the remote flag and confirmation phrase', () => {
    const missingRemote = run([
      '--base-url', 'https://example.com',
      '--qa-email', 'cse+qa@example.test',
      '--mode', 'unlocked',
    ])
    const missingConfirmation = run([
      '--base-url', 'https://example.com',
      '--remote',
      '--qa-email', 'cse+qa@example.test',
      '--mode', 'unlocked',
    ])

    expect(missingRemote.status).toBe(1)
    expect(missingRemote.stderr).toContain('explicit --remote flag')
    expect(missingConfirmation.status).toBe(1)
    expect(missingConfirmation.stderr).toContain(
      '--confirm configure-cse-qa-student',
    )
  })

  it('refuses a non-QA-looking target unless the exact email is confirmed', () => {
    const result = run([
      '--qa-email', 'learner@example.test',
      '--mode', 'fresh',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      '--allow-non-qa-email learner@example.test',
    )
  })
})
