import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE,
  validateApprovedMigrationRelease,
  validateApprovedWranglerRelease,
} from '../scripts/lib/safe-release.mjs'

const migrationContent = fs.readFileSync(
  APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationFile,
  'utf8',
)
const current = JSON.parse(
  fs.readFileSync(APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.wranglerFile, 'utf8'),
) as { vars: { REGISTRATION_MODE: string }; compatibility_date: string }
const baseline = structuredClone(current)
baseline.vars.REGISTRATION_MODE = 'closed'
const secretNames = ['EMAIL_VERIFICATION_SECRET', 'RESEND_API_KEY']

describe('Safe Release verified commercial simulation infrastructure', () => {
  it('permits exact migration 0020 only after remote application with nothing pending', () => {
    expect(validateApprovedMigrationRelease({
      files: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toMatchObject({
      name: APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationName,
      applied: true,
      pending: [],
    })
  })

  it('rejects changed, unapplied, or pending migration 0020', () => {
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationFile],
      content: `${migrationContent}\n-- changed`,
      appliedMigrations: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toThrow('approved SHA-256')
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [],
      pendingMigrations: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.migrationName],
    })).toThrow('not recorded as applied')
  })

  it('permits only registration closed-to-open with required secret names present', () => {
    expect(validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(current),
      secretNames,
    })).toMatchObject({
      kind: 'commercial-simulation',
      registrationMode: 'open',
      secretsConfigured: true,
    })
  })

  it('blocks missing secrets and every unrelated Wrangler change', () => {
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(current),
      secretNames: ['RESEND_API_KEY'],
    })).toThrow('EMAIL_VERIFICATION_SECRET')

    const unrelated = structuredClone(current)
    unrelated.compatibility_date = '2099-01-01'
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(unrelated),
      secretNames,
    })).toThrow('only REGISTRATION_MODE closed-to-open')
  })
})
