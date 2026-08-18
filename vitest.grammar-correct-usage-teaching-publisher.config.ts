import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'node',include:['tests/grammar-correct-usage-teaching-publisher.node.ts','tests/grammar-correct-usage-responsive.node.ts']}})
