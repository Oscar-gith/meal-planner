-- Diagnóstico: Verificar políticas RLS de weekly_plans
-- Esto ayuda a identificar qué políticas están activas y si hay problemas de seguridad

BEGIN;

-- ============================================
-- 1. VERIFICAR POLÍTICAS ACTIVAS
-- ============================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS ACTIVAS EN weekly_plans';
  RAISE NOTICE '========================================';

  FOR policy_record IN
    SELECT
      polname AS policy_name,
      polcmd AS command,
      CASE
        WHEN polcmd = 'r' THEN 'SELECT'
        WHEN polcmd = 'a' THEN 'INSERT'
        WHEN polcmd = 'w' THEN 'UPDATE'
        WHEN polcmd = 'd' THEN 'DELETE'
        ELSE 'ALL'
      END AS operation,
      pg_get_expr(polqual, polrelid) AS using_clause,
      pg_get_expr(polwithcheck, polrelid) AS with_check_clause
    FROM pg_policy
    WHERE polrelid = 'weekly_plans'::regclass
    ORDER BY polname
  LOOP
    RAISE NOTICE 'Policy: %', policy_record.policy_name;
    RAISE NOTICE '  Operation: %', policy_record.operation;
    RAISE NOTICE '  USING: %', policy_record.using_clause;
    IF policy_record.with_check_clause IS NOT NULL THEN
      RAISE NOTICE '  WITH CHECK: %', policy_record.with_check_clause;
    END IF;
    RAISE NOTICE '----------------------------------------';
  END LOOP;
END $$;

-- ============================================
-- 2. VERIFICAR DATOS EN weekly_plans
-- ============================================

DO $$
DECLARE
  total_plans INT;
  plans_with_family INT;
  plans_without_family INT;
  distinct_families INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATOS EN weekly_plans';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO total_plans FROM weekly_plans;
  RAISE NOTICE 'Total planes: %', total_plans;

  SELECT COUNT(*) INTO plans_with_family FROM weekly_plans WHERE family_id IS NOT NULL;
  RAISE NOTICE 'Planes con family_id: %', plans_with_family;

  SELECT COUNT(*) INTO plans_without_family FROM weekly_plans WHERE family_id IS NULL;
  RAISE NOTICE 'Planes sin family_id: %', plans_without_family;

  SELECT COUNT(DISTINCT family_id) INTO distinct_families FROM weekly_plans WHERE family_id IS NOT NULL;
  RAISE NOTICE 'Familias distintas: %', distinct_families;
END $$;

-- ============================================
-- 3. VERIFICAR COLUMNA family_id
-- ============================================

DO $$
DECLARE
  has_family_id BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ESTRUCTURA DE weekly_plans';
  RAISE NOTICE '========================================';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_plans' AND column_name = 'family_id'
  ) INTO has_family_id;

  IF has_family_id THEN
    RAISE NOTICE 'Columna family_id: ✓ EXISTS';
  ELSE
    RAISE NOTICE 'Columna family_id: ✗ NOT FOUND';
  END IF;
END $$;

-- ============================================
-- 4. VERIFICAR FUNCIÓN HELPER
-- ============================================

DO $$
DECLARE
  has_helper_function BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNCIÓN HELPER';
  RAISE NOTICE '========================================';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_current_user_family_id'
  ) INTO has_helper_function;

  IF has_helper_function THEN
    RAISE NOTICE 'Función get_current_user_family_id: ✓ EXISTS';
  ELSE
    RAISE NOTICE 'Función get_current_user_family_id: ✗ NOT FOUND';
  END IF;
END $$;

-- ============================================
-- 5. RECOMENDACIONES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ANÁLISIS Y RECOMENDACIONES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'El problema reportado: "Usuarios nuevos pueden ver planes de otras familias"';
  RAISE NOTICE '';
  RAISE NOTICE 'Posibles causas:';
  RAISE NOTICE '1. Políticas antiguas todavía activas (solo filtran por user_id)';
  RAISE NOTICE '2. Planes con family_id = NULL visibles por todos';
  RAISE NOTICE '3. Función get_current_user_family_id() devuelve NULL incorrectamente';
  RAISE NOTICE '';
  RAISE NOTICE 'Revisa la salida arriba para identificar el problema.';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
