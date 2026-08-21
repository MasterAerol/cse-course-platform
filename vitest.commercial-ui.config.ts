import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/commercial-access-ui.test.tsx'],
  },
})
