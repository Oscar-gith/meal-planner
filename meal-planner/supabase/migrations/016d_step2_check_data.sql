-- PASO 2: Verificar datos en weekly_plans
-- Ejecuta esta query y comparte el resultado

SELECT
  'Total de planes' AS "Métrica",
  COUNT(*)::TEXT AS "Valor"
FROM weekly_plans

UNION ALL

SELECT
  'Planes con family_id',
  COUNT(*)::TEXT
FROM weekly_plans
WHERE family_id IS NOT NULL

UNION ALL

SELECT
  'Planes sin family_id (NULL)',
  COUNT(*)::TEXT
FROM weekly_plans
WHERE family_id IS NULL

UNION ALL

SELECT
  'Familias distintas',
  COUNT(DISTINCT family_id)::TEXT
FROM weekly_plans
WHERE family_id IS NOT NULL;
