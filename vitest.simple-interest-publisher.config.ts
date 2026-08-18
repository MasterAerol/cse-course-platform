import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['tests/simple-interest-teaching-publisher.node.ts','tests/simple-interest-responsive.node.ts']}})
