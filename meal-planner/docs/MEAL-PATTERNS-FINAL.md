# Sistema de Patrones de Comida - Definición Final

**Última actualización:** 2026-01-17
**Estado:** Implementado y funcional ✅
**Verificado contra:** Código real en [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts)

---

## Visión General

Sistema de planificación de comidas basado en patrones fijos con tipos de ingredientes específicos. El motor de planificación combina automáticamente ingredientes según patrones predefinidos.

**Principio Fundamental:** Si no hay ingredientes de un tipo específico, el motor NO incluye ese patrón en la planificación.

**Implementación:** Los 7 patrones están almacenados en la tabla `meal_patterns` de Supabase y el motor de planificación los lee dinámicamente desde la base de datos.

---

## Tipos de Ingredientes Definidos

### DESAYUNO
- `Proteína Desayuno`
- `Carb Desayuno`
- `Fruta`
- `Compuesto Desayuno`

### ALMUERZO
- `Proteína Almuerzo`
- `Carb Almuerzo`
- `Verdura`
- `Compuesto Almuerzo`
- `Completo Almuerzo`

### ONCES
- `Carb Onces`
- `Bebida`
- `Fruta`
- `Compuesto Onces`

---

## Patrones de Comida

### 🌅 DESAYUNO

#### Patrón 1: Tradicional con Fruta
```
Requiere:
- 1x Proteína Desayuno
- 1x Carb Desayuno
- 1x Fruta

Ejemplo:
- Huevos revueltos (Proteína Desayuno)
- Arepa (Carb Desayuno)
- Papaya (Fruta)

Nota: La fruta siempre se incluye en el plan, pero la familia
decide sobre la marcha si la sirve o no.
```

#### Patrón 2: Compuesto
```
Requiere:
- 1x Compuesto Desayuno

Ejemplo:
- Calentado (Compuesto Desayuno)
- Huevos con arepa (Compuesto Desayuno)
```

---

### 🍽️ ALMUERZO

#### Patrón 1: Tradicional
```
Requiere:
- 1x Proteína Almuerzo
- 1x Carb Almuerzo
- 1x Verdura

Ejemplo:
- Carne en bistek (Proteína Almuerzo)
- Arroz blanco (Carb Almuerzo)
- Ensalada griega (Verdura)
```

#### Patrón 2: Compuesto + Verdura
```
Requiere:
- 1x Compuesto Almuerzo
- 1x Verdura

Ejemplo:
- Pasta a la boloñesa (Compuesto Almuerzo)
- Ensalada de repollo (Verdura)
```

#### Patrón 3: Completo
```
Requiere:
- 1x Completo Almuerzo

Ejemplo:
- Ensalada de conchitas con atún (Completo Almuerzo)
- Bandeja paisa (Completo Almuerzo)
```

---

### ☕ ONCES

#### Patrón 1: Tradicional
```
Requiere:
- 1x Carb Onces
- 1x Bebida
- 1x Fruta

Ejemplo:
- Granola (Carb Onces)
- Yogur (Bebida)
- Mandarina (Fruta)
```

#### Patrón 2: Compuesto + Fruta
```
Requiere:
- 1x Compuesto Onces
- 1x Fruta

Ejemplo:
- Hummus con pan (Compuesto Onces)
- Manzana (Fruta)
```

---

## Lógica del Motor de Planificación

### Regla Principal: Patrones Disponibles

**El motor SOLO puede usar un patrón si existen ingredientes de TODOS los tipos requeridos.**

#### Ejemplo 1: Desayuno sin ingredientes compuestos
```
Ingredientes en BD:
- Huevos (Proteína Desayuno) ✅
- Arepa (Carb Desayuno) ✅
- Banano (Fruta) ✅
- (No hay "Compuesto Desayuno") ❌

Patrones disponibles:
✅ Patrón 1: Tradicional con Fruta
❌ Patrón 2: Compuesto (no disponible - falta tipo)

Resultado: El motor SOLO generará desayunos con Patrón 1
```

