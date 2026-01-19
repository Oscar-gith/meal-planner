import { vi } from 'vitest'

export const createMockSupabaseClient = () => {
  return {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      exchangeCodeForSession: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    })),
    rpc: vi.fn()
  }
}

export const mockSuccessfulAuth = (mockClient: any, user: any) => {
  mockClient.auth.getSession.mockResolvedValue({
    data: { session: { user, access_token: 'mock-token' } },
    error: null
  })
}

export const mockFailedAuth = (mockClient: any, errorMessage: string) => {
  mockClient.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: { message: errorMessage }
  })
}
