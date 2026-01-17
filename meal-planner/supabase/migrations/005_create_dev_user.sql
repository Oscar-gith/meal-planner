-- ============================================
-- Migration 005: Create Development User
-- ============================================
--
-- ⚠️ WARNING: TEMPORARY SOLUTION FOR DEVELOPMENT ONLY!
--
-- This creates a fake user in auth.users for development purposes.
-- This is a BAD PRACTICE and must be removed before production!
--
-- TODO: Remove this migration once proper authentication is implemented
--
-- See BACKLOG.md for details on implementing proper authentication.
--
-- ============================================

BEGIN;

-- Insert a development user if it doesn't exist
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'dev@localhost',
  'TEMPORARY_DEV_USER', -- Not a real password hash
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev User"}'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;

-- Verify creation
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO user_exists;

  IF user_exists THEN
    RAISE NOTICE '✅ Development user created/verified: 00000000-0000-0000-0000-000000000000';
    RAISE WARNING '⚠️  REMINDER: This is a temporary solution! Implement proper authentication before production!';
  ELSE
    RAISE EXCEPTION '❌ Failed to create development user';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Notes:
-- ============================================
--
-- This script creates a fake user in the auth.users table.
-- This user cannot actually log in (the password is not valid).
-- It exists ONLY to satisfy foreign key constraints during development.
--
-- Before deploying to production:
-- 1. Implement proper Supabase Auth with login/signup pages
-- 2. Remove src/lib/auth/dev-user.ts
-- 3. Update src/app/planes/page.tsx to use real auth
-- 4. DO NOT run this migration in production
-- 5. Delete this migration file
--
-- ============================================
