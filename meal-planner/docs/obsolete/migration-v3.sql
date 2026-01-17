-- ============================================
-- Migration Script: Schema V2 → V3
-- Arquitectura de 3 Niveles
-- ============================================

-- IMPORTANTE: Ejecutar este script en orden secuencial
-- Crear backup manual antes de ejecutar en producción

BEGIN;

-- ============================================
-- PASO 1: Backup de Seguridad
-- ============================================

-- Crear tabla de backup de meal_combinations
CREATE TABLE IF NOT EXISTS meal_combinations_backup AS
SELECT * FROM meal_combinations;

COMMENT ON TABLE meal_combinations_backup IS
'Backup de meal_combinations antes de migración a V3 - Creado el ' || NOW()::TEXT;

-- ============================================
-- PASO 2: Crear Nueva Tabla food_dishes
-- ============================================

CREATE TABLE food_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dish_pattern TEXT NOT NULL CHECK (dish_pattern IN ('simple', 'compound', 'complete')),
  ingredient_ids UUID[] NOT NULL,
  description TEXT,
  tags TEXT[],
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key constraint (comentar si auth.users no existe aún)
  CONSTRAINT fk_dishes_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Índices para optimización
CREATE INDEX idx_dishes_user ON food_dishes(user_id);
CREATE INDEX idx_dishes_pattern ON food_dishes(dish_pattern);
CREATE INDEX idx_dishes_created ON food_dishes(created_at DESC);

COMMENT ON TABLE food_dishes IS
'Platos compuestos por ingredientes. Nivel intermedio en arquitectura de 3 niveles.';

COMMENT ON COLUMN food_dishes.dish_pattern IS
'Patrón del plato: simple (1 ingrediente), compound (múltiples ingredientes), complete (plato completo autosuficiente)';

-- ============================================
-- PASO 3: Migrar Datos Existentes a food_dishes
-- ============================================

-- Convertir combinaciones existentes en platos "compound"
-- Esto es una migración inicial; se recomienda revisión manual posterior
INSERT INTO food_dishes (name, dish_pattern, ingredient_ids, description, user_id, created_at)
SELECT
  COALESCE(name, 'Plato sin nombre') as name,
  'compound' as dish_pattern,
  ingredient_ids,
  notes as description,
  user_id,
  created_at
FROM meal_combinations;

-- Log de migración
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM food_dishes;
  RAISE NOTICE 'Migrados % platos desde meal_combinations', migrated_count;
END $$;

-- ============================================
-- PASO 4: Crear Tabla Temporal para Nueva Estructura
-- ============================================

-- Crear meal_menus nueva con estructura correcta
CREATE TABLE meal_menus_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  meal_type TEXT NOT NULL,
  dish_ids UUID[] NOT NULL,
  meal_template TEXT NOT NULL DEFAULT 'flexible'
    CHECK (meal_template IN ('protein-carb-salad', 'main-salad', 'complete', 'flexible')),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key constraint
  CONSTRAINT fk_menus_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_menus_user ON meal_menus_new(user_id);
CREATE INDEX idx_menus_type ON meal_menus_new(meal_type);
CREATE INDEX idx_menus_template ON meal_menus_new(meal_template);
CREATE INDEX idx_menus_created ON meal_menus_new(created_at DESC);

COMMENT ON TABLE meal_menus_new IS
'Menús compuestos por platos. Nivel superior en arquitectura de 3 niveles.';

COMMENT ON COLUMN meal_menus_new.meal_template IS
'Plantilla del menú que define cómo se combinan los platos: protein-carb-salad, main-salad, complete, o flexible';

-- ============================================
-- PASO 5: Migrar Menús (con relación dish_ids)
-- ============================================

