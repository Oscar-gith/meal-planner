-- Migration: Sistema de Familia (Estilo Duolingo Family)
-- Reemplaza el sistema de plan_collaborators que tiene bug de RLS recursion
-- Fecha: 2026-01-19

BEGIN;

-- ============================================
-- 1. CREAR TABLAS NUEVAS
-- ============================================

-- Tabla de familias
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para families
CREATE UNIQUE INDEX idx_families_invite_code ON families(invite_code);
CREATE INDEX idx_families_created_by ON families(created_by);

-- Tabla de miembros de familia
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario solo puede estar en una familia
  CONSTRAINT unique_user_one_family UNIQUE (user_id)
);

-- Indices para family_members
CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);

-- ============================================
-- 2. AGREGAR family_id A TABLAS EXISTENTES
-- ============================================

ALTER TABLE food_ingredients
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;

-- Indices para family_id
CREATE INDEX IF NOT EXISTS idx_food_ingredients_family ON food_ingredients(family_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_family ON weekly_plans(family_id);

-- ============================================
-- 3. HABILITAR RLS EN TABLAS NUEVAS
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Asegurar que food_ingredients tiene RLS (puede que no lo tenga)
ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLITICAS RLS PARA families
-- ============================================

-- SELECT: Usuario puede ver su familia
CREATE POLICY "Users can view their family" ON families
  FOR SELECT
  USING (
    id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- INSERT: Cualquier usuario autenticado puede crear una familia
-- (la validacion de "no estar ya en familia" se hace en la funcion RPC)
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- UPDATE: Solo admin de la familia
CREATE POLICY "Family admins can update family" ON families
  FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Solo el creador original (y debe ser admin)
CREATE POLICY "Family creator can delete family" ON families
  FOR DELETE
  USING (
    created_by = auth.uid() AND
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. POLITICAS RLS PARA family_members
-- ============================================

-- SELECT: Miembros pueden ver otros miembros de su familia
CREATE POLICY "Members can view family members" ON family_members
  FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM family_members fm WHERE fm.user_id = auth.uid())
  );

-- INSERT: Solo via funcion RPC (SECURITY DEFINER)
-- No se permite INSERT directo para evitar recursion
-- Esta policy permite que las funciones SECURITY DEFINER inserten
CREATE POLICY "Only RPC functions can insert members" ON family_members
  FOR INSERT
  WITH CHECK (false);  -- Bloquea INSERT directo, solo funciones SECURITY DEFINER pueden

-- DELETE: Admin puede eliminar miembros, o usuario puede eliminarse a si mismo
CREATE POLICY "Admins can remove members or users can leave" ON family_members
  FOR DELETE
  USING (
    user_id = auth.uid()  -- Usuario puede eliminarse a si mismo
    OR
    family_id IN (
      SELECT family_id FROM family_members fm
      WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
    )
  );

-- ============================================
-- 6. POLITICAS RLS PARA food_ingredients (ACTUALIZAR)
-- ============================================

-- Eliminar policies viejas si existen
DROP POLICY IF EXISTS "Users can view own ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can insert own ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can update own ingredients" ON food_ingredients;
DROP POLICY IF EXISTS "Users can delete own ingredients" ON food_ingredients;

-- SELECT: Ver ingredientes propios O de la familia
CREATE POLICY "Users can view own or family ingredients" ON food_ingredients
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- INSERT: Usuario puede crear ingredientes (family_id se pone desde frontend)
CREATE POLICY "Users can insert ingredients" ON food_ingredients
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Propios O de la familia
CREATE POLICY "Users can update own or family ingredients" ON food_ingredients
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- DELETE: Propios O de la familia
CREATE POLICY "Users can delete own or family ingredients" ON food_ingredients
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- ============================================
-- 7. POLITICAS RLS PARA weekly_plans (ACTUALIZAR)
-- ============================================

-- Eliminar policies viejas que causan problemas
DROP POLICY IF EXISTS "Users can view plans they own or collaborate on" ON weekly_plans;
DROP POLICY IF EXISTS "Users can update plans they own or collaborate on" ON weekly_plans;
DROP POLICY IF EXISTS "Users can insert their own plans" ON weekly_plans;
DROP POLICY IF EXISTS "Only owners can delete plans" ON weekly_plans;

-- SELECT: Ver planes propios O de la familia
CREATE POLICY "Users can view own or family plans" ON weekly_plans
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
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
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- DELETE: Solo propios (el creador)
CREATE POLICY "Users can delete own plans" ON weekly_plans
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 8. FUNCIONES RPC (SECURITY DEFINER)
-- ============================================

-- Funcion helper para generar codigo de invitacion unico
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
  new_code VARCHAR(8);
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM families WHERE invite_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;

-- Crear familia
CREATE OR REPLACE FUNCTION create_family(family_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family_id UUID;
  new_invite_code VARCHAR(8);
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar que el usuario no esta ya en una familia
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = current_user_id) THEN
    RAISE EXCEPTION 'User is already in a family';
  END IF;

  -- Generar codigo de invitacion unico
  new_invite_code := generate_invite_code();

  -- Crear la familia
  INSERT INTO families (name, invite_code, created_by)
  VALUES (family_name, new_invite_code, current_user_id)
  RETURNING id INTO new_family_id;

  -- Agregar al creador como admin (bypass RLS con SECURITY DEFINER)
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (new_family_id, current_user_id, 'admin');

  -- Actualizar ingredientes existentes del usuario para asociarlos a la familia
  UPDATE food_ingredients
  SET family_id = new_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  -- Actualizar planes existentes del usuario para asociarlos a la familia
  UPDATE weekly_plans
  SET family_id = new_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  RETURN jsonb_build_object(
    'family_id', new_family_id,
    'invite_code', new_invite_code
  );
END;
$$;

-- Unirse a familia
CREATE OR REPLACE FUNCTION join_family(p_invite_code VARCHAR(8))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_family_id UUID;
  target_family_name VARCHAR(255);
  member_count INT;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar que el usuario no esta ya en una familia
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = current_user_id) THEN
    RAISE EXCEPTION 'User is already in a family';
  END IF;

  -- Buscar la familia por codigo (case insensitive)
  SELECT id, name INTO target_family_id, target_family_name
  FROM families
  WHERE invite_code = upper(p_invite_code);

  IF target_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Verificar limite de 6 miembros
  SELECT COUNT(*) INTO member_count
  FROM family_members
  WHERE family_id = target_family_id;

  IF member_count >= 6 THEN
    RAISE EXCEPTION 'Family has reached maximum members (6)';
  END IF;

  -- Agregar usuario como miembro (bypass RLS con SECURITY DEFINER)
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (target_family_id, current_user_id, 'member');

  -- Actualizar ingredientes existentes del usuario para asociarlos a la familia
  UPDATE food_ingredients
  SET family_id = target_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  -- Actualizar planes existentes del usuario para asociarlos a la familia
  UPDATE weekly_plans
  SET family_id = target_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  RETURN jsonb_build_object(
    'family_id', target_family_id,
    'family_name', target_family_name
  );
