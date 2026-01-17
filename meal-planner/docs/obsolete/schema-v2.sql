-- Meal Planner Database Schema V2 - Simplified Architecture
-- This version removes complex rules engine and focuses on user-created combinations

-- ============================================================================
-- 1. FOOD INGREDIENTS (Individual items like "Banana", "Pop corn", "Juice")
-- ============================================================================
CREATE TABLE food_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,           -- 'Banano', 'Pop corn', 'Jugo de caja'
  type VARCHAR(50) NOT NULL,            -- 'Fruta', 'Carb', 'Bebida', 'Proteina', 'Verdura'
  description TEXT,                     -- Optional description
  tags TEXT[],                          -- Optional tags for filtering
  user_id UUID NOT NULL,                -- Changed to NOT NULL, will use default user for now
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. MEAL COMBINATIONS (User-created menus combining multiple ingredients)
-- ============================================================================
CREATE TABLE meal_combinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,           -- 'Merienda tropical', 'Desayuno completo'
  meal_type VARCHAR(50) NOT NULL,       -- 'Desayuno', 'Almuerzo', 'Onces'
  ingredient_ids UUID[] NOT NULL,       -- Array of food_ingredient IDs
  notes TEXT,                           -- Optional preparation notes
  is_favorite BOOLEAN DEFAULT FALSE,    -- Mark favorite combinations
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. WEEKLY PLANS (Complete weekly meal plans)
-- ============================================================================
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,           -- 'Semana del 13 Enero', 'Plan Febrero'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  include_weekends BOOLEAN DEFAULT FALSE,
  plan_data JSONB NOT NULL,             -- Array of daily meals with combination IDs
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for better performance
-- ============================================================================
CREATE INDEX idx_food_ingredients_user ON food_ingredients(user_id);
CREATE INDEX idx_food_ingredients_type ON food_ingredients(type);
CREATE INDEX idx_food_ingredients_name ON food_ingredients(name);

CREATE INDEX idx_meal_combinations_user ON meal_combinations(user_id);
CREATE INDEX idx_meal_combinations_meal_type ON meal_combinations(meal_type);
CREATE INDEX idx_meal_combinations_favorite ON meal_combinations(user_id, is_favorite);

CREATE INDEX idx_weekly_plans_user ON weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_dates ON weekly_plans(start_date, end_date);

-- ============================================================================
-- ROW LEVEL SECURITY (Currently disabled for development)
-- Will be enabled when authentication is implemented
-- ============================================================================
-- ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_combinations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can manage own ingredients" ON food_ingredients
--   FOR ALL USING (auth.uid() = user_id);

-- CREATE POLICY "Users can manage own combinations" ON meal_combinations
--   FOR ALL USING (auth.uid() = user_id);

-- CREATE POLICY "Users can manage own plans" ON weekly_plans
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS for auto-updating timestamps
-- ============================================================================
CREATE TRIGGER update_food_ingredients_updated_at BEFORE UPDATE ON food_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_combinations_updated_at BEFORE UPDATE ON meal_combinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at BEFORE UPDATE ON weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION SCRIPT (Convert existing data to new structure)
-- ============================================================================
-- This will be run separately to migrate existing food_items to food_ingredients
-- and preserve user data

-- Example plan_data structure for weekly_plans:
-- {
--   "days": [
--     {
--       "date": "2026-01-13",
--       "day_name": "Lunes",
--       "meals": {
--         "Desayuno": "uuid-of-combination",
--         "Almuerzo": "uuid-of-combination",
--         "Onces": "uuid-of-combination"
--       }
--     },
--     ...
--   ]
-- }
