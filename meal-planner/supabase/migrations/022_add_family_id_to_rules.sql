-- Migration: Add family_id to rules table for family sharing
-- This enables rules to be shared within families, similar to ingredients and plans
-- NOTE: Requires migration 021_create_rules_table.sql to be executed first

-- Add family_id column to rules table
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- Backfill existing rules with user's family_id
UPDATE rules r
SET family_id = (
  SELECT family_id
  FROM family_members fm
  WHERE fm.user_id = r.user_id
  LIMIT 1
)
WHERE family_id IS NULL;

-- Enable Row Level Security
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view rules from their family" ON rules;
DROP POLICY IF EXISTS "Users can create rules in their family" ON rules;
DROP POLICY IF EXISTS "Users can update their own rules" ON rules;
DROP POLICY IF EXISTS "Users can delete their own rules" ON rules;

-- Policy 1: Users can view rules from their family
CREATE POLICY "Users can view rules from their family" ON rules
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Users can create rules in their family
CREATE POLICY "Users can create rules in their family" ON rules
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Users can update their own rules
CREATE POLICY "Users can update their own rules" ON rules
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Policy 4: Users can delete their own rules
CREATE POLICY "Users can delete their own rules" ON rules
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rules_family_id ON rules(family_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);
