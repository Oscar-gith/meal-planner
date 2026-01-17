# Migraciones de Supabase

Este directorio contiene los scripts SQL para crear y modificar el esquema de la base de datos en Supabase.

## Orden de Ejecución

Ejecutar estos scripts en Supabase SQL Editor en el siguiente orden:

### 001 - Actualización de Tipos de Ingredientes
**Archivo:** `001_update_ingredient_types.sql`

Actualiza los tipos de ingredientes existentes:
- `Carb` → `Carb Almuerzo`
- `Proteina Almuerzo` → `Proteína Almuerzo` (con tilde)

**Estado:** ✅ Ejecutado

---

### 002 - Crear Tabla de Patrones
**Archivo:** `002_create_meal_patterns.sql`

Crea la tabla `meal_patterns` y la pobla con 7 patrones del sistema:
- Desayuno: 2 patrones
- Almuerzo: 3 patrones
- Onces: 2 patrones

**Estado:** ✅ Ejecutado (con 8 patrones - necesita migración 004)

---

### 003 - Crear Tablas de Planes Semanales
**Archivo:** `003_create_weekly_plans.sql`

Crea las tablas:
- `weekly_plans` - Para almacenar planes generados
- `pattern_distributions` - Para preferencias de usuario

**Estado:** ✅ Ejecutado

---

### 004 - Eliminar Patrón "Completo Onces"
**Archivo:** `004_remove_completo_onces_pattern.sql`

Elimina el patrón "Completo Onces" que fue removido del sistema.
Deja solo 2 patrones para Onces (Tradicional y Compuesto + Fruta).

**Estado:** ⏳ Pendiente de ejecutar

---

## Notas

- Todos los scripts son idempotentes (seguros de ejecutar múltiples veces)
- Los scripts incluyen verificación y mensajes de confirmación
- Todos los scripts usan transacciones (BEGIN/COMMIT)
- Las políticas RLS están habilitadas en todas las tablas
