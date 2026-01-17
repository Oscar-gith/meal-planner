-- ============================================
-- Remove "Completo Onces" Pattern
-- ============================================
-- Execute this in Supabase SQL Editor to remove the "Completo Onces" pattern
-- This script is idempotent - safe to run multiple times

BEGIN;

-- Delete the "Completo Onces" pattern
DELETE FROM meal_patterns
WHERE meal_type = 'Onces'
  AND name = 'Completo'
  AND is_system = true;

-- Verify deletion
DO $$
DECLARE
  pattern_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pattern_count
  FROM meal_patterns
  WHERE meal_type = 'Onces'
    AND is_system = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Onces patterns remaining: %', pattern_count;
  RAISE NOTICE '========================================';

  IF pattern_count = 2 THEN
    RAISE NOTICE 'Success! Only 2 Onces patterns remain (Tradicional and Compuesto + Fruta)';
  ELSE
    RAISE WARNING 'Expected 2 Onces patterns, but found %', pattern_count;
  END IF;
END $$;

COMMIT;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the current Onces patterns:
-- SELECT meal_type, name, description
-- FROM meal_patterns
-- WHERE meal_type = 'Onces' AND is_system = true
-- ORDER BY display_order;
