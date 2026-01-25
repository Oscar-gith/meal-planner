-- Diagnóstico: Verificar políticas RLS de weekly_plans (VERSION CON SELECT)
-- Esta versión devuelve resultados como tablas para visualización en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR POLÍTICAS ACTIVAS
-- ============================================

SELECT
  polname AS "Nombre de Política",
  CASE
    WHEN polcmd = 'r' THEN 'SELECT'
    WHEN polcmd = 'a' THEN 'INSERT'
    WHEN polcmd = 'w' THEN 'UPDATE'
    WHEN polcmd = 'd' THEN 'DELETE'
    ELSE 'ALL'
  END AS "Operación",
  pg_get_expr(polqual, polrelid) AS "Cláusula USING",
  pg_get_expr(polwithcheck, polrelid) AS "Cláusula WITH CHECK"
FROM pg_policy
WHERE polrelid = 'weekly_plans'::regclass
ORDER BY polname;

-- ============================================
-- 2. VERIFICAR DATOS EN weekly_plans
-- ============================================

SELECT
  'Total de planes' AS "Métrica",
  COUNT(*)::TEXT AS "Valor"
FROM weekly_plans

UNION ALL

SELECT
  'Planes con family_id',
  COUNT(*)::TEXT
FROM weekly_plans
WHERE family_id IS NOT NULL

UNION ALL

SELECT
  'Planes sin family_id (NULL)',
  COUNT(*)::TEXT
FROM weekly_plans
WHERE family_id IS NULL

UNION ALL

SELECT
  'Familias distintas',
  COUNT(DISTINCT family_id)::TEXT
FROM weekly_plans
WHERE family_id IS NOT NULL;

-- ============================================
-- 3. VERIFICAR COLUMNAS DE weekly_plans
-- ============================================

SELECT
  column_name AS "Columna",
  data_type AS "Tipo",
  is_nullable AS "Nullable",
  column_default AS "Default"
FROM information_schema.columns
WHERE table_name = 'weekly_plans'
  AND column_name IN ('id', 'user_id', 'family_id', 'name', 'start_date', 'end_date')
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFICAR FUNCIÓN HELPER
-- ============================================

SELECT
  proname AS "Nombre Función",
  prosecdef AS "SECURITY DEFINER",
  provolatile AS "Volatilidad",
  CASE
    WHEN provolatile = 'i' THEN 'IMMUTABLE'
    WHEN provolatile = 's' THEN 'STABLE'
    WHEN provolatile = 'v' THEN 'VOLATILE'
  END AS "Tipo Volatilidad"
FROM pg_proc
WHERE proname = 'get_current_user_family_id';

-- ============================================
-- 5. VERIFICAR RLS HABILITADO
-- ============================================

SELECT
  tablename AS "Tabla",
  rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE tablename IN ('weekly_plans', 'families', 'family_members')
  AND schemaname = 'public';

-- ============================================
-- 6. DETALLE DE PLANES (muestra primeros 5)
-- ============================================

SELECT
  id,
  name AS "Nombre Plan",
  user_id,
  family_id,
  start_date,
  end_date,
  created_at
FROM weekly_plans
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 7. ANÁLISIS DE PROBLEMA POTENCIAL
-- ============================================

-- Esta query identifica planes que podrían ser visibles por usuarios incorrectos
SELECT
  wp.id,
  wp.name,
  wp.user_id AS "Owner User ID",
  wp.family_id AS "Family ID",
  CASE
    WHEN wp.family_id IS NULL THEN 'Solo visible por owner (OK)'
    WHEN wp.family_id IS NOT NULL THEN 'Visible por familia (verificar políticas)'
    ELSE 'Estado desconocido'
  END AS "Estado de Visibilidad"
FROM weekly_plans wp
ORDER BY wp.created_at DESC;
