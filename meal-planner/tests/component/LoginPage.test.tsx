import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { createMockSupabaseClient } from '../utils/supabase-mock'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn()
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams()
}))

// Mock Supabase client
const mockSupabase = createMockSupabaseClient()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders login form elements', () => {
      render(<LoginPage />)

      // Check title and branding
      expect(screen.getByText('Meal Planner')).toBeInTheDocument()
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()

      // Check buttons
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()

      // Check toggle link
      expect(screen.getByText(/¿no tienes cuenta\? regístrate/i)).toBeInTheDocument()
    })

    it('renders in login mode by default', () => {
      render(<LoginPage />)

      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
    })
  })

  describe('Email/Password Login', () => {
    it('submits login form with email and password', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' }, session: {} },
        error: null
      })

      render(<LoginPage />)

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Submit
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await user.click(submitButton)

      // Verify Supabase was called correctly
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      // Verify redirect to /planes
      expect(mockPush).toHaveBeenCalledWith('/planes')
    })

    it('displays error message on failed login', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })

      render(<LoginPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      // Verify no redirect happened
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('disables form during submission', async () => {
      const user = userEvent.setup()
      // Simulate slow network
      mockSupabase.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<LoginPage />)

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')

      // Submit
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
      await user.click(submitButton)

      // Check button shows loading state
      await waitFor(() => {
        expect(screen.getByText(/procesando/i)).toBeInTheDocument()
      })

      // Check inputs are disabled
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/contraseña/i)).toBeDisabled()
    })
  })

  describe('Sign Up Mode', () => {
    it('toggles to sign up mode', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      // Initially in login mode
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument()

      // Click toggle
      await user.click(screen.getByText(/¿no tienes cuenta\? regístrate/i))

      // Now in sign up mode
      expect(screen.getByText('Crea tu cuenta para comenzar')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
      expect(screen.getByText(/¿ya tienes cuenta\? inicia sesión/i)).toBeInTheDocument()
    })

    it('submits sign up form', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com' },
          session: { access_token: 'token' }
        },
        error: null
      })

      render(<LoginPage />)

      // Toggle to sign up
      await user.click(screen.getByText(/¿no tienes cuenta\? regístrate/i))

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

      // Verify Supabase was called correctly
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: expect.stringContaining('/login/callback')
          }
        })
      })

      // Verify redirect to /planes (auto-login after signup)
      expect(mockPush).toHaveBeenCalledWith('/planes')
    })

    it('shows email confirmation message when required', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com' },
          session: null // No session means email confirmation required
        },
        error: null
      })

      render(<LoginPage />)

      // Toggle to sign up
      await user.click(screen.getByText(/¿no tienes cuenta\? regístrate/i))

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'password123')
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

      // Verify email confirmation message is shown
      await waitFor(() => {
        expect(screen.getByText(/por favor revisa tu email/i)).toBeInTheDocument()
      })

      // Should NOT redirect
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('clears error when toggling between modes', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      })

      render(<LoginPage />)

      // Submit login with error
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

      // Error should be visible
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Toggle to sign up
      await user.click(screen.getByText(/¿no tienes cuenta\? regístrate/i))

      // Error should be cleared
      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
    })
  })

  describe('Google OAuth', () => {
    it('initiates Google OAuth flow', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/...' },
        error: null
      })

      render(<LoginPage />)

      // Click Google button
      const googleButton = screen.getByRole('button', { name: /google/i })
      await user.click(googleButton)

      // Verify OAuth was initiated
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/login/callback')
          }
        })
      })
    })

    it('displays error if Google OAuth fails', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error: { message: 'OAuth provider error' }
      })

      render(<LoginPage />)

      // Click Google button
      await user.click(screen.getByRole('button', { name: /google/i }))

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/oauth provider error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('requires email field', async () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      expect(emailInput.required).toBe(true)
      expect(emailInput.type).toBe('email')
    })

    it('requires password field with minimum length', async () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement
      expect(passwordInput.required).toBe(true)
      expect(passwordInput.minLength).toBe(6)
    })

    it('shows password hint in sign up mode', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      // Toggle to sign up
      await user.click(screen.getByText(/¿no tienes cuenta\? regístrate/i))

      // Password hint should be visible
      expect(screen.getByText(/mínimo 6 caracteres/i)).toBeInTheDocument()
    })
  })
})
