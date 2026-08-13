import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/percentage-visual-publisher.node.ts', 'tests/percentage-responsive.node.ts'],
  },
})