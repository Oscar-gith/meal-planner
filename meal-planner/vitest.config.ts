import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    css: false, // Disable CSS processing in tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts',
        '**/*.d.ts',
        'src/types/'
      ],
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lodash/isEqualWith': 'lodash/isEqualWith.js',
      'lodash/isEqual': 'lodash/isEqual.js'
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
  },
  css: {
    postcss: {
      plugins: []
    }
  }
})
