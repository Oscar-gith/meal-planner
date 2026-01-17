-- ============================================
-- Migration 006: Create Plan Collaborators System
-- ============================================
--
-- This migration adds multi-user collaboration for weekly plans.
-- Multiple users can view and edit the same plan.
--
-- ============================================

BEGIN;

-- ============================================
-- Create plan_collaborators table
-- ============================================

CREATE TABLE IF NOT EXISTS plan_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'collaborator')),
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_plan_collaborators_plan FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_collaborators_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_collaborators_invited_by FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT unique_plan_user UNIQUE (plan_id, user_id)
);

-- Indexes
CREATE INDEX idx_plan_collaborators_plan ON plan_collaborators(plan_id);
CREATE INDEX idx_plan_collaborators_user ON plan_collaborators(user_id);
CREATE INDEX idx_plan_collaborators_role ON plan_collaborators(role);

-- Enable RLS
ALTER TABLE plan_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plan_collaborators
CREATE POLICY "Users can view collaborators of their plans"
  ON plan_collaborators FOR SELECT
  USING (
    user_id = auth.uid() OR
    plan_id IN (
      SELECT plan_id FROM plan_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Plan owners can add collaborators"
  ON plan_collaborators FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Plan owners can remove collaborators"
  ON plan_collaborators FOR DELETE
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_collaborators
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

COMMENT ON TABLE plan_collaborators IS 'Manages collaboration access to weekly plans';
COMMENT ON COLUMN plan_collaborators.role IS 'owner: full control, collaborator: can view and edit';

-- ============================================
-- Update RLS policies for weekly_plans
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can insert their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can update their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can delete their own plans" ON weekly_plans;

-- Create new policies that include collaborators
CREATE POLICY "Users can view plans they own or collaborate on"
  ON weekly_plans FOR SELECT
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT plan_id FROM plan_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update plans they own or collaborate on"
  ON weekly_plans FOR UPDATE
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT plan_id FROM plan_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can delete plans"
  ON weekly_plans FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Trigger: Auto-create owner collaborator record
-- ============================================

CREATE OR REPLACE FUNCTION create_plan_owner_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add the plan creator as owner
  INSERT INTO plan_collaborators (plan_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_plan_owner_collaborator
  AFTER INSERT ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION create_plan_owner_collaborator();

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if user is plan owner
CREATE OR REPLACE FUNCTION is_plan_owner(p_plan_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM plan_collaborators
    WHERE plan_id = p_plan_id
    AND user_id = p_user_id
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role in plan
CREATE OR REPLACE FUNCTION get_user_plan_role(p_plan_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM plan_collaborators
  WHERE plan_id = p_plan_id AND user_id = p_user_id;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Plan Collaborators System Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New table: plan_collaborators';
  RAISE NOTICE 'Updated RLS policies on weekly_plans';
  RAISE NOTICE 'Auto-trigger: create owner on plan insert';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '- Multi-user collaboration';
  RAISE NOTICE '- Owner and collaborator roles';
  RAISE NOTICE '- Automatic owner assignment';
  RAISE NOTICE '- Cascade delete on plan removal';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- Example Usage
-- ============================================

-- When a user creates a plan, they are automatically added as owner
-- INSERT INTO weekly_plans (name, start_date, end_date, plan_data, user_id)
-- VALUES ('Week of Jan 20', '2026-01-20', '2026-01-26', '{...}', auth.uid());

-- Add a collaborator to a plan (only owners can do this)
-- INSERT INTO plan_collaborators (plan_id, user_id, role, invited_by)
-- VALUES ('plan-uuid', 'collaborator-user-uuid', 'collaborator', auth.uid());

-- Check if user is owner
-- SELECT is_plan_owner('plan-uuid', auth.uid());

-- Get user's role in plan
-- SELECT get_user_plan_role('plan-uuid', auth.uid());
