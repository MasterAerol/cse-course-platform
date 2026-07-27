import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'

interface TestEnvironment extends Cloudflare.Env {
  TEST_MIGRATIONS: D1Migration[]
}

// The test-only binding is injected by vitest.config.ts, not wrangler.jsonc.
const testEnvironment = env as TestEnvironment

await applyD1Migrations(
  testEnvironment.DB,
  testEnvironment.TEST_MIGRATIONS,
)
