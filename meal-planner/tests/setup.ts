import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi, expect } from 'vitest'

// Custom matchers for Vitest (alternative to @testing-library/jest-dom)
expect.extend({
  toBeInTheDocument(received: Element | null) {
    const pass = received !== null && document.body.contains(received)
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`,
      actual: received,
      expected: 'element in document'
    }
  },
  toBeDisabled(received: HTMLElement) {
    const pass = received.hasAttribute('disabled')
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to be disabled`
          : `expected element to be disabled`,
      actual: received,
      expected: 'disabled element'
    }
  }
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))

// Mock environment variables for testing
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})
