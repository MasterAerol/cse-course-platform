import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [cloudflareTest(async () => ({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: { TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')) },
      d1Databases: { RECOVERY_CONSTRAINT_DB: 'smart-recovery-constraints' },
    },
  }))],
  test: { include: ['tests/smart-recovery-constraints.d1.ts'] },
})
