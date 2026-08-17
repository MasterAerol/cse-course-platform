import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['tests/work-rate-teaching-publisher.node.ts','tests/work-rate-responsive.node.ts']}})
