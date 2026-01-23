-- Migration: Verificar y corregir RLS en weekly_plans
-- Problema CRÍTICO: Usuarios no autenticados pueden ver planes
-- Fecha: 2026-01-23

BEGIN;

-- ============================================
-- 1. VERIFICAR ESTADO ACTUAL
-- ============================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INT;
BEGIN
  -- Verificar si RLS está habilitado
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'weekly_plans';

  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'weekly_plans'::regclass;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ESTADO ACTUAL DE weekly_plans';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS habilitado: %', rls_enabled;
  RAISE NOTICE 'Políticas activas: %', policy_count;
  RAISE NOTICE '========================================';
END $$;

-- Mostrar todas las políticas actuales
SELECT
  polname AS "Política",
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END AS "Operación",
  CASE polpermissive
    WHEN TRUE THEN 'PERMISSIVE'
    WHEN FALSE THEN 'RESTRICTIVE'
  END AS "Tipo",
  pg_get_expr(polqual, polrelid) AS "USING",
  pg_get_expr(polwithcheck, polrelid) AS "WITH CHECK"
FROM pg_policy
WHERE polrelid = 'weekly_plans'::regclass
ORDER BY polname;

-- ============================================
-- 2. ASEGURAR QUE RLS ESTÁ HABILITADO
-- ============================================

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. ELIMINAR **TODAS** LAS POLÍTICAS
-- ============================================

-- Obtener y eliminar dinámicamente todas las políticas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'weekly_plans'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON weekly_plans', pol.polname);
    RAISE NOTICE 'Eliminada política: %', pol.polname;
  END LOOP;
END $$;

-- ============================================
-- 4. CREAR POLÍTICAS DESDE CERO (SEGURAS)
-- ============================================

-- SELECT: SOLO propios O de familia
-- IMPORTANTE: Si auth.uid() es NULL, TODA la expresión es NULL = no permite acceso
CREATE POLICY "select_own_or_family_plans" ON weekly_plans
  FOR SELECT
  USING (
    -- Usuario autenticado es el dueño
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Usuario autenticado es de la familia
    (
      auth.uid() IS NOT NULL
      AND family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

-- INSERT: SOLO usuarios autenticados
CREATE POLICY "insert_own_plans" ON weekly_plans
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- UPDATE: SOLO propios O de familia
CREATE POLICY "update_own_or_family_plans" ON weekly_plans
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (
      auth.uid() IS NOT NULL
      AND family_id IS NOT NULL
      AND family_id = get_current_user_family_id()
    )
  );

-- DELETE: SOLO propios
CREATE POLICY "delete_own_plans" ON weekly_plans
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- ============================================
-- 5. COMENTARIOS
-- ============================================

COMMENT ON POLICY "select_own_or_family_plans" ON weekly_plans IS
  'Ver planes propios o de familia. Requiere auth.uid() IS NOT NULL para bloquear acceso no autenticado.';

COMMENT ON POLICY "insert_own_plans" ON weekly_plans IS
  'Insertar planes. Requiere autenticación y user_id = auth.uid().';

COMMENT ON POLICY "update_own_or_family_plans" ON weekly_plans IS
  'Actualizar planes propios o de familia. Requiere autenticación.';

COMMENT ON POLICY "delete_own_plans" ON weekly_plans IS
  'Eliminar solo planes propios. Requiere autenticación.';

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INT;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'weekly_plans';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'weekly_plans'::regclass;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS habilitado: %', rls_enabled;
  RAISE NOTICE 'Políticas activas: %', policy_count;

  IF rls_enabled AND policy_count = 4 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ CORRECTO:';
    RAISE NOTICE '  - RLS habilitado: TRUE';
    RAISE NOTICE '  - Políticas: 4 (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '  - Todas requieren auth.uid() IS NOT NULL';
  ELSE
    RAISE WARNING '✗ PROBLEMA: RLS=% Políticas=%', rls_enabled, policy_count;
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Mostrar políticas finales
SELECT
  polname AS "Política",
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END AS "Op",
  pg_get_expr(polqual, polrelid) AS "Condición"
FROM pg_policy
WHERE polrelid = 'weekly_plans'::regclass
ORDER BY polname;

COMMIT;
