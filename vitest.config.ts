import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const designSystemSource = readFileSync(
  path.resolve(process.cwd(), 'src', 'react-app', 'styles.css'),
  'utf8',
)

const browserAssetPaths = [
  'public/brand/pasawise-logo-primary.svg',
  'public/brand/pasawise-logo-header.svg',
  'public/brand/pasawise-brandmark.svg',
  'public/brand/pasawise-animated-loader.svg',
  'public/favicon.ico',
  'public/icons/favicon.svg',
  'public/apple-touch-icon.png',
  'public/icons/pwa-icon-192x192.png',
  'public/icons/pwa-icon-512x512.png',
  'public/icons/pwa-maskable-192x192.png',
  'public/icons/pwa-maskable-512x512.png',
  'public/site.webmanifest',
] as const

const browserAssetExistence = Object.fromEntries(
  browserAssetPaths.map((relativePath) => [
    relativePath,
    existsSync(path.resolve(process.cwd(), relativePath)),
  ]),
)

export default defineConfig({
  define: {
    'globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__': JSON.stringify(
      designSystemSource,
    ),
  },
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        path.join(import.meta.dirname, 'migrations'),
      )

      return {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
          },
        },
      }
    }),
  ],
  test: {
    provide: {
      browserAssetExistence,
    },
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
    },
  },
})
