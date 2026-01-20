-- Fix infinite recursion in RLS policies
-- The issue: When creating a new plan, the trigger automatically creates
-- a plan_collaborator record, but multiple policies check plan_collaborators
-- which creates infinite recursion.

-- Solution: Check weekly_plans.user_id directly instead of going through plan_collaborators
-- This breaks the circular dependency and prevents recursion.

-- ============================================================
-- FIX 1: plan_collaborators policies
-- ============================================================

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Plan owners can add collaborators" ON plan_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators of their plans" ON plan_collaborators;
DROP POLICY IF EXISTS "Plan owners can remove collaborators" ON plan_collaborators;

-- INSERT: Users can insert collaborators if they own the plan
CREATE POLICY "Plan owners can add collaborators" ON plan_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_plans
      WHERE weekly_plans.id = plan_collaborators.plan_id
      AND weekly_plans.user_id = auth.uid()
    )
  );

-- SELECT: Users can view if they ARE the collaborator OR they own the plan
CREATE POLICY "Users can view collaborators of their plans" ON plan_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM weekly_plans
      WHERE weekly_plans.id = plan_collaborators.plan_id
      AND weekly_plans.user_id = auth.uid()
    )
  );

-- DELETE: Only plan owners can remove collaborators
CREATE POLICY "Plan owners can remove collaborators" ON plan_collaborators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans
      WHERE weekly_plans.id = plan_collaborators.plan_id
      AND weekly_plans.user_id = auth.uid()
    )
  );

-- ============================================================
-- FIX 2: weekly_plans policies that reference plan_collaborators
-- ============================================================

-- These policies also cause recursion when they check plan_collaborators
-- We need to disable collaboration checks temporarily to allow basic functionality

DROP POLICY IF EXISTS "Users can view plans they own or collaborate on" ON weekly_plans;
DROP POLICY IF EXISTS "Users can update plans they own or collaborate on" ON weekly_plans;

-- SELECT: For now, users can only view their own plans (no collaboration check)
-- This prevents recursion but temporarily disables collaboration view access
CREATE POLICY "Users can view plans they own or collaborate on" ON weekly_plans
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- UPDATE: For now, users can only update their own plans (no collaboration check)
-- This prevents recursion but temporarily disables collaboration edit access
CREATE POLICY "Users can update plans they own or collaborate on" ON weekly_plans
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

-- ============================================================
-- FIX 3: Disable FORCE RLS and use SECURITY DEFINER to bypass
-- ============================================================

-- The root cause: plan_collaborators has FORCE ROW LEVEL SECURITY enabled
-- which means RLS policies apply even to SECURITY DEFINER functions.

-- Solution: Disable FORCE RLS, keep regular RLS enabled.
-- This allows SECURITY DEFINER functions to bypass RLS while regular users still respect policies.

ALTER TABLE plan_collaborators NO FORCE ROW LEVEL SECURITY;

-- Recreate the trigger function with SECURITY DEFINER
-- Now it will bypass RLS policies since FORCE RLS is disabled
DROP FUNCTION IF EXISTS create_plan_owner_collaborator() CASCADE;

CREATE OR REPLACE FUNCTION create_plan_owner_collaborator()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will bypass RLS since FORCE RLS is now disabled and function is SECURITY DEFINER
  INSERT INTO plan_collaborators (plan_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (it was dropped by CASCADE above)
CREATE TRIGGER trigger_create_plan_owner_collaborator
  AFTER INSERT ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION create_plan_owner_collaborator();
