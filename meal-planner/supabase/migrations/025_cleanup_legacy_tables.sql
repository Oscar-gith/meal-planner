-- Migration: Eliminar tablas legacy/no usadas
-- Problema: Security advisor reporta 7 tablas sin RLS que no se usan en el código.
-- Estas tablas fueron experimentos, backups temporales, o parte de arquitectura deprecada.
--
-- Solución: Eliminar tablas que no se usan (verificado con grep en src/)
--
-- IMPORTANTE: Esta migración es DESTRUCTIVA. Si estas tablas contienen datos importantes,
-- hacer backup antes de aplicar.

BEGIN;

-- ============================================
-- 1. ELIMINAR TABLAS DE STATS/CONTADORES
-- ============================================
-- Estas tablas parecen haber sido experimentos de contadores/stats
-- No se usan en ninguna parte del código (verificado con grep)

DROP TABLE IF EXISTS public.total_plans CASCADE;
DROP TABLE IF EXISTS public.plans_with_family CASCADE;
DROP TABLE IF EXISTS public.families_count CASCADE;
DROP TABLE IF EXISTS public.weekly_plans_count CASCADE;
DROP TABLE IF EXISTS public.ingredients_count CASCADE;

-- ============================================
-- 2. ELIMINAR TABLA DE ARQUITECTURA LEGACY
-- ============================================
-- meal_combinations era parte de la arquitectura de 3 niveles
-- que fue deprecada en sesión 2026-01-17
-- Ver: docs/obsolete/SCHEMA-V3.md

DROP TABLE IF EXISTS public.meal_combinations CASCADE;

-- ============================================
-- 3. ELIMINAR BACKUP TEMPORAL
-- ============================================
-- Backup creado durante migración 001 (actualización de tipos)
-- Ya no es necesario, fue hace tiempo

DROP TABLE IF EXISTS public.food_ingredients_backup_before_type_update CASCADE;

COMMIT;
