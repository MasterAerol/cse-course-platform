import { describe, expect, it } from 'vitest'

import drawerSource from '../src/react-app/components/MobileCurriculumDrawer.tsx?raw'
import lessonItemSource from '../src/react-app/components/CurriculumLessonItem.tsx?raw'
import navigationSource from '../src/react-app/components/LessonNavigation.tsx?raw'
import topicSource from '../src/react-app/components/CurriculumTopic.tsx?raw'
import visualSource from '../src/react-app/components/VisualTeachingBoard.tsx?raw'
import pageSource from '../src/react-app/pages/LessonPage.tsx?raw'

declare global {
  var __PASAWISE_DESIGN_SYSTEM_SOURCE__: unknown
}

const injectedStyles: unknown = globalThis.__PASAWISE_DESIGN_SYSTEM_SOURCE__
if (typeof injectedStyles !== 'string') {
  throw new Error('Vitest did not inject the PasaWise design-system source.')
}
const stylesSource = injectedStyles

function hasRule(selector: string, declarations: RegExp[]): boolean {
  const sourceWithoutComments = stylesSource.replace(/\/\*[\s\S]*?\*\//g, '')
  return Array.from(sourceWithoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/gs)).some(
    (match) =>
      (match[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .includes(selector) &&
      declarations.every((declaration) => declaration.test(match[2] ?? '')),
  )
}

describe('PasaWise lesson reader polish', () => {
  it('keeps curriculum disclosure accessible while reducing repeated action text', () => {
    expect(topicSource).toContain('aria-expanded={expanded}')
    expect(topicSource).toContain('aria-controls={panelId}')
    expect(topicSource).toContain('curriculum-toggle__chevron')
    expect(topicSource).toContain('hasCurrentLesson')
    expect(topicSource).toContain('completedLessonCount')
    expect(topicSource).not.toContain('Show lessons')
    expect(topicSource).not.toContain('Hide lessons')
  })

  it('preserves current, completed, and locked lesson states with textual labels', () => {
    expect(lessonItemSource).toContain('lesson-item--current')
    expect(lessonItemSource).toContain("aria-current={isCurrent ? 'page' : undefined}")
    expect(lessonItemSource).toContain("? 'Completed'")
    expect(lessonItemSource).toContain("{commercialLock ? 'Premium' : 'Locked'}")
    expect(lessonItemSource).toContain("? 'Unlock the complete PasaWise experience.'")
    expect(lessonItemSource).toContain(": 'Complete the previous lesson first.'")
    expect(lessonItemSource).toContain("isCurrent ? 'Current' : progressLabel")
  })

  it('uses a compact reader header and natural page scrolling', () => {
    expect(pageSource).toContain('lesson-reader__meta')
    expect(pageSource).toContain('min read')
    expect(pageSource).toContain('lesson-progress-status--${state.lesson.progress.status}')
    expect(pageSource).toContain("? 'Completed'")
    expect(pageSource).not.toContain('activateLessonDocumentViewport')
    expect(pageSource).not.toContain('data-scroll-pane="lesson"')
    expect(pageSource).toContain('data-scroll-pane="curriculum"')
  })

  it('keeps desktop reading width bounded and only the curriculum independently scrollable', () => {
    expect(
      hasRule('.lesson-breadcrumb', [
        /width:\s*min\(100%,\s*var\(--layout-reading-max\)\)/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.lesson-content', [
        /height:\s*auto/,
        /overflow:\s*visible/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.lesson-curriculum-sidebar', [
        /max-height:\s*calc\(100vh\s*-\s*6\.5rem\)/,
        /overflow-y:\s*auto/,
        /position:\s*sticky/,
      ]),
    ).toBe(true)
  })

  it('contains visual teaching overflow inside its own accessible scroller', () => {
    expect(visualSource).toContain('Visual Example')
    expect(visualSource).toContain('data-testid="visual-scroll-shell"')
    expect(visualSource).toContain('tabIndex={0}')
    expect(visualSource).toContain('aria-label="Scroll visual teaching board left"')
    expect(visualSource).toContain('aria-label="Scroll visual teaching board right"')
    expect(
      hasRule('.visual-teaching-board', [
        /contain:\s*inline-size/,
        /max-width:\s*100%/,
        /min-width:\s*0/,
        /width:\s*100%/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.visual-teaching-board__scroll-shell', [
        /max-width:\s*100%/,
        /overflow-x:\s*auto/,
        /overscroll-behavior-inline:\s*contain/,
        /scroll-snap-type:\s*x\s+(?:proximity|mandatory)/,
      ]),
    ).toBe(true)
  })

  it('wraps long teaching and explanation text inside each desktop card', () => {
    expect(
      hasRule('.visual-teaching-board__expression', [
        /font-size:\s*clamp\(/,
        /max-width:\s*100%/,
        /min-width:\s*0/,
        /overflow-wrap:\s*anywhere/,
        /white-space:\s*normal/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.visual-teaching-board__token', [
        /max-width:\s*100%/,
        /overflow-wrap:\s*anywhere/,
        /white-space:\s*normal/,
      ]),
    ).toBe(true)
    expect(
      hasRule('.visual-teaching-board__transition > span', [
        /max-width:\s*100%/,
        /min-width:\s*0/,
        /overflow-wrap:\s*anywhere/,
      ]),
    ).toBe(true)
  })

  it('uses fluid snap-aligned cards inside the mobile teaching track', () => {
    expect(stylesSource).toContain('@media (max-width: 43.75rem)')
    expect(hasRule('.visual-teaching-board__pair', [/display:\s*contents/])).toBe(true)
    for (const selector of [
      '.visual-teaching-board__stage',
      '.visual-teaching-board__transition',
    ]) {
      expect(
        hasRule(selector, [
          /flex:\s*0\s+0\s+88%/,
          /max-width:\s*88%/,
          /min-width:\s*0/,
          /width:\s*88%/,
        ]),
      ).toBe(true)
    }
    expect(
      hasRule('.visual-teaching-board__stage', [/scroll-snap-align:\s*start/]),
    ).toBe(true)
  })

  it('preserves the mobile drawer and previous/next route contracts', () => {
    expect(pageSource).toContain('data-testid="curriculum-trigger"')
    expect(drawerSource).toContain('data-testid="curriculum-drawer"')
    expect(drawerSource).toContain('aria-label="Close curriculum"')
    expect(navigationSource).toContain('Previous · {previousLesson.title}')
    expect(navigationSource).toContain('Next Lesson · {nextLesson.title}')
    expect(navigationSource).toContain('/lessons/${previousLesson.publicId}')
    expect(navigationSource).toContain('/lessons/${nextLesson.publicId}')
    expect(stylesSource).toMatch(
      /@media \(max-width: 63\.99rem\)[\s\S]*?\.mobile-curriculum-button\s*\{[^}]*display:\s*inline-flex/,
    )
    expect(stylesSource).toMatch(
      /@media \(max-width: 43\.75rem\)[\s\S]*?\.lesson-navigation\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
  })
})