#### Ejemplo 2: Almuerzo sin completos
```
Ingredientes en BD:
- Pollo (Proteína Almuerzo) ✅
- Arroz (Carb Almuerzo) ✅
- Ensalada (Verdura) ✅
- Pasta boloñesa (Compuesto Almuerzo) ✅
- (No hay "Completo Almuerzo") ❌

Patrones disponibles:
✅ Patrón 1: Tradicional
✅ Patrón 2: Compuesto + Verdura
❌ Patrón 3: Completo (no disponible - falta tipo)

Resultado: El motor alterna entre Patrón 1 y Patrón 2
```

#### Ejemplo 3: Todos los patrones disponibles
```
Ingredientes en BD:
- Todos los tipos necesarios existen ✅

Patrones disponibles:
✅ Patrón 1: Tradicional con Fruta
✅ Patrón 2: Compuesto

Resultado: El motor alterna según configuración de distribución
```

### Algoritmo de Validación

**Implementado en:** [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts)

```typescript
/**
 * Get all available patterns for a specific meal type
 */
export function getAvailablePatterns(
  mealType: string,
  allPatterns: MealPattern[],
  ingredientsByType: Record<string, number>
): PatternAvailability[] {
  const patternsForMealType = allPatterns.filter(p => p.meal_type === mealType)

  return patternsForMealType
    .map(pattern => checkPatternAvailability(pattern, ingredientsByType))
    .sort((a, b) => a.pattern.display_order - b.pattern.display_order)
}

/**
 * Check if a pattern is available based on existing ingredients
 */
export function checkPatternAvailability(
  pattern: MealPattern,
  ingredientsByType: Record<string, number>
): PatternAvailability {
  const missingTypes: string[] = []

  for (const component of pattern.required_components) {
    const count = ingredientsByType[component.type] || 0
    if (count === 0) {
      missingTypes.push(component.type)
    }
  }

  return {
    pattern,
    available: missingTypes.length === 0,
    missingTypes,
    availableCount: ingredientsByType
  }
}
```

**Nota:** El código real incluye validación completa con conteo de ingredientes disponibles y lista de tipos faltantes.

### Configuración de Distribución

El usuario puede configurar qué porcentaje de cada patrón usar (solo de los disponibles):

```
Ejemplo - Almuerzo con 3 patrones disponibles:
- Patrón 1 (Tradicional): 60%
- Patrón 2 (Compuesto + Verdura): 30%
- Patrón 3 (Completo): 10%

Si generamos plan de 7 días:
- 4 días con Patrón 1
- 2 días con Patrón 2
- 1 día con Patrón 3
```

Si un patrón no está disponible, se redistribuye automáticamente:

```
Ejemplo - Almuerzo sin Completo:
Configuración original:
- Patrón 1: 60%
- Patrón 2: 30%
- Patrón 3: 10% ❌ (no disponible)

Redistribución automática (proporcional):
- Patrón 1: 67% (60/90 * 100)
- Patrón 2: 33% (30/90 * 100)
```

---

## Ventajas de Este Sistema

1. **Flexible**: Puedes empezar simple (solo Patrón 1) y agregar complejidad gradualmente
2. **Auto-adaptativo**: El motor se ajusta automáticamente a los ingredientes disponibles
3. **Sin errores**: Nunca intentará generar un plan con ingredientes que no existen
4. **Escalable**: Fácil agregar nuevos patrones en el futuro

---

## Flujo de Trabajo del Usuario

### 1. Setup Inicial (Mínimo Viable)
```
Para empezar a usar la app, crear al menos:

DESAYUNO:
- 3+ Proteína Desayuno
- 3+ Carb Desayuno
- 3+ Fruta

ALMUERZO:
- 3+ Proteína Almuerzo
- 3+ Carb Almuerzo
- 3+ Verdura

ONCES:
- 3+ Carb Onces
- 3+ Bebida
- 3+ Fruta

Con esto, el motor ya puede generar planes semanales completos.
```