-- Crear menús que apunten a los nuevos platos
-- Cada combinación antigua se convierte en un menú con 1 plato
INSERT INTO meal_menus_new (id, name, meal_type, dish_ids, meal_template, notes, is_favorite, user_id, created_at)
SELECT
  c.id,
  c.name,
  c.meal_type,
  -- Buscar el dish_id correspondiente que tenga los mismos ingredient_ids
  ARRAY(
    SELECT d.id
    FROM food_dishes d
    WHERE d.ingredient_ids = c.ingredient_ids
      AND d.user_id = c.user_id
    LIMIT 1
  ) as dish_ids,
  'flexible' as meal_template,
  c.notes,
  c.is_favorite,
  c.user_id,
  c.created_at
FROM meal_combinations c;

-- Log de migración
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM meal_menus_new;
  RAISE NOTICE 'Migrados % menús desde meal_combinations', migrated_count;
END $$;

-- ============================================
-- PASO 6: Reemplazar Tabla Original
-- ============================================

-- Eliminar tabla antigua y renombrar la nueva
DROP TABLE meal_combinations;
ALTER TABLE meal_menus_new RENAME TO meal_menus;

-- Renombrar índices
ALTER INDEX idx_menus_user RENAME TO idx_meal_menus_user;
ALTER INDEX idx_menus_type RENAME TO idx_meal_menus_type;
ALTER INDEX idx_menus_template RENAME TO idx_meal_menus_template;
ALTER INDEX idx_menus_created RENAME TO idx_meal_menus_created;

-- ============================================
-- PASO 7: Actualizar Políticas RLS (si existen)
-- ============================================

-- Habilitar RLS
ALTER TABLE food_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_menus ENABLE ROW LEVEL SECURITY;

-- Políticas para food_dishes
DROP POLICY IF EXISTS "Users can view their own dishes" ON food_dishes;
CREATE POLICY "Users can view their own dishes"
  ON food_dishes FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own dishes" ON food_dishes;
CREATE POLICY "Users can insert their own dishes"
  ON food_dishes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own dishes" ON food_dishes;
CREATE POLICY "Users can update their own dishes"
  ON food_dishes FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own dishes" ON food_dishes;
CREATE POLICY "Users can delete their own dishes"
  ON food_dishes FOR DELETE
  USING (user_id = auth.uid());

-- Políticas para meal_menus (actualizar si ya existen)
DROP POLICY IF EXISTS "Users can view their own menus" ON meal_menus;
CREATE POLICY "Users can view their own menus"
  ON meal_menus FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own menus" ON meal_menus;
CREATE POLICY "Users can insert their own menus"
  ON meal_menus FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own menus" ON meal_menus;
CREATE POLICY "Users can update their own menus"
  ON meal_menus FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own menus" ON meal_menus;
CREATE POLICY "Users can delete their own menus"
  ON meal_menus FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- PASO 8: Verificación Final
-- ============================================

-- Verificar conteos
DO $$
DECLARE
  ingredient_count INTEGER;
  dish_count INTEGER;
  menu_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ingredient_count FROM food_ingredients;
  SELECT COUNT(*) INTO dish_count FROM food_dishes;
  SELECT COUNT(*) INTO menu_count FROM meal_menus;
  SELECT COUNT(*) INTO backup_count FROM meal_combinations_backup;

  RAISE NOTICE '================================';
  RAISE NOTICE 'Migración completada exitosamente';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Ingredientes: %', ingredient_count;
  RAISE NOTICE 'Platos (nuevo): %', dish_count;
  RAISE NOTICE 'Menús (actualizado): %', menu_count;
  RAISE NOTICE 'Backup guardado: % registros', backup_count;
  RAISE NOTICE '================================';
END $$;

COMMIT;

-- ============================================
-- NOTAS POST-MIGRACIÓN
-- ============================================

-- 1. Verificar que todos los datos se migraron correctamente
-- 2. Revisar manualmente los platos y actualizar dish_pattern si es necesario
-- 3. Revisar los menús y actualizar meal_template según corresponda
-- 4. La tabla meal_combinations_backup puede eliminarse después de verificar
-- 5. Actualizar la aplicación para usar las nuevas tablas
