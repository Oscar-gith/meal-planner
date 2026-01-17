-- ============================================
-- Script de Actualización de Tipos de Ingredientes
-- ============================================
-- Este script actualiza los tipos existentes para el nuevo sistema de patrones
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- Crear backup de seguridad
CREATE TABLE IF NOT EXISTS food_ingredients_backup_before_type_update AS
SELECT * FROM food_ingredients;

-- Log inicial
DO $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM food_ingredients;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Iniciando actualización de tipos';
  RAISE NOTICE 'Total de ingredientes: %', total_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ACTUALIZACIONES DE TIPOS
-- ============================================

-- 1. Carb → Carb Almuerzo
UPDATE food_ingredients
SET type = 'Carb Almuerzo'
WHERE type = 'Carb';

-- Log de actualización
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM food_ingredients WHERE type = 'Carb Almuerzo';
  RAISE NOTICE 'Actualizado "Carb" → "Carb Almuerzo": % ingredientes', updated_count;
END $$;

-- 2. Proteina Almuerzo → Proteína Almuerzo (agregar tilde)
UPDATE food_ingredients
SET type = 'Proteína Almuerzo'
WHERE type = 'Proteina Almuerzo';

-- Log de actualización
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM food_ingredients WHERE type = 'Proteína Almuerzo';
  RAISE NOTICE 'Actualizado "Proteina Almuerzo" → "Proteína Almuerzo": % ingredientes', updated_count;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  type_summary TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Resumen de tipos actuales:';
  RAISE NOTICE '========================================';

  FOR type_summary IN
    SELECT type || ': ' || COUNT(*)::TEXT || ' ingredientes'
    FROM food_ingredients
    GROUP BY type
    ORDER BY type
  LOOP
    RAISE NOTICE '%', type_summary;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Actualización completada exitosamente';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- NOTAS POST-ACTUALIZACIÓN
-- ============================================

-- Los siguientes tipos NO fueron modificados (quedan tal cual):
-- - "Fruta"
-- - "Verdura"
-- - "Bebida"
-- - "Carb Onces"

-- Nuevos tipos que debes crear manualmente después:
-- - "Carb Desayuno"
-- - "Proteína Desayuno"
-- - "Compuesto Desayuno"
-- - "Compuesto Almuerzo"
-- - "Completo Almuerzo"
-- - "Compuesto Onces"
-- - "Completo Onces"

-- Si algo sale mal, puedes restaurar desde el backup:
-- DELETE FROM food_ingredients;
-- INSERT INTO food_ingredients SELECT * FROM food_ingredients_backup_before_type_update;
