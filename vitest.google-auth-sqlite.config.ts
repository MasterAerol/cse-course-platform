import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/google-auth-sqlite-migration.node.ts'],
  },
})
