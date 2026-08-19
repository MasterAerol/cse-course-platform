import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PasaWisePageLoader } from '../src/react-app/components/PasaWiseLoader'

describe('PasaWise full-page loader', () => {
  it('renders only the accessible animated brand splash', () => {
    const markup = renderToStaticMarkup(
      <PasaWisePageLoader label="Opening your lesson" />,
    )

    expect(markup).toContain('<main class="pasawise-page-loader">')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('/brand/pasawise-animated-loader.svg')
    expect(markup).toContain('<span class="sr-only">Opening your lesson</span>')

    expect(markup).not.toContain('<header')
    expect(markup).not.toContain('<nav')
    expect(markup).not.toContain('<h1')
    expect(markup).not.toContain('<p')
    expect(markup).not.toContain('page-shell')
    expect(markup).not.toContain('LearnerTopbar')
  })
})
