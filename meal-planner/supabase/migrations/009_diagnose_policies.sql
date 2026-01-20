-- Script de diagnóstico - EJECUTAR EN SUPABASE SQL EDITOR

-- 1. Ver si FORCE RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN 'RLS ENABLED'
        ELSE 'RLS DISABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('weekly_plans', 'plan_collaborators');

-- 2. Ver todas las políticas activas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    CASE
        WHEN with_check IS NOT NULL THEN 'HAS WITH_CHECK'
        ELSE 'NO WITH_CHECK'
    END as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('weekly_plans', 'plan_collaborators')
ORDER BY tablename, cmd, policyname;

-- 3. Ver detalles de la política INSERT de plan_collaborators
SELECT
    policyname,
    pg_get_expr(polqual, polrelid) as using_expression,
    pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
JOIN pg_class ON pg_policy.polrelid = pg_class.oid
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE nspname = 'public'
  AND relname = 'plan_collaborators'
  AND polcmd = 'a'; -- 'a' = INSERT

-- 4. Ver la definición de la función del trigger
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'create_plan_owner_collaborator';
