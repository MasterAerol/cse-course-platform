import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['tests/reading-comprehension-teaching-publisher.node.ts','tests/reading-comprehension-responsive.node.ts']}})
