import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/smart-recovery-skills-publisher.node.ts'],
  },
})