### 2. Expansión Gradual
```
Cuando quieras más variedad:

1. Agregar "Compuesto Desayuno"
   → Desbloquea Patrón 2 de Desayuno

2. Agregar "Compuesto Almuerzo"
   → Desbloquea Patrón 2 de Almuerzo

3. Agregar "Completo Almuerzo"
   → Desbloquea Patrón 3 de Almuerzo

4. Agregar "Compuesto Onces" y "Completo Onces"
   → Desbloquea Patrones 2 y 3 de Onces
```

### 3. Ajuste de Distribución
```
Si tienes todos los patrones disponibles:

Configurar preferencias:
- "Quiero 70% tradicional, 20% compuesto, 10% completo"
- El motor respeta estas proporciones al generar planes
```

---

## Estado Actual de la Base de Datos

Después de ejecutar `update-ingredient-types.sql`:

```
Tipos existentes:
✅ Proteína Almuerzo (actualizado con tilde)
✅ Carb Almuerzo (convertido desde "Carb")
✅ Carb Onces (sin cambios)
✅ Fruta (sin cambios)
✅ Verdura (sin cambios)
✅ Bebida (sin cambios)

Tipos pendientes de crear:
❌ Proteína Desayuno
❌ Carb Desayuno
❌ Compuesto Desayuno
❌ Compuesto Almuerzo
❌ Completo Almuerzo
❌ Compuesto Onces
❌ Completo Onces
```

---

## Estado de Implementación

**Última actualización:** 2026-01-17

### ✅ Completado

1. ✅ Scripts SQL ejecutados en Supabase
   - `001_update_ingredient_types.sql` - Tipos actualizados
   - `002_create_meal_patterns.sql` - 7 patrones creados en BD
   - `003_create_weekly_plans.sql` - Tablas de planes creadas

2. ✅ Motor de planificación implementado
   - [src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts) - Motor completo (484 líneas)
   - [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts) - Sistema de validación (280 líneas)
   - Algoritmo de Zeller para fechas sin timezone
   - Randomización inteligente con pool de 3x
   - Maximización de variedad

3. ✅ Página de planificación semanal
   - [src/app/planes/page.tsx](../src/app/planes/page.tsx)
   - Generación automática de planes (5 o 7 días)
   - Visualización de patrones disponibles
   - Edición individual de comidas
   - Guardar/recuperar planes en BD
   - Confirmación antes de regenerar

4. ✅ Distribuciones de patrones
   - Hardcodeadas en `DEFAULT_PATTERN_DISTRIBUTIONS`
   - Tabla `pattern_distributions` creada (para configuración futura desde UI)
   - Normalización automática cuando patrones no disponibles

### ⏳ Pendiente

1. **Crear ingredientes faltantes** para habilitar todos los patrones
   - Ver [BACKLOG.md](BACKLOG.md) - Prioridad CRÍTICA #2
   - Tipos pendientes: Proteína/Carb/Compuesto Desayuno, Compuesto/Completo Almuerzo, Compuesto Onces

2. **UI para configurar distribuciones de patrones**
   - Actualmente usa porcentajes hardcodeados
   - Tabla `pattern_distributions` lista pero no se usa desde UI

3. **Nuevas reglas inteligentes**
   - Sistema de reglas temporales ("no repetir X por Y días")
   - Ver [BACKLOG.md](BACKLOG.md) - Prioridad ALTA #3

---

## 📚 Referencias

- **Código:** [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts) - Implementación real de patrones
- **Código:** [src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts) - Motor de planificación
- **SQL:** [supabase/migrations/002_create_meal_patterns.sql](../supabase/migrations/002_create_meal_patterns.sql) - Patrones en BD
- **Doc:** [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) - Resumen técnico completo
- **Doc:** [BACKLOG.md](BACKLOG.md) - Tareas pendientes

**Este documento está verificado contra el código real** ✅
