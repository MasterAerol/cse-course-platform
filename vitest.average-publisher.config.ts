import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['tests/average-teaching-publisher.node.ts','tests/average-responsive.node.ts']}})