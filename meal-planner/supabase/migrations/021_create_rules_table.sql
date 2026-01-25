-- Migration: Create rules table for AI-powered meal planning rules
-- This table stores user-defined rules in natural language that are validated by LLM

CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule content
  rule_text TEXT NOT NULL,
  meal_type TEXT, -- 'Desayuno' | 'Almuerzo' | 'Onces' | NULL (applies to all)

  -- AI validation metadata
  validation_method TEXT NOT NULL DEFAULT 'llm', -- 'pattern' | 'llm' | 'manual'
  llm_interpretation TEXT, -- LLM's understanding of the rule
  parsed_rule JSONB, -- Structured representation if parsed

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rules_meal_type_check CHECK (
    meal_type IS NULL OR
    meal_type IN ('Desayuno', 'Almuerzo', 'Onces')
  ),
  CONSTRAINT rules_validation_method_check CHECK (
    validation_method IN ('pattern', 'llm', 'manual')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);
CREATE INDEX IF NOT EXISTS idx_rules_meal_type ON rules(meal_type);
CREATE INDEX IF NOT EXISTS idx_rules_validation_method ON rules(validation_method);

-- Trigger to auto-update updated_at
CREATE OR REPLACE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (will be updated by migration 021 to add family support)
CREATE POLICY "Users can view their own rules" ON rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can create their own rules" ON rules
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own rules" ON rules
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their own rules" ON rules
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Comments for documentation
COMMENT ON TABLE rules IS 'User-defined meal planning rules validated by AI (LLM)';
COMMENT ON COLUMN rules.rule_text IS 'Natural language rule, e.g., "No repetir huevos hasta 2 días después"';
COMMENT ON COLUMN rules.meal_type IS 'If specified, rule only applies to this meal type. NULL means applies to all meals.';
COMMENT ON COLUMN rules.validation_method IS 'How the rule is validated: llm (AI), pattern (regex), or manual';
COMMENT ON COLUMN rules.llm_interpretation IS 'LLM explanation of what the rule means';
COMMENT ON COLUMN rules.parsed_rule IS 'Structured JSON representation of the rule if parseable';
