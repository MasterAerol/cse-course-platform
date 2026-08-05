import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [cloudflareTest(async () => ({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: { TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')) },
      d1Databases: {
        FRESH_MIGRATION_TEST_DB: 'smart-recovery-fresh',
        UPGRADE_MIGRATION_TEST_DB: 'smart-recovery-upgrade',
      },
    },
  }))],
  test: { include: ['tests/smart-recovery-migration.d1.ts'] },
})