END;
$$;

-- Salir de familia
CREATE OR REPLACE FUNCTION leave_family()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_family_id UUID;
  is_admin BOOLEAN;
  admin_count INT;
  member_count INT;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Obtener familia actual del usuario
  SELECT family_id, (role = 'admin') INTO current_family_id, is_admin
  FROM family_members
  WHERE user_id = current_user_id;

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'User is not in a family';
  END IF;

  -- Si es admin, verificar que hay otro admin o que no hay otros miembros
  IF is_admin THEN
    SELECT COUNT(*) INTO admin_count
    FROM family_members
    WHERE family_id = current_family_id AND role = 'admin';

    SELECT COUNT(*) INTO member_count
    FROM family_members
    WHERE family_id = current_family_id;

    IF admin_count <= 1 AND member_count > 1 THEN
      RAISE EXCEPTION 'Cannot leave: you are the only admin. Transfer admin role first or remove other members.';
    END IF;

    -- Si es el unico miembro, eliminar la familia
    IF member_count <= 1 THEN
      DELETE FROM families WHERE id = current_family_id;
      RETURN jsonb_build_object('success', true, 'family_deleted', true);
    END IF;
  END IF;

  -- Desasociar ingredientes del usuario de la familia
  UPDATE food_ingredients
  SET family_id = NULL
  WHERE user_id = current_user_id AND family_id = current_family_id;

  -- Desasociar planes del usuario de la familia
  UPDATE weekly_plans
  SET family_id = NULL
  WHERE user_id = current_user_id AND family_id = current_family_id;

  -- Eliminar al usuario de la familia
  DELETE FROM family_members WHERE user_id = current_user_id;

  RETURN jsonb_build_object('success', true, 'family_deleted', false);
END;
$$;

