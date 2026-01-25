-- Migration: Corregir seguridad de weekly_plans
-- Problema: Usuarios pueden ver planes de otras familias
-- Solución: Asegurar que las políticas RLS filtran correctamente por family_id
-- Fecha: 2026-01-23

BEGIN;

-- ============================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================

-- Eliminar políticas de weekly_plans (todas las variantes posibles)
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

-- ============================================
-- 2. VERIFICAR QUE EXISTE LA FUNCIÓN HELPER
-- ============================================

-- Si no existe, crearla
CREATE OR REPLACE FUNCTION get_current_user_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================
-- 3. CREAR NUEVAS POLÍTICAS CON SEGURIDAD MEJORADA
-- ============================================

-- SELECT: Ver planes propios O de la familia
-- IMPORTANTE: La función get_current_user_family_id() devuelve NULL si no hay familia
-- En SQL, NULL = NULL es NULL (no TRUE), por lo que no hace match
CREATE POLICY "Users can view own or family plans" ON weekly_plans
  FOR SELECT
  USING (
    -- Plan es propio
    user_id = auth.uid()
    OR
    -- Plan pertenece a la familia del usuario
    -- Esta condición solo es TRUE si:
    --   1. El usuario está en una familia (get_current_user_family_id() != NULL)
    --   2. El plan pertenece a esa familia (family_id = get_current_user_family_id())
    -- Si el usuario no está en familia, get_current_user_family_id() = NULL
    -- y la condición (family_id = NULL) es NULL, no TRUE
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

-- INSERT: Usuario puede crear planes
-- El plan se crea con user_id del usuario actual
-- El family_id se establece desde el frontend
CREATE POLICY "Users can insert plans" ON weekly_plans
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Propios O de la familia
CREATE POLICY "Users can update own or family plans" ON weekly_plans
  FOR UPDATE
  USING (
    -- Plan es propio
    user_id = auth.uid()
    OR
    -- Plan pertenece a la familia del usuario
    (
      family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

-- DELETE: Solo propios (el creador)
-- Nota: Los planes de familia solo pueden ser eliminados por quien los creó
CREATE POLICY "Users can delete own plans" ON weekly_plans
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 4. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON POLICY "Users can view own or family plans" ON weekly_plans IS
  'Permite ver planes propios o de la familia. Usa get_current_user_family_id() para evitar recursión RLS.';

COMMENT ON POLICY "Users can insert plans" ON weekly_plans IS
  'Permite insertar planes. El user_id debe ser el del usuario actual.';

COMMENT ON POLICY "Users can update own or family plans" ON weekly_plans IS
  'Permite actualizar planes propios o de la familia.';

COMMENT ON POLICY "Users can delete own plans" ON weekly_plans IS
  'Permite eliminar solo planes propios (creados por el usuario).';

-- ============================================
-- 5. ACTUALIZAR PLANES SIN FAMILIA
-- ============================================

-- Nota: Los planes creados antes del sistema de familia tienen family_id = NULL
-- Esto es correcto - solo el creador puede verlos (via user_id = auth.uid())
-- No necesitamos hacer nada aquí.

-- Si un usuario quiere compartir sus planes viejos con su familia,
-- debe unirse a una familia y luego actualizar los planes manualmente
-- o se pueden actualizar automáticamente cuando crea/se une a una familia.

-- ============================================
-- 6. VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'weekly_plans'::regclass;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS ACTUALIZADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total políticas en weekly_plans: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas esperadas:';
  RAISE NOTICE '1. Users can view own or family plans (SELECT)';
  RAISE NOTICE '2. Users can insert plans (INSERT)';
  RAISE NOTICE '3. Users can update own or family plans (UPDATE)';
  RAISE NOTICE '4. Users can delete own plans (DELETE)';
  RAISE NOTICE '';

  IF policy_count = 4 THEN
    RAISE NOTICE '✓ Correcto - 4 políticas activas';
  ELSE
    RAISE WARNING '✗ Esperado 4 políticas, encontradas %', policy_count;
  END IF;

  RAISE NOTICE '========================================';
END $$;

COMMIT;
