-- ============================================
-- Create Meal Patterns Table and Populate with System Patterns
-- ============================================
-- Execute this in Supabase SQL Editor after updating ingredient types

BEGIN;

-- ============================================
-- Create meal_patterns table
-- ============================================

CREATE TABLE IF NOT EXISTS meal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Desayuno', 'Almuerzo', 'Onces')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  required_components JSONB NOT NULL,  -- Array of {type: string, quantity: number}
  is_system BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER NOT NULL,
  user_id UUID,  -- NULL for system patterns, specific user_id for custom patterns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_pattern_per_meal_type UNIQUE (meal_type, name, user_id)
);

-- Indexes
CREATE INDEX idx_meal_patterns_meal_type ON meal_patterns(meal_type);
CREATE INDEX idx_meal_patterns_user ON meal_patterns(user_id);
CREATE INDEX idx_meal_patterns_system ON meal_patterns(is_system);

-- Enable RLS
ALTER TABLE meal_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read system patterns, users can manage their own
CREATE POLICY "System patterns are viewable by everyone"
  ON meal_patterns FOR SELECT
  USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can insert their own patterns"
  ON meal_patterns FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own patterns"
  ON meal_patterns FOR UPDATE
  USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can delete their own patterns"
  ON meal_patterns FOR DELETE
  USING (user_id = auth.uid() AND is_system = false);

COMMENT ON TABLE meal_patterns IS 'Meal composition patterns defining how ingredients should be combined';
COMMENT ON COLUMN meal_patterns.required_components IS 'JSON array of required ingredient types: [{"type": "Proteína Almuerzo", "quantity": 1}]';

-- ============================================
-- Populate with system patterns
-- ============================================

-- DESAYUNO Patterns
INSERT INTO meal_patterns (meal_type, name, description, required_components, is_system, display_order, user_id) VALUES
  (
    'Desayuno',
    'Tradicional con Fruta',
    'Proteína + Carb + Fruta',
    '[
      {"type": "Proteína Desayuno", "quantity": 1},
      {"type": "Carb Desayuno", "quantity": 1},
      {"type": "Fruta", "quantity": 1}
    ]'::jsonb,
    true,
    1,
    NULL
  ),
  (
    'Desayuno',
    'Compuesto',
    'Plato compuesto único',
    '[
      {"type": "Compuesto Desayuno", "quantity": 1}
    ]'::jsonb,
    true,
    2,
    NULL
  );

-- ALMUERZO Patterns
INSERT INTO meal_patterns (meal_type, name, description, required_components, is_system, display_order, user_id) VALUES
  (
    'Almuerzo',
    'Tradicional',
    'Proteína + Carb + Verdura',
    '[
      {"type": "Proteína Almuerzo", "quantity": 1},
      {"type": "Carb Almuerzo", "quantity": 1},
      {"type": "Verdura", "quantity": 1}
    ]'::jsonb,
    true,
    1,
    NULL
  ),
  (
    'Almuerzo',
    'Compuesto + Verdura',
    'Plato compuesto con acompañamiento',
    '[
      {"type": "Compuesto Almuerzo", "quantity": 1},
      {"type": "Verdura", "quantity": 1}
    ]'::jsonb,
    true,
    2,
    NULL
  ),
  (
    'Almuerzo',
    'Completo',
    'Plato completo único',
    '[
      {"type": "Completo Almuerzo", "quantity": 1}
    ]'::jsonb,
    true,
    3,
    NULL
  );

-- ONCES Patterns
INSERT INTO meal_patterns (meal_type, name, description, required_components, is_system, display_order, user_id) VALUES
  (
    'Onces',
    'Tradicional',
    'Carb + Bebida + Fruta',
    '[
      {"type": "Carb Onces", "quantity": 1},
      {"type": "Bebida", "quantity": 1},
      {"type": "Fruta", "quantity": 1}
    ]'::jsonb,
    true,
    1,
    NULL
  ),
  (
    'Onces',
    'Compuesto + Fruta',
    'Plato compuesto con fruta',
    '[
      {"type": "Compuesto Onces", "quantity": 1},
      {"type": "Fruta", "quantity": 1}
    ]'::jsonb,
    true,
    2,
    NULL
  );

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  pattern_summary TEXT;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM meal_patterns;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Meal Patterns Created: %', total_count;
  RAISE NOTICE '========================================';

  FOR pattern_summary IN
    SELECT meal_type || ': ' || name
    FROM meal_patterns
    ORDER BY meal_type, display_order
  LOOP
    RAISE NOTICE '%', pattern_summary;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- Next Steps
-- ============================================

-- 1. The app will read these patterns from the database
-- 2. The planning engine will check ingredient availability for each pattern
-- 3. Only available patterns will be used in meal planning
-- 4. Users can later create custom patterns (is_system = false)
