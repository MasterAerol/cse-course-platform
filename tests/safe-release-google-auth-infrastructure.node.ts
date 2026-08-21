import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  APPROVED_COMMERCIAL_INFRASTRUCTURE,
  APPROVED_GOOGLE_AUTH_INFRASTRUCTURE,
  validateApprovedMigrationRelease,
  validateApprovedWranglerRelease,
} from '../scripts/lib/safe-release.mjs'

const migrationContent = fs.readFileSync(APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.migrationFile, 'utf8')
const baseline = {
  name: 'cse-course-platform',
  vars: { ENVIRONMENT: 'production', REGISTRATION_MODE: 'closed' },
  d1_databases: [{ binding: 'DB', database_name: 'cse-course-platform' }],
  r2_buckets: [{
    binding: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Binding,
    bucket_name: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket,
  }],
}
const approved = {
  ...baseline,
  vars: {
    ...baseline.vars,
    GOOGLE_CLIENT_ID: APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.googleClientId,
  },
}

describe('Safe Release verified Google authentication infrastructure', () => {
  it('permits exact migration 0018 only after remote application with nothing pending', () => {
    expect(validateApprovedMigrationRelease({
      files: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toMatchObject({
      name: APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.migrationName,
      applied: true,
      pending: [],
    })
  })

  it('rejects migration 0018 content changed after approval', () => {
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.migrationFile],
      content: migrationContent + '\n-- changed after approval',
      appliedMigrations: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toThrow('approved SHA-256')
  })

  it('permits only the exact public Client ID addition while registration stays closed', () => {
    expect(validateApprovedWranglerRelease({
      files: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(approved),
    })).toEqual({
      kind: 'google-auth',
      clientId: APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.googleClientId,
      registrationMode: 'closed',
    })
  })

  it('blocks opening registration or changing the approved Client ID', () => {
    const openedRegistration = {
      ...approved,
      vars: { ...approved.vars, REGISTRATION_MODE: 'open' },
    }
    const changedClient = {
      ...approved,
      vars: { ...approved.vars, GOOGLE_CLIENT_ID: 'different.apps.googleusercontent.com' },
    }
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(openedRegistration),
    })).toThrow('registration closed')
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(baseline),
      currentContent: JSON.stringify(changedClient),
    })).toThrow('approved GOOGLE_CLIENT_ID')
  })

  it('rejects an already-open committed registration baseline', () => {
    const openBaseline = {
      ...baseline,
      vars: { ...baseline.vars, REGISTRATION_MODE: 'open' },
    }
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_GOOGLE_AUTH_INFRASTRUCTURE.wranglerFile],
      baselineContent: JSON.stringify(openBaseline),
      currentContent: JSON.stringify(approved),
    })).toThrow('registration gate to remain closed')
  })
})
