import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Build-time guard with no runtime implementation; see the stub's note.
      'server-only': path.resolve(__dirname, './tests/support/server-only-stub.ts'),
    },
  },
})
