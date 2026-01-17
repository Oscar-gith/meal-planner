# Guía de Migración V1 → V2

## Cambios Principales

### Arquitectura Anterior (V1)
- `food_items`: Alimentos con meal_type y subtype
- `rules`: Sistema de reglas complejo
- Motor de planificación con lógica hardcodeada

### Nueva Arquitectura (V2)
- `food_ingredients`: Ingredientes individuales simples
- `meal_combinations`: Combinaciones creadas por usuario
- `weekly_plans`: Planes guardados en BD
- ❌ Se elimina tabla `rules` (no más motor de reglas)

## Pasos para Migrar

### 1. Acceder a Supabase SQL Editor

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `meal-planner`
3. Click en "SQL Editor" en el menú lateral

### 2. Ejecutar Schema V2

1. Abre el archivo: `src/lib/database/schema-v2.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Click en "Run" (Ejecutar)

**Resultado esperado:**
```
✅ Tablas creadas:
   - food_ingredients
   - meal_combinations
   - weekly_plans
✅ Índices creados
✅ Triggers configurados
```

### 3. Ejecutar Script de Migración

1. Abre el archivo: `src/lib/database/migration-v2.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Click en "Run"

**Resultado esperado:**
```
✅ 96 food_items migrados a food_ingredients
✅ Verificación completada
```

### 4. Verificar Migración

Ejecuta esta query en Supabase SQL Editor para verificar:

```sql
-- Ver conteo de registros
SELECT 'food_ingredients' as tabla, COUNT(*) as registros FROM food_ingredients
UNION ALL
SELECT 'meal_combinations' as tabla, COUNT(*) as registros FROM meal_combinations
UNION ALL
SELECT 'weekly_plans' as tabla, COUNT(*) as registros FROM weekly_plans;

-- Ver muestra de ingredientes migrados
SELECT id, name, type
FROM food_ingredients
ORDER BY type, name
LIMIT 10;
```

**Resultado esperado:**
```
food_ingredients  | 96
meal_combinations | 0
weekly_plans      | 0
```

### 5. (Opcional) Respaldar Tablas Antiguas

Si quieres mantener los datos antiguos como backup:

```sql
-- Renombrar tablas viejas
ALTER TABLE food_items RENAME TO food_items_backup;
ALTER TABLE rules RENAME TO rules_backup;
ALTER TABLE meal_plans RENAME TO meal_plans_backup;
```

## Qué Sigue

Después de la migración exitosa:

1. ✅ **CRUD de Ingredientes** - Página para agregar/editar ingredientes individuales
2. ✅ **CRUD de Combinaciones** - Página para crear menús personalizados
3. ✅ **Generador de Planes** - Sistema simplificado de planificación
4. ✅ **Editor de Planes** - Editar combinaciones individualmente

## Troubleshooting

### Error: "function update_updated_at_column does not exist"

Si ves este error, primero ejecuta:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

Luego vuelve a ejecutar schema-v2.sql

### Error: "relation food_ingredients already exists"

Las tablas ya fueron creadas. Puedes saltarte el paso 2 y solo ejecutar la migración (paso 3).

---

**Última actualización:** 2026-01-12
