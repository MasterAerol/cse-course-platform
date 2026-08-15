import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/fractions-teaching-publisher.node.ts', 'tests/fractions-responsive.node.ts'],
  },
})
