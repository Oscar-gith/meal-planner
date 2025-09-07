-- Create a test user for importing data
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily for import
ALTER TABLE food_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE rules DISABLE ROW LEVEL SECURITY;

-- Insert a test user record (this will be replaced by real auth later)
INSERT INTO auth.users (
  id, 
  email, 
  email_confirmed_at, 
  created_at, 
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS after import is complete (run this after successful import)
-- ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rules ENABLE ROW LEVEL SECURITY;