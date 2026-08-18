import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['tests/sentence-structure-errors-teaching-publisher.node.ts','tests/sentence-structure-errors-responsive.node.ts']}})
