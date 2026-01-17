# Estado de Migración a V3

## Resumen

Migración de arquitectura de 2 niveles (Ingredientes → Combinaciones) a 3 niveles (Ingredientes → Platos → Menús).

**Fecha de inicio**: 2026-01-15
**Estado actual**: ✅ Diseño completado, implementación de Platos completada

## Progreso General

- ✅ Diseño de arquitectura de 3 niveles
- ✅ Documentación de schema V3
- ✅ Script SQL de migración
- ✅ Tipos TypeScript V3
- ✅ Página de Platos implementada
- ⏳ Ejecutar migración en base de datos
- ⏳ Migrar datos existentes
- ⏳ Actualizar página de Menús
- ⏳ Implementar motor de planificación semanal

## Archivos Creados

### Documentación
- [docs/SCHEMA-V3.md](./SCHEMA-V3.md) - Diseño detallado del schema de 3 niveles
- [docs/migration-v3.sql](./migration-v3.sql) - Script SQL para migración
- [docs/MIGRATION-STATUS.md](./MIGRATION-STATUS.md) - Este archivo (estado de migración)

### Tipos TypeScript
- [src/types/v3.ts](../src/types/v3.ts) - Tipos completos para arquitectura V3
  - `FoodIngredient` - Ingredientes atómicos
  - `FoodDish` - Platos con patrones (simple, compound, complete)
  - `MealMenu` - Menús con templates
  - `DISH_PATTERN_INFO` - Metadata de patrones de platos
  - `MENU_TEMPLATE_INFO` - Metadata de templates de menús
  - Validations helpers y constantes

### Páginas
- [src/app/platos/page.tsx](../src/app/platos/page.tsx) - Página CRUD de Platos
  - Selección de patrón de plato (simple/compound/complete)
  - Selección de ingredientes con filtros
  - Auto-generación de nombres
  - Agrupación por patrón
  - Expandir/colapsar para ver ingredientes
  - Toast notifications y confirmación de eliminación

## Arquitectura V3

### Nivel 1: Ingredientes (Atómicos)
```
Tabla: food_ingredients
Campos: id, name, type, description, tags, user_id
Ejemplos: Papa, Carne asada, Lechuga
```

### Nivel 2: Platos (Combinaciones de ingredientes)
```
Tabla: food_dishes
Campos: id, name, dish_pattern, ingredient_ids[], description, tags, user_id

Patrones:
- simple: Ingrediente individual o preparación simple
  Ejemplo: "Papa salada" = [Papa]

- compound: Múltiples ingredientes formando un plato
  Ejemplo: "Arroz con pollo" = [Arroz, Pollo]

- complete: Plato completo autosuficiente
  Ejemplo: "Ensalada de conchitas con atún" = [Pasta, Atún, Lechuga]
```

### Nivel 3: Menús (Combinaciones de platos)
```
Tabla: meal_menus (antes meal_combinations)
Campos: id, name, meal_type, dish_ids[], meal_template, notes, is_favorite, user_id

Templates:
- protein-carb-salad: Proteína + Carb + Ensalada (3 platos simples)
- main-salad: Plato principal + Ensalada (1 compound + 1 simple)
- complete: Plato único (1 complete)
- flexible: Sin restricción (cualquier combinación)
```

## Próximos Pasos

### 1. Ejecutar Migración en Base de Datos ⏳

Ejecutar el script [docs/migration-v3.sql](./migration-v3.sql) en Supabase:

```sql
-- El script:
-- 1. Crea backup de meal_combinations
-- 2. Crea tabla food_dishes
-- 3. Migra combinaciones existentes a platos (como 'compound')
-- 4. Crea meal_menus_new con nueva estructura
-- 5. Migra menús apuntando a los nuevos platos
-- 6. Reemplaza tabla original
-- 7. Actualiza políticas RLS
```

**IMPORTANTE**: Crear backup manual antes de ejecutar en producción.

### 2. Migrar Datos Existentes ⏳

Después de ejecutar la migración SQL:

1. Revisar los platos generados automáticamente
2. Actualizar `dish_pattern` manualmente según corresponda:
   - ¿Es un ingrediente simple? → 'simple'
   - ¿Es una combinación de ingredientes? → 'compound'
   - ¿Es un plato completo? → 'complete'
3. Actualizar `meal_template` en menús según corresponda

### 3. Actualizar Página de Menús ⏳

Modificar [src/app/combinaciones/page.tsx](../src/app/combinaciones/page.tsx):

- Renombrar a `src/app/menus/page.tsx`
- Cambiar de usar `meal_combinations` a `meal_menus`
- Cambiar de seleccionar ingredientes a seleccionar platos
- Agregar selección de template
- Validar que los platos seleccionados cumplan con el template
- Actualizar todas las referencias de "combinación" a "menú"

### 4. Implementar Motor de Planificación Semanal ⏳

Actualizar el motor de planificación para usar la nueva arquitectura:

- Trabajar con menús en lugar de combinaciones
- Considerar templates al generar planes
- Validar que los menús cumplan con los templates seleccionados

### 5. Actualizar Navegación

Agregar enlace a la nueva página de Platos en la navegación principal.

## Validaciones Implementadas

### A Nivel de Platos
- `simple`: Puede tener 1 o más ingredientes
- `compound`: Debe tener al menos 2 ingredientes
- `complete`: Debe tener al menos 3 ingredientes

### A Nivel de Menús (por implementar)
- `protein-carb-salad`: Validar 3 platos simples
- `main-salad`: Validar 1 compound + 1 simple
- `complete`: Validar exactamente 1 plato complete
- `flexible`: Sin restricciones

## Beneficios de V3

1. **Claridad Conceptual**: Separación clara entre ingredientes, platos y menús
2. **Flexibilidad**: Soporta todos los patrones de comida identificados
3. **Reutilización**: Los platos se pueden usar en múltiples menús
4. **Escalabilidad**: Fácil agregar nuevos patrones y templates
5. **Validación**: Se puede validar que los templates tengan los componentes correctos
6. **Mantenibilidad**: Código más organizado y modular

## Notas Importantes

### Compatibilidad con V2
- Los tipos V2 se mantienen en `src/types/v2.ts` para compatibilidad
- Las páginas existentes (ingredientes, combinaciones) seguirán funcionando
- La migración SQL crea backup automático

### Testing
- Probar la página de Platos antes de ejecutar la migración
- Verificar que la creación y edición de platos funcione correctamente
- Validar filtros y búsqueda

### Rollback
- Si algo sale mal, la tabla `meal_combinations_backup` tiene todos los datos originales
- Se puede revertir manualmente restaurando desde el backup

## Referencias

- [BACKLOG.md](./BACKLOG.md) - Decisión original y context
- [SCHEMA-V3.md](./SCHEMA-V3.md) - Documentación completa del schema
- [migration-v3.sql](./migration-v3.sql) - Script de migración
