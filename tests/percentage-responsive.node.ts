import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(path.resolve(import.meta.dirname, '../src/react-app/styles.css'), 'utf8')

describe('Percentage lesson responsive contract', () => {
  it('keeps desktop overflow inside the VisualTeachingBoard sequence', () => {
    expect(styles).toMatch(/\.lesson-page\s*\{[^}]*overflow-x:\s*hidden;/su)
    expect(styles).toMatch(/\.visual-teaching-board__scroll-shell\s*\{[^}]*overflow-x:\s*auto;/su)
    expect(styles).toMatch(/\.visual-teaching-board__sequence\s*\{[^}]*width:\s*max-content;/su)
    expect(styles).toMatch(/\.visual-teaching-board__memory\s*\{[^}]*margin-top:\s*1rem;/su)
  })

  it('stacks visuals and exposes the curriculum drawer trigger below desktop', () => {
    expect(styles).toMatch(/@media \(max-width:\s*700px\)[\s\S]*?\.visual-teaching-board__sequence,[\s\S]*?display:\s*grid;/u)
    expect(styles).toMatch(/@media \(min-width:\s*64rem\)[\s\S]*?\.lesson-curriculum-sidebar,[\s\S]*?overflow-y:\s*auto;/u)
    expect(styles).toMatch(/@media \(min-width:\s*34\.01rem\) and \(max-width:\s*63\.99rem\)[\s\S]*?\.mobile-curriculum-button\s*\{[\s\S]*?display:\s*inline-flex;/u)
    expect(styles).toMatch(/\.mobile-curriculum-drawer\s*\{[^}]*overflow-x:\s*hidden;/su)
  })
})