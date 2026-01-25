/**
 * TEMPORARY DEVELOPMENT USER HELPER
 *
 * ⚠️ WARNING: This is a temporary solution for development only!
 *
 * This file provides a hardcoded user ID to bypass authentication during development.
 * This is a BAD PRACTICE and must be replaced with proper authentication before production.
 *
 * See BACKLOG.md for details on implementing proper authentication.
 *
 * TODO: Remove this file once proper authentication is implemented
 */

// TEMPORARY: Hardcoded user ID for development
// This should be replaced with proper Supabase Auth
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Get a user ID for development purposes
 *
 * TEMPORARY: Returns a hardcoded UUID
 * FUTURE: Should return the authenticated user's ID from Supabase Auth
 */
export function getDevUserId(): string {
  console.warn(
    '⚠️ Using hardcoded dev user ID. This must be replaced with proper authentication!'
  )
  return DEV_USER_ID
}

/**
 * Check if we're in development mode with fake auth
 *
 * FUTURE: Remove this function once proper auth is implemented
 */
export function isUsingDevAuth(): boolean {
  return true // Always true until we implement real auth
}
