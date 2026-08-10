import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [cloudflareTest(async () => ({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: { TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')) },
      d1Databases: {
        FRESH_LESSON_BLOCK_MIGRATION_DB: 'lesson-block-fresh',
        UPGRADE_LESSON_BLOCK_MIGRATION_DB: 'lesson-block-upgrade',
      },
    },
  }))],
  test: { include: ['tests/lesson-block-migration.d1.ts'] },
})