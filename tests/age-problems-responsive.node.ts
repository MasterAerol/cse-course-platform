import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
const styles=readFileSync(path.resolve(import.meta.dirname,'../src/react-app/styles.css'),'utf8')
describe('Age Problems timeline responsive contracts at 320–430px and 1024–1920px',()=>{
 it('keeps visual sequences inside their own desktop scroll shell',()=>{expect(styles).toMatch(/\.lesson-page\s*\{[^}]*overflow-x:\s*hidden/su);expect(styles).toMatch(/\.visual-teaching-board__scroll-shell\s*\{[^}]*overflow-x:\s*auto/su);expect(styles).toMatch(/\.visual-teaching-board__sequence\s*\{[^}]*width:\s*max-content/su);expect(styles).toMatch(/@media\s*\(min-width:\s*64rem\)[\s\S]*\.lesson-curriculum-sidebar[\s\S]*overflow-y:\s*auto/su);expect(styles).toMatch(/@media\s*\(min-width:\s*64rem\)[\s\S]*\.lesson-content[\s\S]*overflow-y:\s*auto/su)})
 it('stacks visuals on mobile and preserves drawer, focus, and page-overflow contracts',()=>{expect(styles).toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*\.visual-teaching-board__sequence\s*,[\s\S]*?\{[^}]*display:\s*grid/su);expect(styles).toMatch(/\.mobile-curriculum-drawer[^}]*overflow-x:\s*hidden/su);expect(styles).toMatch(/\.visual-teaching-board__scroll-button[^}]*min-(?:width|inline-size):/su);expect(styles).toContain(':focus-visible')})
})