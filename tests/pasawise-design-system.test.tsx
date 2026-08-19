import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, inject, it } from 'vitest'

import indexSource from '../index.html?raw'
import manifestSource from '../public/site.webmanifest?raw'
import { PasaWiseBrand } from '../src/react-app/components/PasaWiseBrand'
import brandSource from '../src/react-app/components/PasaWiseBrand.tsx?raw'
import { PasaWiseLoader } from '../src/react-app/components/PasaWiseLoader'
import loaderSource from '../src/react-app/components/PasaWiseLoader.tsx?raw'
import dashboardSource from '../src/react-app/pages/DashboardPage.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

declare module 'vitest' {
  export interface ProvidedContext {
    browserAssetExistence: Record<string, boolean>
  }
}

const injectedDesignSystemSource: unknown =
  globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__

if (typeof injectedDesignSystemSource !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}

const designSystemSource = injectedDesignSystemSource

const browserAssetExistence = inject('browserAssetExistence')

function decodeTextDataUrl(value: string, description: string): string {
  const separator = value.indexOf(',')
  if (!value.startsWith('data:') || separator === -1) {
    throw new Error(`${description} did not resolve to an inline data URI.`)
  }

  const metadata = value.slice(0, separator)
  const payload = value.slice(separator + 1)
  return metadata.endsWith(';base64') ? atob(payload) : decodeURIComponent(payload)
}

describe('PasaWise design system', () => {
  it('centralizes the approved brand, status, and layout tokens', () => {
    expect(typeof designSystemSource).toBe('string')
    expect(designSystemSource.length).toBeGreaterThan(0)

    for (const declaration of [
      '--brand-navy: #0b2f63',
      '--brand-blue: #1a73d9',
      '--brand-gold: #f4b41a',
      '--brand-selection: #dcebff',
      '--surface-app: #f6f8fc',
      '--color-text-primary: #10213d',
      '--color-text-muted: #5f6f85',
      '--color-border: #dce4ef',
      '--color-success-bg: #e8f7f0',
      '--color-warning-bg: #fff5d6',
      '--color-danger-bg: #fdecef',
      '--color-info-bg: #eaf3ff',
      '--layout-reading-max: 53.75rem',
    ]) {
      expect(designSystemSource).toContain(declaration)
    }
  })

  it('uses the approved loader as a real status with non-visual copy', () => {
    const markup = renderToStaticMarkup(
      <PasaWiseLoader label="Opening your lesson" />,
    )

    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('/brand/pasawise-animated-loader.svg')
    expect(markup).toContain('class="sr-only"')
    expect(markup).toContain('Opening your lesson')
  })

  it('switches the horizontal header logo to the brandmark on narrow screens', () => {
    const markup = renderToStaticMarkup(<PasaWiseBrand variant="header" />)

    expect(markup).toContain('/brand/pasawise-logo-header.svg')
    expect(markup).toContain('media="(max-width: 25rem)"')
    expect(markup).toContain('/brand/pasawise-brandmark.svg')
    expect(markup).toContain('alt="PasaWise"')
  })

  it('ships the approved browser and installable-app assets', () => {
    for (const [assetName, assetExists] of Object.entries(browserAssetExistence)) {
      expect(assetExists, assetName).toBe(true)
    }

    expect(brandSource).toContain("primary: '/brand/pasawise-logo-primary.svg'")
    expect(brandSource).toContain("header: '/brand/pasawise-logo-header.svg'")
    expect(brandSource).toContain("mark: '/brand/pasawise-brandmark.svg'")
    expect(loaderSource).toContain('src="/brand/pasawise-animated-loader.svg"')

    const faviconMatch = indexSource.match(
      /<link rel="icon" href="([^"]+)" type="image\/svg\+xml" \/>/,
    )
    expect(faviconMatch).not.toBeNull()
    const faviconHref = faviconMatch?.[1]
    if (faviconHref === undefined) {
      throw new Error('PasaWise SVG favicon metadata is missing.')
    }

    if (faviconHref.startsWith('data:image/svg+xml')) {
      const faviconSource = decodeTextDataUrl(faviconHref, 'PasaWise favicon')
      expect(faviconSource).toContain('<svg')
      expect(faviconSource).toContain('PasaWise favicon')
      expect(faviconSource).toContain('#0B2F63')
      expect(faviconSource).toContain('#F4B41A')
    } else {
      expect(faviconHref).toBe('/icons/favicon.svg')
    }

    expect(indexSource).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />')
    expect(indexSource).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />')
    expect(indexSource).toContain('<meta name="theme-color" content="#0B2F63" />')
    expect(indexSource).toContain('<link rel="manifest" href="/site.webmanifest" />')
    expect(indexSource).toContain('<title>PasaWise | Civil Service Exam Review</title>')

    for (const iconUrl of [
      '/icons/pwa-icon-192x192.png',
      '/icons/pwa-icon-512x512.png',
      '/icons/pwa-maskable-192x192.png',
      '/icons/pwa-maskable-512x512.png',
    ]) {
      expect(manifestSource).toContain(`"src": "${iconUrl}"`)
    }
  })

  it('keeps Continue Learning and Smart Recovery ahead of supporting tools', () => {
    const priorityGrid = dashboardSource.indexOf('dashboard-priority-grid')
    const continueLearning = dashboardSource.indexOf(
      '<ContinueLearningCard',
      priorityGrid,
    )
    const smartRecovery = dashboardSource.indexOf(
      '<SmartRecoveryCard',
      priorityGrid,
    )
    const toolGrid = dashboardSource.indexOf('dashboard-tools-grid')

    expect(priorityGrid).toBeGreaterThan(-1)
    expect(continueLearning).toBeGreaterThan(priorityGrid)
    expect(smartRecovery).toBeGreaterThan(continueLearning)
    expect(toolGrid).toBeGreaterThan(smartRecovery)

    for (const supportingTool of [
      '<SubjectAssessmentCard',
      '<MockExamCard',
      '<ReadinessCard',
      '<MistakeNotebookCard',
    ]) {
      expect(dashboardSource.indexOf(supportingTool, toolGrid)).toBeGreaterThan(
        toolGrid,
      )
    }
  })
})
