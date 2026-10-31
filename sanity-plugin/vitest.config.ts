import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// By default the tests run against the agentprose release this package depends on (node_modules).
// AGENTPROSE_SRC=1 runs them against this repository's adapter source instead.
const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  define: { __VERSION__: JSON.stringify('test') },
  resolve: process.env.AGENTPROSE_SRC
    ? { alias: [{ find: /^agentprose\/adapters\/sanity$/, replacement: src('../src/adapters/sanity.ts') }] }
    : {},
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
