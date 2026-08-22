import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/safe-release.node.ts',
      'tests/safe-release-scoped-staging.node.ts',
      'tests/safe-release-commercial-infrastructure.node.ts',
      'tests/safe-release-google-auth-infrastructure.node.ts',
      'tests/safe-release-commercial-beta-infrastructure.node.ts',
      'tests/safe-release-auth-ux-infrastructure.node.ts',
    ],
  },
})