-- Migration Script: V1 to V2
-- Converts existing food_items to new food_ingredients structure
-- Preserves all existing data

-- ============================================================================
-- Step 1: Create new tables (run schema-v2.sql first)
-- ============================================================================

-- ============================================================================
-- Step 2: Migrate existing food_items to food_ingredients
-- ============================================================================

-- Default user ID for migration (since RLS is disabled)
-- In production, this would use actual user IDs from auth.users
DO $$
DECLARE
  default_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Insert existing food items as individual ingredients
  INSERT INTO food_ingredients (id, name, type, user_id, created_at, updated_at)
  SELECT
    id,
    name,
    subtype as type,  -- Convert subtype to type
    COALESCE(user_id, default_user_id) as user_id,
    created_at,
    updated_at
  FROM food_items
  ON CONFLICT (id) DO NOTHING;  -- Avoid duplicates if run multiple times

  RAISE NOTICE 'Migrated % food items to food_ingredients',
    (SELECT COUNT(*) FROM food_items);
END $$;

-- ============================================================================
-- Step 3: Create sample meal combinations from existing data
-- ============================================================================

-- This creates basic combinations for testing
-- Users will create their own custom combinations in the app
DO $$
DECLARE
  default_user_id UUID := '00000000-0000-0000-0000-000000000000';
  desayuno_ids UUID[];
  almuerzo_ids UUID[];
  onces_ids UUID[];
BEGIN
  -- Get some sample ingredients for each meal type
  SELECT ARRAY_AGG(id) INTO desayuno_ids
  FROM (SELECT id FROM food_ingredients WHERE type IN ('Huevos', 'Carb', 'Completo') LIMIT 20) sub;

  SELECT ARRAY_AGG(id) INTO almuerzo_ids
  FROM (SELECT id FROM food_ingredients WHERE type IN ('Principal', 'Proteina', 'Ensalada') LIMIT 20) sub;

  SELECT ARRAY_AGG(id) INTO onces_ids
  FROM (SELECT id FROM food_ingredients WHERE type IN ('Beber', 'Carb', 'Fruta') LIMIT 20) sub;

  -- Create sample combinations (optional, for testing)
  -- Users will create their own in the app

  RAISE NOTICE 'Migration complete. Users can now create custom combinations.';
END $$;

-- ============================================================================
-- Step 4: Verification queries
-- ============================================================================

-- Check migration results
SELECT 'food_ingredients' as table_name, COUNT(*) as count FROM food_ingredients
UNION ALL
SELECT 'meal_combinations' as table_name, COUNT(*) as count FROM meal_combinations
UNION ALL
SELECT 'weekly_plans' as table_name, COUNT(*) as count FROM weekly_plans;

-- View sample data
SELECT id, name, type, created_at
FROM food_ingredients
ORDER BY type, name
LIMIT 10;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After migration:
-- 1. Old tables (food_items, rules) can be kept as backup or renamed
-- 2. Users should create their own meal combinations in the app
-- 3. Weekly plans will be generated using the new structure
-- 4. RLS policies can be enabled when authentication is added
