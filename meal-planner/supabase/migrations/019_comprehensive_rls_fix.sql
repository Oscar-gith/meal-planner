-- Migration: Corrección Completa de RLS (Consolidada)
-- Problema: Políticas RLS circulares bloquean vista de families y causan bug de seguridad
-- Solución: Simplificar y consolidar todas las políticas RLS
-- Fecha: 2026-01-23

BEGIN;

-- ============================================
-- PARTE 1: FAMILIES
-- ============================================

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can view their family" ON families;
DROP POLICY IF EXISTS "Members can view their families" ON families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
DROP POLICY IF EXISTS "Family creator can update family" ON families;
DROP POLICY IF EXISTS "Family admins can update family" ON families;
DROP POLICY IF EXISTS "Family creator can update" ON families;
DROP POLICY IF EXISTS "Family creator can delete family" ON families;
DROP POLICY IF EXISTS "Family creator can delete" ON families;

-- Nuevas políticas simplificadas
CREATE POLICY "Members can view their families" ON families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

CREATE POLICY "Family creator can update" ON families
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Family creator can delete" ON families
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- PARTE 2: WEEKLY_PLANS
-- ============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can view own or family plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can view plans they own or collaborate on" ON weekly_plans;

DROP POLICY IF EXISTS "Users can insert their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can insert plans" ON weekly_plans;

DROP POLICY IF EXISTS "Users can update their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can update own or family plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can update plans they own or collaborate on" ON weekly_plans;

DROP POLICY IF EXISTS "Users can delete their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Only owners can delete plans" ON weekly_plans;

-- Asegurar que existe la función helper
CREATE OR REPLACE FUNCTION get_current_user_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Nuevas políticas seguras
CREATE POLICY "Users can view own or family plans" ON weekly_plans
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

CREATE POLICY "Users can insert plans" ON weekly_plans
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or family plans" ON weekly_plans
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

CREATE POLICY "Users can delete own plans" ON weekly_plans
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- PARTE 3: FOOD_INGREDIENTS (Consistencia)
-- ============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view own or family ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can insert ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can update own or family ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can delete own or family ingredients" ON food_ingredients;

-- Nuevas políticas consistentes
CREATE POLICY "Users can view own or family ingredients" ON food_ingredients
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

CREATE POLICY "Users can insert ingredients" ON food_ingredients
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or family ingredients" ON food_ingredients
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

CREATE POLICY "Users can delete own or family ingredients" ON food_ingredients
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

-- ============================================
-- PARTE 4: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

-- families
COMMENT ON POLICY "Members can view their families" ON families IS
  'Permite ver familias donde el usuario es miembro. Usa EXISTS con family_members para evitar recursión RLS.';

COMMENT ON POLICY "Authenticated users can create families" ON families IS
  'Permite a usuarios autenticados crear familias. Validación de unicidad se hace en RPC.';

COMMENT ON POLICY "Family creator can update" ON families IS
  'Solo el creador (created_by) puede actualizar la familia.';

COMMENT ON POLICY "Family creator can delete" ON families IS
  'Solo el creador puede eliminar la familia.';

-- weekly_plans
COMMENT ON POLICY "Users can view own or family plans" ON weekly_plans IS
  'Permite ver planes propios o de la familia. Usa get_current_user_family_id() y valida family_id IS NOT NULL.';

COMMENT ON POLICY "Users can insert plans" ON weekly_plans IS
  'Permite insertar planes. El user_id debe ser el del usuario actual.';

COMMENT ON POLICY "Users can update own or family plans" ON weekly_plans IS
  'Permite actualizar planes propios o de la familia.';

COMMENT ON POLICY "Users can delete own plans" ON weekly_plans IS
  'Permite eliminar solo planes propios (creados por el usuario).';

-- food_ingredients
COMMENT ON POLICY "Users can view own or family ingredients" ON food_ingredients IS
  'Permite ver ingredientes propios o de la familia. Usa get_current_user_family_id() y valida family_id IS NOT NULL.';

COMMENT ON POLICY "Users can insert ingredients" ON food_ingredients IS
  'Permite insertar ingredientes. El user_id debe ser el del usuario actual.';

COMMENT ON POLICY "Users can update own or family ingredients" ON food_ingredients IS
  'Permite actualizar ingredientes propios o de la familia.';

COMMENT ON POLICY "Users can delete own or family ingredients" ON food_ingredients IS
  'Permite eliminar ingredientes propios o de la familia.';

-- ============================================
-- PARTE 5: VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  families_count INT;
  weekly_plans_count INT;
  ingredients_count INT;
BEGIN
  SELECT COUNT(*) INTO families_count
  FROM pg_policy
  WHERE polrelid = 'families'::regclass;

  SELECT COUNT(*) INTO weekly_plans_count
  FROM pg_policy
  WHERE polrelid = 'weekly_plans'::regclass;

  SELECT COUNT(*) INTO ingredients_count
  FROM pg_policy
  WHERE polrelid = 'food_ingredients'::regclass;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS ACTUALIZADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'families:         % políticas (esperado: 4)', families_count;
  RAISE NOTICE 'weekly_plans:     % políticas (esperado: 4)', weekly_plans_count;
  RAISE NOTICE 'food_ingredients: % políticas (esperado: 4)', ingredients_count;
  RAISE NOTICE '';

  IF families_count = 4 AND weekly_plans_count = 4 AND ingredients_count = 4 THEN
    RAISE NOTICE '✓ CORRECTO - Todas las tablas tienen 4 políticas';
  ELSE
    RAISE WARNING '✗ VERIFICAR - Algunas tablas no tienen 4 políticas';
  END IF;

  RAISE NOTICE '========================================';
END $$;

COMMIT;
