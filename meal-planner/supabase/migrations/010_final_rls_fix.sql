-- FIX FINAL para RLS recursion
-- Solución: Deshabilitar RLS temporalmente dentro del trigger

-- 1. Re-habilitar RLS en weekly_plans (se deshabilitó accidentalmente)
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- 2. Actualizar la función del trigger para deshabilitar RLS temporalmente
DROP FUNCTION IF EXISTS create_plan_owner_collaborator() CASCADE;

CREATE OR REPLACE FUNCTION create_plan_owner_collaborator()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deshabilitar RLS temporalmente para este INSERT
  -- Esto solo funciona en el contexto de esta transacción
  SET LOCAL row_security = off;

  -- Insertar el colaborador owner (bypass RLS)
  INSERT INTO plan_collaborators (plan_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NULL);

  -- Re-habilitar RLS (se restablecerá automáticamente al final de la transacción)
  SET LOCAL row_security = on;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recrear el trigger
CREATE TRIGGER trigger_create_plan_owner_collaborator
  AFTER INSERT ON weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION create_plan_owner_collaborator();

-- 4. Limpiar la política INSERT (volver a la versión simple sin current_setting)
DROP POLICY IF EXISTS "Plan owners can add collaborators" ON plan_collaborators;

CREATE POLICY "Plan owners can add collaborators" ON plan_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_plans
      WHERE weekly_plans.id = plan_collaborators.plan_id
      AND weekly_plans.user_id = auth.uid()
    )
  );
