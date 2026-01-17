# Schema V3 - Arquitectura de 3 Niveles

## Visión General

Esta nueva arquitectura separa claramente los tres niveles de abstracción:

```
Ingredientes (atómicos)
    ↓
Platos (combinaciones con patrón)
    ↓
Menús (combinación de platos)
```

## 1. Nivel Base - Ingredientes (sin cambios)

```sql
-- Tabla existente: food_ingredients
CREATE TABLE food_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'Proteína', 'Carb', 'Ensalada', etc.
  description TEXT,
  tags TEXT[],
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Ejemplos**: Papa, Carne asada, Lechuga, Pollo

## 2. Nivel Intermedio - Platos (NUEVO)

```sql
CREATE TABLE food_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dish_pattern TEXT NOT NULL CHECK (dish_pattern IN ('simple', 'compound', 'complete')),
  ingredient_ids UUID[] NOT NULL,
  description TEXT,
  tags TEXT[],
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key constraint
  CONSTRAINT fk_dishes_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Índice para búsqueda rápida por usuario
CREATE INDEX idx_dishes_user ON food_dishes(user_id);
CREATE INDEX idx_dishes_pattern ON food_dishes(dish_pattern);
```

### Patrones de Platos

#### **simple** - Ingrediente Individual
- Un solo ingrediente servido como plato
- Ejemplo: "Papa salada" = [Papa]
- Ejemplo: "Carne asada" = [Carne]
- Ejemplo: "Ensalada verde" = [Lechuga, Tomate, Cebolla]

#### **compound** - Plato Compuesto
- Múltiples ingredientes que forman un plato único
- Ya incluye proteína + carb (o variaciones)
- Ejemplo: "Arroz con pollo" = [Arroz, Pollo, Zanahoria]
- Ejemplo: "Pasta con carne" = [Pasta, Carne molida, Salsa]

#### **complete** - Plato Completo
- Un plato que por sí solo es un menú completo
- No necesita acompañamientos
- Ejemplo: "Ensalada de conchitas con atún" = [Pasta, Atún, Lechuga, Tomate]
- Ejemplo: "Bowl de quinoa con pollo" = [Quinoa, Pollo, Aguacate, Tomate]

## 3. Nivel Superior - Menús (renombrar meal_combinations)

```sql
-- Renombrar tabla existente
ALTER TABLE meal_combinations RENAME TO meal_menus;

-- Modificar estructura
ALTER TABLE meal_menus
  DROP COLUMN ingredient_ids,
  ADD COLUMN dish_ids UUID[] NOT NULL,
  ADD COLUMN meal_template TEXT NOT NULL DEFAULT 'flexible'
    CHECK (meal_template IN ('protein-carb-salad', 'main-salad', 'complete', 'flexible'));

