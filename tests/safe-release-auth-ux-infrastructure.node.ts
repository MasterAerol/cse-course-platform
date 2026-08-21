import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  APPROVED_AUTH_UX_INFRASTRUCTURE,
  APPROVED_COMMERCIAL_INFRASTRUCTURE,
  APPROVED_GOOGLE_AUTH_INFRASTRUCTURE,
  parseWorkerSecretNames,
  validateApprovedMigrationRelease,
  validateApprovedWranglerRelease,
} from '../scripts/lib/safe-release.mjs'

const migrationContent = fs.readFileSync(
  APPROVED_AUTH_UX_INFRASTRUCTURE.migrationFile,
  'utf8',
)
const baseline = {
  name: 'cse-course-platform',
  vars: {
    ENVIRONMENT: 'production',
    REGISTRATION_MODE: 'closed',
    GOOGLE_CLIENT_ID: APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.googleClientId,
  },
  ratelimits: [
    {
      name: 'LOGIN_IP_RATE_LIMITER',
      namespace_id: '31001',
      simple: { limit: 10, period: 60 },
    },
  ],
  d1_databases: [{ binding: 'DB', database_name: 'cse-course-platform' }],
  r2_buckets: [{
    binding: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Binding,
    bucket_name: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket,
  }],
}
const approved = {
  ...baseline,
  secrets: {
    required: [...APPROVED_AUTH_UX_INFRASTRUCTURE.requiredSecrets],
  },
  ratelimits: [
    ...baseline.ratelimits,
    ...APPROVED_AUTH_UX_INFRASTRUCTURE.rateLimits,
  ],
}
const configuredSecretNames = [
  'RESEND_API_KEY',
  'EMAIL_VERIFICATION_SECRET',
]

describe('Safe Release verified Authentication UX v2 infrastructure', () => {
  it('permits exact migration 0019 only after remote application with nothing pending', () => {
    expect(validateApprovedMigrationRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [APPROVED_AUTH_UX_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toMatchObject({
      name: APPROVED_AUTH_UX_INFRASTRUCTURE.migrationName,
      applied: true,
      pending: [],
    })
  })

  it('rejects unapplied, pending, or changed migration 0019', () => {
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [],
      pendingMigrations: [APPROVED_AUTH_UX_INFRASTRUCTURE.migrationName],
    })).toThrow('not recorded as applied')
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.migrationFile],
      content: migrationContent + '\n-- changed after approval',
      appliedMigrations: [APPROVED_AUTH_UX_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toThrow('approved SHA-256')
  })

  it('parses secret names without values and permits only the exact approved config', () => {
    const names = parseWorkerSecretNames(JSON.stringify([
      { name: 'RESEND_API_KEY', type: 'secret_text' },
      { name: 'EMAIL_VERIFICATION_SECRET', type: 'secret_text' },
    ]))
    expect(names).toEqual(configuredSecretNames)
    expect(validateApprovedWranglerRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(approved),
      secretNames: names,
    })).toMatchObject({
      kind: 'authentication-ux',
      requiredSecrets: APPROVED_AUTH_UX_INFRASTRUCTURE.requiredSecrets,
      registrationMode: 'closed',
      secretsConfigured: true,
    })
  })

  it('blocks release when either required production secret is missing', () => {
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(approved),
      secretNames: ['RESEND_API_KEY'],
    })).toThrow('EMAIL_VERIFICATION_SECRET')
  })

  it('blocks registration opening and unrelated Wrangler changes', () => {
    const openedRegistration = structuredClone(approved)
    openedRegistration.vars.REGISTRATION_MODE = 'open'
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(openedRegistration),
      secretNames: configuredSecretNames,
    })).toThrow('REGISTRATION_MODE to remain closed')

    const unrelated = { ...approved, compatibility_date: '2099-01-01' }
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_AUTH_UX_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(unrelated),
      secretNames: configuredSecretNames,
    })).toThrow('beyond the approved Authentication UX')
  })
})
