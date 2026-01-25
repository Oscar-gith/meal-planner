-- PASO 1: Verificar políticas RLS activas en weekly_plans
-- Ejecuta esta query y comparte el resultado

SELECT
  polname AS "Nombre de Política",
  CASE
    WHEN polcmd = 'r' THEN 'SELECT'
    WHEN polcmd = 'a' THEN 'INSERT'
    WHEN polcmd = 'w' THEN 'UPDATE'
    WHEN polcmd = 'd' THEN 'DELETE'
    ELSE 'ALL'
  END AS "Operación",
  pg_get_expr(polqual, polrelid) AS "Cláusula USING",
  pg_get_expr(polwithcheck, polrelid) AS "Cláusula WITH CHECK"
FROM pg_policy
WHERE polrelid = 'weekly_plans'::regclass
ORDER BY polname;
