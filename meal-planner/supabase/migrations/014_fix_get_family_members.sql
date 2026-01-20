-- Migration: Corregir función get_family_members
-- El JOIN con auth.users puede fallar por permisos

BEGIN;

-- Reemplazar la función con una versión más robusta
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
    RETURN;  -- Retorna vacío si no está en familia
  END IF;

  -- Retornar miembros con email
  -- Usamos LEFT JOIN y COALESCE para manejar casos donde auth.users no es accesible
  RETURN QUERY
  SELECT
    fm.id as member_id,
    fm.user_id,
    COALESCE(
      (SELECT email FROM auth.users WHERE id = fm.user_id),
      'email@oculto.com'
    ) as user_email,
    fm.role,
    fm.joined_at
  FROM family_members fm
  WHERE fm.family_id = current_family_id
  ORDER BY fm.joined_at ASC;
END;
$$;

COMMIT;
