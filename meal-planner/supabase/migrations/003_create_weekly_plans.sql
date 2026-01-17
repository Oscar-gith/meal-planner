-- ============================================
-- Create Weekly Plans Table
-- ============================================
-- Execute this in Supabase SQL Editor

BEGIN;

-- ============================================
-- Create weekly_plans table
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  plan_data JSONB NOT NULL,  -- Complete plan with days and meals
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_weekly_plans_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT check_date_range CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_weekly_plans_user ON weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_dates ON weekly_plans(start_date, end_date);
CREATE INDEX idx_weekly_plans_created ON weekly_plans(created_at DESC);

-- Enable RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plans"
  ON weekly_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own plans"
  ON weekly_plans FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own plans"
  ON weekly_plans FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_weekly_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_weekly_plans_updated_at
  BEFORE UPDATE ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_plans_updated_at();

COMMENT ON TABLE weekly_plans IS 'Generated weekly meal plans';
COMMENT ON COLUMN weekly_plans.plan_data IS 'JSONB structure: {days: [{date, day_name, meals: [{meal_type, pattern_id, ingredient_ids, ...}]}]}';

-- ============================================
-- Create pattern_distributions table (optional - for saving user preferences)
-- ============================================

CREATE TABLE IF NOT EXISTS pattern_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Desayuno', 'Almuerzo', 'Onces')),
  pattern_id UUID NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_pattern_distributions_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_pattern_distributions_pattern FOREIGN KEY (pattern_id) REFERENCES meal_patterns(id),
  CONSTRAINT unique_user_meal_pattern UNIQUE (user_id, meal_type, pattern_id)
);

-- Indexes
CREATE INDEX idx_pattern_distributions_user ON pattern_distributions(user_id);
CREATE INDEX idx_pattern_distributions_meal_type ON pattern_distributions(meal_type);

-- Enable RLS
ALTER TABLE pattern_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own distributions"
  ON pattern_distributions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own distributions"
  ON pattern_distributions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own distributions"
  ON pattern_distributions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own distributions"
  ON pattern_distributions FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER trigger_pattern_distributions_updated_at
  BEFORE UPDATE ON pattern_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_plans_updated_at();

COMMENT ON TABLE pattern_distributions IS 'User preferences for pattern distribution percentages';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Weekly Plans tables created successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '- weekly_plans';
  RAISE NOTICE '- pattern_distributions';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- Example Query: Insert a sample pattern distribution
-- ============================================

-- This is just an example - the app will manage these through the UI
-- INSERT INTO pattern_distributions (user_id, meal_type, pattern_id, percentage) VALUES
--   ('your-user-id', 'Almuerzo', 'pattern-id-1', 60),
--   ('your-user-id', 'Almuerzo', 'pattern-id-2', 30),
--   ('your-user-id', 'Almuerzo', 'pattern-id-3', 10);

-- ============================================
-- Notes
-- ============================================

-- The plan_data JSONB structure will be:
-- {
--   "days": [
--     {
--       "date": "2026-01-20",
--       "day_name": "Lunes",
--       "meals": [
--         {
--           "meal_type": "Desayuno",
--           "pattern_id": "uuid",
--           "pattern_name": "Tradicional con Fruta",
--           "ingredient_ids": ["uuid1", "uuid2", "uuid3"],
--           "ingredients": [...]
--         }
--       ]
--     }
--   ]
-- }
