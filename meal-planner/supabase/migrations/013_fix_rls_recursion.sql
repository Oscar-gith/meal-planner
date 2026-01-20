-- Migration: Corregir recursión RLS en family_members
-- El problema: las políticas RLS de family_members hacen SELECT a family_members,
-- causando recursión infinita.
-- Solución: Usar función SECURITY DEFINER que bypasea RLS

BEGIN;

-- ============================================
-- 1. CREAR FUNCIÓN HELPER (SECURITY DEFINER)
-- ============================================

-- Esta función bypasea RLS y devuelve el family_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- ============================================
-- 2. ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ============================================

-- Políticas de family_members
DROP POLICY IF EXISTS "Members can view family members" ON family_members;
DROP POLICY IF EXISTS "Only RPC functions can insert members" ON family_members;
DROP POLICY IF EXISTS "Admins can remove members or users can leave" ON family_members;

-- Políticas de families
DROP POLICY IF EXISTS "Users can view their family" ON families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
DROP POLICY IF EXISTS "Family admins can update family" ON families;
DROP POLICY IF EXISTS "Family creator can delete family" ON families;

-- Políticas de food_ingredients
DROP POLICY IF EXISTS "Users can view own or family ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can insert ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can update own or family ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can delete own or family ingredients" ON food_ingredients;

-- Políticas de weekly_plans
DROP POLICY IF EXISTS "Users can view own or family plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can insert plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can update own or family plans" ON weekly_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON weekly_plans;

-- ============================================
-- 3. DESHABILITAR RLS EN family_members
-- ============================================

-- family_members no necesita RLS porque todas las operaciones
-- se hacen via funciones SECURITY DEFINER (create_family, join_family, etc.)
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. NUEVAS POLÍTICAS PARA families
-- ============================================

-- SELECT: Usuario puede ver su familia usando la función helper
CREATE POLICY "Users can view their family" ON families
  FOR SELECT
  USING (id = get_current_user_family_id());

-- INSERT: Cualquier usuario autenticado puede crear una familia
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- UPDATE: Solo admin de la familia (verificado via función helper + created_by)
-- Simplificado: solo el creador puede actualizar
CREATE POLICY "Family creator can update family" ON families
  FOR UPDATE
  USING (id = get_current_user_family_id() AND created_by = auth.uid());

-- DELETE: Solo el creador original
CREATE POLICY "Family creator can delete family" ON families
  FOR DELETE
  USING (created_by = auth.uid() AND id = get_current_user_family_id());

-- ============================================
-- 5. NUEVAS POLÍTICAS PARA food_ingredients
-- ============================================

-- SELECT: Ver ingredientes propios O de la familia
CREATE POLICY "Users can view own or family ingredients" ON food_ingredients
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    family_id = get_current_user_family_id()
  );

-- INSERT: Usuario puede crear ingredientes
CREATE POLICY "Users can insert ingredients" ON food_ingredients
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Propios O de la familia
CREATE POLICY "Users can update own or family ingredients" ON food_ingredients
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    family_id = get_current_user_family_id()
  );

-- DELETE: Propios O de la familia
CREATE POLICY "Users can delete own or family ingredients" ON food_ingredients
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    family_id = get_current_user_family_id()
  );

-- ============================================
-- 6. NUEVAS POLÍTICAS PARA weekly_plans
-- ============================================

-- SELECT: Ver planes propios O de la familia
CREATE POLICY "Users can view own or family plans" ON weekly_plans
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    family_id = get_current_user_family_id()
  );

-- INSERT: Usuario puede crear planes
CREATE POLICY "Users can insert plans" ON weekly_plans
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Propios O de la familia
CREATE POLICY "Users can update own or family plans" ON weekly_plans
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    family_id = get_current_user_family_id()
  );

-- DELETE: Solo propios (el creador)
CREATE POLICY "Users can delete own plans" ON weekly_plans
  FOR DELETE
  USING (user_id = auth.uid());

COMMIT;
