import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/decimals-teaching-publisher.node.ts', 'tests/decimals-responsive.node.ts'],
  },
})