-- Obtener informacion de familia del usuario
CREATE OR REPLACE FUNCTION get_user_family()
RETURNS TABLE (
  family_id UUID,
  family_name VARCHAR(255),
  invite_code VARCHAR(8),
  user_role VARCHAR(20),
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as family_id,
    f.name as family_name,
    f.invite_code,
    fm.role as user_role,
    (SELECT COUNT(*) FROM family_members fm2 WHERE fm2.family_id = f.id) as member_count
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.user_id = auth.uid();
END;
$$;

-- Obtener miembros de la familia
CREATE OR REPLACE FUNCTION get_family_members()
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  user_email TEXT,
  role VARCHAR(20),
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_family_id UUID;
BEGIN
  -- Obtener familia del usuario actual
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE family_members.user_id = auth.uid();

  IF current_family_id IS NULL THEN
    RETURN;  -- Retorna vacio si no esta en familia
  END IF;

  RETURN QUERY
  SELECT
    fm.id as member_id,
    fm.user_id,
    u.email as user_email,
    fm.role,
    fm.joined_at
  FROM family_members fm
  JOIN auth.users u ON u.id = fm.user_id
  WHERE fm.family_id = current_family_id
  ORDER BY fm.joined_at ASC;
END;
$$;

-- Regenerar codigo de invitacion
CREATE OR REPLACE FUNCTION regenerate_invite_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_family_id UUID;
  new_invite_code VARCHAR(8);
BEGIN
  -- Verificar que el usuario es admin
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE user_id = auth.uid() AND role = 'admin';

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'Only family admins can regenerate invite code';
  END IF;

  -- Generar nuevo codigo unico
  new_invite_code := generate_invite_code();

  -- Actualizar
  UPDATE families SET invite_code = new_invite_code, updated_at = NOW()
  WHERE id = current_family_id;

  RETURN new_invite_code;
END;
$$;

-- Eliminar miembro (solo admin)
CREATE OR REPLACE FUNCTION remove_family_member(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_family_id UUID;
  target_family_id UUID;
  target_role VARCHAR(20);
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE user_id = auth.uid() AND role = 'admin';

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'Only family admins can remove members';
  END IF;

  -- Verificar que el target pertenece a la misma familia
  SELECT family_id, role INTO target_family_id, target_role
  FROM family_members
  WHERE user_id = target_user_id;

  IF target_family_id IS NULL OR target_family_id != current_family_id THEN
    RAISE EXCEPTION 'User is not a member of your family';
  END IF;

  -- No permitir eliminarse a si mismo (usar leave_family)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave_family instead.';
  END IF;

  -- Desasociar ingredientes del usuario de la familia
  UPDATE food_ingredients
  SET family_id = NULL
  WHERE user_id = target_user_id AND family_id = current_family_id;

  -- Desasociar planes del usuario de la familia
  UPDATE weekly_plans
  SET family_id = NULL
  WHERE user_id = target_user_id AND family_id = current_family_id;

  -- Eliminar al usuario de la familia
  DELETE FROM family_members WHERE user_id = target_user_id AND family_id = current_family_id;

  RETURN TRUE;
END;
$$;

-- Transferir rol de admin
CREATE OR REPLACE FUNCTION transfer_admin_role(new_admin_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_family_id UUID;
  target_family_id UUID;
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE user_id = auth.uid() AND role = 'admin';

  IF current_family_id IS NULL THEN
    RAISE EXCEPTION 'Only family admins can transfer admin role';
  END IF;

  -- Verificar que el target pertenece a la misma familia
  SELECT family_id INTO target_family_id
  FROM family_members
  WHERE user_id = new_admin_user_id;

  IF target_family_id IS NULL OR target_family_id != current_family_id THEN
    RAISE EXCEPTION 'User is not a member of your family';
  END IF;

  -- No transferir a si mismo
  IF new_admin_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer admin role to yourself';
  END IF;

  -- Cambiar rol del target a admin
  UPDATE family_members
  SET role = 'admin'
  WHERE user_id = new_admin_user_id AND family_id = current_family_id;

  -- Cambiar rol del actual a member
  UPDATE family_members
  SET role = 'member'
  WHERE user_id = auth.uid() AND family_id = current_family_id;

  RETURN TRUE;
END;
$$;

-- ============================================
-- 9. ELIMINAR SISTEMA VIEJO (plan_collaborators)
-- ============================================

-- Eliminar trigger problematico
DROP TRIGGER IF EXISTS trigger_create_plan_owner_collaborator ON weekly_plans;
DROP FUNCTION IF EXISTS create_plan_owner_collaborator();

-- Eliminar funciones relacionadas a collaborators
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);
DROP FUNCTION IF EXISTS is_plan_owner(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_plan_role(UUID, UUID);

-- Nota: No eliminamos plan_collaborators todavia para poder hacer rollback si es necesario
-- Descomentar cuando todo este verificado:
-- DROP TABLE IF EXISTS plan_collaborators CASCADE;

COMMIT;
