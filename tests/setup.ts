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

// Existing API suites that bind REGISTRATION_MODE='open' intentionally exercise
// public registration. Production remains closed, while focused commercial tests
// reset this database control to verify the fail-closed default independently.
await testEnvironment.DB.prepare(
  "UPDATE commercial_settings SET enabled=1 WHERE setting_key='public_signup'",
).run()
