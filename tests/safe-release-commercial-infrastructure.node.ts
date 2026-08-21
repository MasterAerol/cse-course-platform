import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  APPROVED_COMMERCIAL_INFRASTRUCTURE,
  validateApprovedMigrationRelease,
  validateApprovedWranglerRelease,
} from '../scripts/lib/safe-release.mjs'

const migrationContent = fs.readFileSync(APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationFile, 'utf8')
const baselineWrangler = JSON.stringify({
  name: 'cse-course-platform',
  vars: { ENVIRONMENT: 'production', REGISTRATION_MODE: 'closed' },
  d1_databases: [{ binding: 'DB', database_name: 'cse-course-platform' }],
})
const approvedWrangler = JSON.stringify({
  name: 'cse-course-platform',
  vars: { ENVIRONMENT: 'production', REGISTRATION_MODE: 'closed' },
  d1_databases: [{ binding: 'DB', database_name: 'cse-course-platform' }],
  r2_buckets: [{
    binding: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Binding,
    bucket_name: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket,
  }],
})
const privateBucket = {
  exists: true,
  name: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket,
  devUrlEnabled: false,
  customDomains: [],
}

describe('Safe Release verified Commercial Access infrastructure', () => {
  it('A: blocks migration 0017 when it is not applied remotely', () => {
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [],
      pendingMigrations: [APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationName],
    })).toThrow('not recorded as applied')
  })

  it('B: permits exact migration 0017 only when already applied with nothing pending', () => {
    expect(validateApprovedMigrationRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationFile],
      content: migrationContent,
      appliedMigrations: [APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toMatchObject({ applied: true, pending: [] })
  })

  it('C: blocks migration contents changed after remote application', () => {
    expect(() => validateApprovedMigrationRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationFile],
      content: migrationContent + '\n-- changed after application',
      appliedMigrations: [APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationName],
      pendingMigrations: [],
    })).toThrow('approved SHA-256')
  })

  it('D: permits only the approved binding to an existing private bucket', () => {
    expect(validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile],
      baselineContent: baselineWrangler,
      currentContent: approvedWrangler,
      bucketState: privateBucket,
    })).toEqual({
      binding: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Binding,
      bucketName: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket,
      private: true,
    })
  })

  it('E: blocks a Wrangler binding whose R2 resource is missing', () => {
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile],
      baselineContent: baselineWrangler,
      currentContent: approvedWrangler,
      bucketState: { ...privateBucket, exists: false },
    })).toThrow('missing or mismatched')
  })

  it('F: blocks unrelated Wrangler configuration changes', () => {
    const unrelatedChange = JSON.stringify({
      ...JSON.parse(approvedWrangler),
      compatibility_date: '2099-01-01',
    })
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile],
      baselineContent: baselineWrangler,
      currentContent: unrelatedChange,
      bucketState: privateBucket,
    })).toThrow('beyond the approved')
  })

  it('keeps unknown migrations and public R2 exposure fail-closed', () => {
    expect(() => validateApprovedMigrationRelease({
      files: ['migrations/0018_unknown.sql'],
      content: migrationContent,
      appliedMigrations: ['0018_unknown.sql'],
      pendingMigrations: [],
    })).toThrow('applies only')
    expect(() => validateApprovedWranglerRelease({
      files: [APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile],
      baselineContent: baselineWrangler,
      currentContent: approvedWrangler,
      bucketState: { ...privateBucket, devUrlEnabled: true },
    })).toThrow('r2.dev')
  })
})
