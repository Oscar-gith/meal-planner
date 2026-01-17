# ✅ Credenciales Actualizadas - Pasos Finales

## Estado Actual
- ✅ Nuevo proyecto Supabase creado
- ✅ Credenciales actualizadas en `.env.local`
- ✅ Servidor reiniciado con nuevas credenciales
- ⏳ Falta crear las tablas en Supabase

---

## Paso Final: Crear Tablas en Supabase (2 minutos)

### 1. Ir al SQL Editor de Supabase

Abre este link (o navega manualmente):
```
https://supabase.com/dashboard/project/ovhzvwmiouaoilswgeef/sql/new
```

O desde el dashboard:
- Sidebar → SQL Editor → New Query

---

### 2. Ejecutar Script de Creación de Tablas

**Copiar TODO el contenido de:** `src/lib/database/schema-v2.sql`

1. Abre el archivo en VSCode
2. Selecciona todo (Cmd+A)
3. Copia (Cmd+C)
4. Pega en el SQL Editor de Supabase
5. Click en **"RUN"** (botón verde)

**Resultado esperado:**
```
Success. No rows returned
```

---

### 3. Verificar que Funcionó

En tu terminal, ejecuta:

```bash
npx tsx src/scripts/verify-migration.ts
```

**Deberías ver:**
```
✅ food_ingredients: 0 records
✅ meal_combinations: 0 records
✅ weekly_plans: 0 records
```

(0 registros es correcto - empezamos desde cero)

---

## 🎉 Una Vez Hecho Esto

1. Ve a http://localhost:3000/ingredientes
2. Deberás ver la página vacía con el botón "Agregar Ingrediente"
3. Prueba agregar tu primer ingrediente:
   - Nombre: Banano
   - Tipo: Fruta
   - Click "Crear"

Si eso funciona, ¡todo está listo! 🚀

---

## Troubleshooting

### Error: "function update_updated_at_column does not exist"

Ejecuta esto PRIMERO en el SQL Editor:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

Luego ejecuta schema-v2.sql de nuevo.

---

**¡Avísame cuando hayas ejecutado el script SQL y te confirmo que todo funciona!**
