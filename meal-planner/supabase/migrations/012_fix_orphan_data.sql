-- Fix: Transferir datos huérfanos al usuario que ejecuta este script
-- Ejecutar en Supabase SQL Editor mientras estás logueado

-- Opción 1: Si conoces tu user_id real, reemplaza 'TU_USER_ID_AQUI'
-- UPDATE food_ingredients SET user_id = 'TU_USER_ID_AQUI' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE weekly_plans SET user_id = 'TU_USER_ID_AQUI' WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Opción 2: Usar auth.uid() directamente (ejecutar mientras estás logueado en Supabase)
UPDATE food_ingredients
SET user_id = auth.uid()
WHERE user_id = '00000000-0000-0000-0000-000000000000';

UPDATE weekly_plans
SET user_id = auth.uid()
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Verificar
SELECT COUNT(*) as orphan_ingredients FROM food_ingredients WHERE user_id = '00000000-0000-0000-0000-000000000000';
SELECT COUNT(*) as orphan_plans FROM weekly_plans WHERE user_id = '00000000-0000-0000-0000-000000000000';
