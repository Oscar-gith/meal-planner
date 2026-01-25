-- Migration: Corregir políticas RLS de families
-- Problema: Políticas circulares bloquean la vista de families
-- Solución: Simplificar políticas para evitar recursión
-- Fecha: 2026-01-23

BEGIN;

-- ============================================
-- 1. ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ============================================

DROP POLICY IF EXISTS "Users can view their family" ON families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
DROP POLICY IF EXISTS "Family creator can update family" ON families;
DROP POLICY IF EXISTS "Family admins can update family" ON families;
DROP POLICY IF EXISTS "Family creator can delete family" ON families;

-- ============================================
-- 2. CREAR NUEVAS POLÍTICAS SIMPLIFICADAS
-- ============================================

-- SELECT: Usuario puede ver familias donde es miembro
-- Esta policy NO usa get_current_user_family_id() para evitar recursión
-- En su lugar, hace un JOIN directo a family_members
CREATE POLICY "Members can view their families" ON families
  FOR SELECT
  USING (
    -- Verificar que el usuario es miembro de esta familia
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
    )
  );

-- INSERT: Cualquier usuario autenticado puede crear una familia
-- La validación de "no estar ya en familia" se hace en create_family() RPC
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- UPDATE: Solo el creador de la familia puede actualizar
-- Simplificado para evitar recursión
CREATE POLICY "Family creator can update" ON families
  FOR UPDATE
  USING (created_by = auth.uid());

-- DELETE: Solo el creador puede eliminar su familia
CREATE POLICY "Family creator can delete" ON families
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- 3. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON POLICY "Members can view their families" ON families IS
  'Permite ver familias donde el usuario es miembro. Usa EXISTS con family_members para evitar recursión RLS.';

COMMENT ON POLICY "Authenticated users can create families" ON families IS
  'Permite a usuarios autenticados crear familias. Validación de unicidad se hace en RPC.';

COMMENT ON POLICY "Family creator can update" ON families IS
  'Solo el creador (created_by) puede actualizar la familia.';

COMMENT ON POLICY "Family creator can delete" ON families IS
  'Solo el creador puede eliminar la familia.';

-- ============================================
-- 4. VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'families'::regclass;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS ACTUALIZADAS - families';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total políticas en families: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas esperadas:';
  RAISE NOTICE '1. Members can view their families (SELECT)';
  RAISE NOTICE '2. Authenticated users can create families (INSERT)';
  RAISE NOTICE '3. Family creator can update (UPDATE)';
  RAISE NOTICE '4. Family creator can delete (DELETE)';
  RAISE NOTICE '';

  IF policy_count = 4 THEN
    RAISE NOTICE '✓ Correcto - 4 políticas activas';
  ELSE
    RAISE WARNING '✗ Esperado 4 políticas, encontradas %', policy_count;
  END IF;

  RAISE NOTICE '========================================';
END $$;

COMMIT;
