import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/commercial-wrangler-migration.node.ts'],
  },
})
