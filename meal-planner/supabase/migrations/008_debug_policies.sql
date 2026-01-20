-- Script de diagnóstico para ver todas las políticas actuales
-- Ejecuta esto en Supabase SQL Editor para ver qué políticas están activas

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('weekly_plans', 'plan_collaborators')
ORDER BY tablename, policyname;

-- También ver funciones de trigger
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%collaborator%';
