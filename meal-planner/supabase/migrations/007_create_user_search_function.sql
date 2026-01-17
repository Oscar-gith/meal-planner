-- ============================================
-- Migration 007: Create User Search Function
-- ============================================
--
-- This migration creates a secure function to search for users by email.
-- Required for the collaborators feature to add users to plans.
--
-- ============================================

BEGIN;

-- ============================================
-- Function to search user by email
-- ============================================

CREATE OR REPLACE FUNCTION find_user_by_email(search_email TEXT)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as user_id,
    email as user_email
  FROM auth.users
  WHERE
    email = lower(trim(search_email))
    AND email_confirmed_at IS NOT NULL; -- Only return confirmed users
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION find_user_by_email IS 'Securely search for users by email to add as collaborators';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User Search Function Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: find_user_by_email(email)';
  RAISE NOTICE 'Returns: user_id, user_email';
  RAISE NOTICE 'Security: DEFINER (secure access to auth.users)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- Example Usage
-- ============================================

-- Search for a user by email
-- SELECT * FROM find_user_by_email('user@example.com');