-- La tabla resultante:
CREATE TABLE meal_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,  -- Opcional, puede ser auto-generado
  meal_type TEXT NOT NULL,  -- 'Desayuno', 'Almuerzo', 'Onces'
  dish_ids UUID[] NOT NULL,
  meal_template TEXT NOT NULL DEFAULT 'flexible',
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_menus_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_menus_user ON meal_menus(user_id);
CREATE INDEX idx_menus_type ON meal_menus(meal_type);
CREATE INDEX idx_menus_template ON meal_menus(meal_template);
```

### Templates de Menús

#### **protein-carb-salad** - Componentes Separados
- 3 platos simples: proteína + carb + ensalada
- Ejemplo: [Carne asada, Papa salada, Ensalada verde]

#### **main-salad** - Principal + Acompañamiento
- 1 plato compound + 1 plato simple (ensalada)
- Ejemplo: [Arroz con pollo, Ensalada de tomate]

#### **complete** - Plato Único
- 1 solo plato complete
- Ejemplo: [Ensalada de conchitas con atún]

#### **flexible** - Sin Restricción
- Cualquier combinación de platos
- Para casos que no siguen un patrón específico

## Ejemplos Completos

### Ejemplo 1: Almuerzo Tradicional (protein-carb-salad)

**Ingredientes:**
- Papa (tipo: Carb)
- Carne (tipo: Proteína)
- Lechuga (tipo: Ensalada)
- Tomate (tipo: Ensalada)

**Platos:**
- "Papa salada" (simple) = [Papa]
- "Carne asada" (simple) = [Carne]
- "Ensalada mixta" (simple) = [Lechuga, Tomate]

**Menú:**
- Nombre: "Carne asada + Papa salada + Ensalada mixta"
- Template: protein-carb-salad
- Platos: [Papa salada, Carne asada, Ensalada mixta]

### Ejemplo 2: Almuerzo Compuesto (main-salad)

**Ingredientes:**
- Arroz (tipo: Carb)
- Pollo (tipo: Proteína)
- Lechuga (tipo: Ensalada)

**Platos:**
- "Arroz con pollo" (compound) = [Arroz, Pollo]
- "Ensalada verde" (simple) = [Lechuga]

**Menú:**
- Nombre: "Arroz con pollo + Ensalada verde"
- Template: main-salad
- Platos: [Arroz con pollo, Ensalada verde]

### Ejemplo 3: Almuerzo Completo (complete)

**Ingredientes:**
- Pasta conchitas (tipo: Carb)
- Atún (tipo: Proteína)
- Lechuga (tipo: Ensalada)
- Tomate (tipo: Ensalada)

**Platos:**
- "Ensalada de conchitas con atún" (complete) = [Pasta, Atún, Lechuga, Tomate]

**Menú:**
- Nombre: "Ensalada de conchitas con atún"
- Template: complete
- Platos: [Ensalada de conchitas con atún]

## Estrategia de Migración

### Fase 1: Crear Nueva Tabla
```sql
-- Crear food_dishes
CREATE TABLE food_dishes (...);
```

### Fase 2: Migrar Datos Existentes

**Opción A - Automática (para empezar):**
```sql
-- Convertir todas las combinaciones actuales en platos "compound"
-- y luego crear menús que usen esos platos
INSERT INTO food_dishes (name, dish_pattern, ingredient_ids, user_id)
SELECT
  name,
  'compound' as dish_pattern,
  ingredient_ids,
  user_id
FROM meal_combinations;
```

**Opción B - Manual (recomendada):**
1. Exportar combinaciones actuales
2. Revisar manualmente cada una
3. Decidir si es simple, compound o complete
4. Crear platos correspondientes
5. Crear menús que usen esos platos

### Fase 3: Renombrar y Actualizar meal_combinations
```sql
-- Backup de seguridad
CREATE TABLE meal_combinations_backup AS SELECT * FROM meal_combinations;

-- Renombrar
ALTER TABLE meal_combinations RENAME TO meal_menus;

-- Modificar estructura (después de migrar datos)
ALTER TABLE meal_menus
  DROP COLUMN ingredient_ids,
  ADD COLUMN dish_ids UUID[],
  ADD COLUMN meal_template TEXT DEFAULT 'flexible';
```

## Ventajas de Esta Arquitectura

1. **Claridad Conceptual**: Cada nivel tiene un propósito claro
2. **Flexibilidad**: Soporta todos los patrones de comida
3. **Reutilización**: Los platos se pueden reutilizar en múltiples menús
4. **Escalabilidad**: Fácil agregar nuevos patrones en el futuro
5. **Validación**: Se puede validar que los templates tengan los platos correctos

## Validaciones Recomendadas

### A nivel de Platos:
- `simple`: Puede tener 1 o más ingredientes del mismo tipo general
- `compound`: Debe tener al menos 2 ingredientes de tipos diferentes
- `complete`: Debe tener ingredientes de al menos 2-3 tipos diferentes

### A nivel de Menús:
- `protein-carb-salad`: Debe tener exactamente 3 platos simples (o validación flexible)
- `main-salad`: Debe tener 1 compound + 1 simple (ensalada)
- `complete`: Debe tener exactamente 1 plato complete
- `flexible`: Sin restricciones

## Próximos Pasos

1. ✅ Documentar schema (este archivo)
2. ⏳ Crear script SQL de migración
3. ⏳ Actualizar tipos TypeScript
4. ⏳ Implementar página de Platos
5. ⏳ Migrar datos existentes
6. ⏳ Actualizar página de Menús
7. ⏳ Implementar motor de planificación semanal
