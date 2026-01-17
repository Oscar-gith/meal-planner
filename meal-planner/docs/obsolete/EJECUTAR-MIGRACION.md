# 🚀 Ejecutar Migración de Base de Datos

## Pasos Rápidos (5 minutos)

### 1. Abrir Supabase Dashboard

Ve a: https://supabase.com/dashboard/project//sql/new

(O navega: Dashboard → Tu proyecto → SQL Editor → New Query)

---

### 2. Ejecutar Script 1: Crear Tablas Nuevas

**Archivo:** `src/lib/database/schema-v2.sql`

1. Abre el archivo en tu editor
2. Copia TODO el contenido (Cmd+A, Cmd+C)
3. Pégalo en el SQL Editor de Supabase
4. Click en **"RUN"** (botón verde abajo a la derecha)

**Resultado esperado:**
```
Success. No rows returned
```

---

### 3. Ejecutar Script 2: Migrar Datos

**Archivo:** `src/lib/database/migration-v2.sql`

1. Abre el archivo en tu editor
2. Copia TODO el contenido
3. En Supabase, click en **"New Query"** (para limpiar el editor)
4. Pégalo en el editor
5. Click en **"RUN"**

**Resultado esperado:**
```
Migrated 96 food items to food_ingredients
Migration complete. Users can now create custom combinations.
```

---

### 4. Verificar Migración

En tu terminal, ejecuta:

```bash
npx tsx src/scripts/verify-migration.ts
```

**Resultado esperado:**
```
✅ food_ingredients: 96 records
✅ meal_combinations: 0 records
✅ weekly_plans: 0 records
```

---

## ¿Listo?

Una vez veas ✅ en los 3 pasos, la migración está completa y podemos continuar con:

1. ✅ Implementar CRUD de ingredientes
2. ✅ Implementar CRUD de combinaciones
3. ✅ Crear generador de planes

---

## Troubleshooting

### Error: "function update_updated_at_column does not exist"

Ejecuta primero este SQL:

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

Bien, significa que el paso 2 ya se hizo. Solo ejecuta el paso 3 (migration-v2.sql).
