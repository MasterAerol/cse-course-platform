import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/lesson-block-wrangler-migration.node.ts'],
  },
})