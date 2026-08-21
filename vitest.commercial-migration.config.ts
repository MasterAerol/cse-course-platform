import path from 'node:path'

import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        d1Persist: false,
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(import.meta.dirname, 'migrations'),
          ),
        },
        d1Databases: {
          FRESH_COMMERCIAL_MIGRATION_DB: 'commercial-fresh',
          UPGRADE_COMMERCIAL_MIGRATION_DB: 'commercial-upgrade',
        },
      },
    })),
  ],
  test: { include: ['tests/commercial-migration.d1.ts'] },
})
