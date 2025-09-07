-- Meal Planner Database Schema for Supabase

-- Users table (handled by Supabase Auth, but we can reference it)

-- Food items table
CREATE TABLE food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_type VARCHAR(50) NOT NULL,  -- 'Desayuno', 'Almuerzo', 'Onces', etc.
  subtype VARCHAR(100) NOT NULL,   -- 'Huevos', 'Carb', 'Proteina', etc.
  name VARCHAR(255) NOT NULL,      -- 'Huevos fritos', 'Pasta con pollo', etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rules table
CREATE TABLE rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_type VARCHAR(50), -- NULL means applies to all meal types
  rule_text TEXT NOT NULL,
  parsed_rule JSONB,     -- Store parsed rule structure
  validation_method VARCHAR(20) DEFAULT 'pattern' CHECK (validation_method IN ('pattern', 'llm', 'manual')),
  llm_interpretation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal plans table
CREATE TABLE meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,  -- Start of the week (Monday)
  plan_data JSONB NOT NULL,  -- Store the complete weekly plan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal history table (for tracking what was actually served)
CREATE TABLE meal_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id) ON DELETE CASCADE,
  meal_type VARCHAR(50) NOT NULL,
  served_date DATE NOT NULL,
  week_start DATE NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_food_items_user_meal_type ON food_items(user_id, meal_type);
CREATE INDEX idx_food_items_user_subtype ON food_items(user_id, subtype);
CREATE INDEX idx_rules_user_active ON rules(user_id, is_active);
CREATE INDEX idx_meal_plans_user_week ON meal_plans(user_id, week_start);
CREATE INDEX idx_meal_history_user_date ON meal_history(user_id, served_date);
CREATE INDEX idx_meal_history_food_item ON meal_history(food_item_id);

-- Row Level Security policies
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_history ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own food items" ON food_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food items" ON food_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food items" ON food_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food items" ON food_items
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can manage own rules" ON rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal plans" ON meal_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal history" ON meal_history
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();