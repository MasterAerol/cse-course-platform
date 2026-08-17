import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/ratio-proportion-teaching-publisher.node.ts', 'tests/ratio-proportion-responsive.node.ts'],
  },
})
