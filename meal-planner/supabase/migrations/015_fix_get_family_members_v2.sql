-- Migration: Corregir función get_family_members v2
-- Versión que no depende de auth.users (que tiene restricciones)

BEGIN;

-- Primero crear una tabla para cachear emails de usuarios
-- Esto se actualizará automáticamente cuando usuarios se unan a familias
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas simples para user_profiles
-- Los usuarios pueden ver perfiles de miembros de su familia
CREATE POLICY "Users can view family member profiles" ON user_profiles
  FOR SELECT
  USING (
    user_id IN (
      SELECT fm.user_id
      FROM family_members fm
      WHERE fm.family_id = get_current_user_family_id()
    )
    OR user_id = auth.uid()
  );

-- Solo el usuario puede insertar/actualizar su propio perfil
CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Función para asegurar que el perfil existe (llamada internamente)
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_email TEXT;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Obtener email del usuario
  SELECT email INTO current_email
  FROM auth.users
  WHERE id = current_user_id;

  -- Insertar o actualizar perfil
  INSERT INTO user_profiles (user_id, email)
  VALUES (current_user_id, current_email)
  ON CONFLICT (user_id)
  DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
END;
$$;

-- Actualizar create_family para asegurar perfil
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

  -- Asegurar que el perfil existe
  PERFORM ensure_user_profile();

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

  -- Agregar al creador como admin
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (new_family_id, current_user_id, 'admin');

  -- Actualizar ingredientes existentes del usuario
  UPDATE food_ingredients
  SET family_id = new_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  -- Actualizar planes existentes del usuario
  UPDATE weekly_plans
  SET family_id = new_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  RETURN jsonb_build_object(
    'family_id', new_family_id,
    'invite_code', new_invite_code
  );
END;
$$;

-- Actualizar join_family para asegurar perfil
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

  -- Asegurar que el perfil existe
  PERFORM ensure_user_profile();

  -- Verificar que el usuario no esta ya en una familia
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = current_user_id) THEN
    RAISE EXCEPTION 'User is already in a family';
  END IF;

  -- Buscar la familia por codigo
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

  -- Agregar usuario como miembro
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (target_family_id, current_user_id, 'member');

  -- Actualizar ingredientes existentes del usuario
  UPDATE food_ingredients
  SET family_id = target_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  -- Actualizar planes existentes del usuario
  UPDATE weekly_plans
  SET family_id = target_family_id
  WHERE user_id = current_user_id AND family_id IS NULL;

  RETURN jsonb_build_object(
    'family_id', target_family_id,
    'family_name', target_family_name
  );
END;
$$;

-- Nueva versión de get_family_members que usa user_profiles
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
  -- Asegurar que el perfil del usuario actual existe
  PERFORM ensure_user_profile();

  -- Obtener familia del usuario actual
  SELECT family_id INTO current_family_id
  FROM family_members
  WHERE family_members.user_id = auth.uid();

  IF current_family_id IS NULL THEN
    RETURN;
  END IF;

  -- Retornar miembros usando user_profiles
  RETURN QUERY
  SELECT
    fm.id as member_id,
    fm.user_id,
    COALESCE(up.email, 'Sin email') as user_email,
    fm.role,
    fm.joined_at
  FROM family_members fm
  LEFT JOIN user_profiles up ON up.user_id = fm.user_id
  WHERE fm.family_id = current_family_id
  ORDER BY fm.joined_at ASC;
END;
$$;

-- Migrar perfiles existentes de usuarios que ya tienen familia
-- (esto llena user_profiles para usuarios existentes)
INSERT INTO user_profiles (user_id, email)
SELECT DISTINCT fm.user_id, u.email
FROM family_members fm
JOIN auth.users u ON u.id = fm.user_id
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
