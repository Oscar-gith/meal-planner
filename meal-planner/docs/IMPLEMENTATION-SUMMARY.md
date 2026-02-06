# Resumen de Implementación - Sistema de Planificación de Comidas

## Estado del Proyecto

**Fecha**: 2026-02-06 (última actualización)
**Fase Actual**: Sistema completo con autenticación real, sistema de familia, testing framework, UX mobile mejorado, y bug LLM resuelto ✅
**Cambios recientes (UX Mobile + Fix LLM - 2026-02-06)**:
- ✅ Mejoras UX Mobile: Tipografía, menú hamburguesa, drag & drop
- ✅ Bug crítico LLM sin familia **RESUELTO**
- ✅ Nuevo componente: `MobileSidebar.tsx`
- ✅ Drag & drop nativo HTML5 para intercambio de comidas
- ✅ Regeneración con patrón random
- ✅ Sistema funciona con o sin familia

---

## Arquitectura Final Implementada

Se implementó **arquitectura de 2 niveles con sistema de patrones**:

### Niveles de Abstracción:
1. **Ingredientes** - Items individuales categorizados por tipo específico (ej: "Proteína Almuerzo", "Carb Desayuno")
2. **Patrones de Comida** - Plantillas que definen qué tipos de ingredientes combinar
3. **Planes Semanales** - Generados automáticamente por el motor combinando ingredientes según patrones

### ✅ Implementado:
- 7 patrones del sistema almacenados en base de datos (`meal_patterns` table)
- Motor de planificación inteligente ([src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts))
- Sistema de validación de disponibilidad ([src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts))
- Distribución automática de patrones con normalización
- Maximización de variedad evitando repetir ingredientes
- Algoritmo de Zeller para cálculo de días sin timezone

### ❌ NO implementado (decisión consciente):
- Nivel intermedio de "Platos" (food_dishes)
- Arquitectura de 3 niveles (Ingredientes → Platos → Menús)
- Sistema de combinaciones/menús (eliminado en sesión 2026-01-17)

---

## Base de Datos

### Tablas Creadas:

#### 1. `food_ingredients` (existente, actualizada)
```sql
Campos principales:
- id, name, type, description, tags, user_id

Tipos actualizados:
- "Carb" → "Carb Almuerzo"
- "Proteina Almuerzo" → "Proteína Almuerzo"
- Sin cambios: Fruta, Verdura, Bebida, Carb Onces
```

#### 2. `meal_patterns` (nueva)
```sql
Campos:
- id, meal_type, name, description
- required_components (JSONB)
- is_system, display_order, user_id

7 patrones del sistema:
- Desayuno: 2 patrones
- Almuerzo: 3 patrones
- Onces: 2 patrones
```

#### 3. `weekly_plans` (nueva)
```sql
Campos:
- id, name, start_date, end_date
- plan_data (JSONB) - Plan completo
- user_id, created_at, updated_at
```

#### 4. `pattern_distributions` (nueva)
```sql
Campos:
- id, user_id, meal_type, pattern_id
- percentage - % de uso del patrón
```

#### 5. `families` (nueva) ✅ NUEVO (2026-01-19)
```sql
Campos:
- id, name, invite_code (8 chars, único)
- created_by (usuario admin), created_at, updated_at
```

#### 6. `family_members` (nueva) ✅ NUEVO (2026-01-19)
```sql
Campos:
- id, family_id, user_id, role ('admin' | 'member')
- joined_at

Constraints:
- unique_user_one_family: Un usuario solo puede estar en una familia
- Máximo 6 miembros por familia
```

#### 7. `user_profiles` (nueva) ✅ NUEVO (2026-01-19)
```sql
Campos:
- user_id (PK), email, created_at, updated_at

Propósito: Cache de emails para evitar acceso directo a auth.users
```

#### ~~5. `plan_collaborators`~~ ❌ DEPRECADO (reemplazado por sistema de familia)

### Scripts SQL Ejecutados:
1. ✅ `001_update_ingredient_types.sql` - Actualización de tipos de ingredientes
2. ✅ `002_create_meal_patterns.sql` - Tabla de patrones + 7 patrones del sistema
3. ✅ `003_create_weekly_plans.sql` - Tablas de planes y distribuciones
4. ✅ `004_remove_completo_onces_pattern.sql` - Limpieza de patrones obsoletos
5. ~~❌ `005_create_dev_user.sql`~~ - ELIMINADO (deuda técnica resuelta)
6. ~~✅ `006_create_plan_collaborators.sql`~~ - DEPRECADO (reemplazado por familia)
7. ✅ `007_create_user_search_function.sql` - Búsqueda segura de usuarios
8. ❌ `008-010` - Intentos fallidos de fix RLS (obsoletos)
11. ✅ `011_family_system.sql` - **Sistema de Familia completo** ✅ NUEVO
12. ✅ `012_fix_orphan_data.sql` - Fix datos huérfanos
13. ✅ `013_fix_rls_recursion.sql` - Función helper `get_current_user_family_id`
14. ✅ `014_fix_get_family_members.sql` - Fix función get_family_members
15. ✅ `015_fix_get_family_members_v2.sql` - Tabla `user_profiles` para emails
16. ✅ `016_diagnose_weekly_plans_rls.sql` - Diagnóstico RLS (RAISE NOTICE)
17. ✅ `017_fix_weekly_plans_security.sql` - Fix inicial weekly_plans
18. ✅ `018_fix_families_rls.sql` - Fix políticas families
19. ✅ `019_comprehensive_rls_fix.sql` - Fix consolidado RLS
20. ✅ `020_verify_and_fix_rls.sql` - **Fix definitivo seguridad RLS** ✅ **APLICADO** (2026-01-23)
21. ✅ `021_create_rules_table.sql` - Tabla de reglas con AI validation ✅ NUEVO (2026-01-24)
22. ✅ `022_add_family_id_to_rules.sql` - Family sharing para reglas ✅ NUEVO (2026-01-24)
23. ✅ `023_create_agent_logs.sql` - Logs de agente LangGraph para debugging ✅ NUEVO (2026-01-24)
24. ✅ `024_enable_rls_family_members.sql` - **Fix crítico seguridad family_members** ✅ **APLICADO** (2026-01-30)
25. ✅ `025_cleanup_legacy_tables.sql` - Eliminación de 7 tablas legacy/no usadas ✅ **APLICADO** (2026-01-30)

**Scripts de diagnóstico creados:**
- `scripts/diagnose-rls.mjs` - Diagnóstico sin autenticación
- `scripts/diagnose-data-consistency.mjs` - Verificar consistencia de datos
- `scripts/diagnose-authenticated.mjs` - Con usuario autenticado
- `scripts/diagnose-admin.mjs` - Con service role key (bypasea RLS)
- `scripts/test-rls-security.mjs` - Test completo de seguridad RLS

**Ubicación:** [supabase/migrations/](../supabase/migrations/)

---

## Tipos de Ingredientes Definidos

### DESAYUNO
- `Proteína Desayuno` ✅ (creados por usuario)
- `Carb Desayuno` ✅ (creados por usuario)
- `Fruta` ✅ (existen)
- `Compuesto Desayuno` ✅ (creados por usuario)

### ALMUERZO
- `Proteína Almuerzo` ✅ (existen)
- `Carb Almuerzo` ✅ (existen, convertidos desde "Carb")
- `Verdura` ✅ (existen)
- `Compuesto Almuerzo` ✅ (creados por usuario)
- `Completo Almuerzo` ✅ (creados por usuario)

### ONCES
- `Carb Onces` ✅ (existen)
- `Bebida` ✅ (existen)
- `Fruta` ✅ (existen)
- `Compuesto Onces` ✅ (creados por usuario)

---

## Patrones de Comida

### 🌅 DESAYUNO

**Patrón 1: Tradicional con Fruta** (70% default)
- 1x Proteína Desayuno
- 1x Carb Desayuno
- 1x Fruta

**Patrón 2: Compuesto** (30% default)
- 1x Compuesto Desayuno

### 🍽️ ALMUERZO

**Patrón 1: Tradicional** (60% default)
- 1x Proteína Almuerzo
- 1x Carb Almuerzo
- 1x Verdura

**Patrón 2: Compuesto + Verdura** (30% default)
- 1x Compuesto Almuerzo
- 1x Verdura

**Patrón 3: Completo** (10% default)
- 1x Completo Almuerzo

### ☕ ONCES

**Patrón 1: Tradicional** (60% default)
- 1x Carb Onces
- 1x Bebida
- 1x Fruta

**Patrón 2: Compuesto + Fruta** (40% default)
- 1x Compuesto Onces
- 1x Fruta

---

## Código Implementado

### 1. Sistema de Patrones
📁 [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts) - 280 líneas

**Constantes del sistema:**
- `SYSTEM_MEAL_PATTERNS` - Definición de los 7 patrones predefinidos
- `DEFAULT_PATTERN_DISTRIBUTIONS` - Porcentajes default (Desayuno 70/30, Almuerzo 60/30/10, Onces 60/40)

**Funciones de validación:**
- `checkPatternAvailability()` - Verifica si un patrón tiene todos los tipos de ingredientes necesarios
- `getAvailablePatterns()` - Filtra patrones disponibles para un tipo de comida
- `countIngredientsByType()` - Cuenta ingredientes agrupados por tipo

**Funciones de distribución:**
- `calculatePatternOccurrences()` - Calcula cuántas veces usar cada patrón según porcentajes
- `normalizeDistribution()` - Redistribuye porcentajes cuando algunos patrones no están disponibles

### 2. Motor de Planificación
📁 [src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts) - 484 líneas

**Clase principal:** `WeeklyPlanningEngine`

**Características clave:**
- Genera planes semanales completos (5 o 7 días configurables)
- Selecciona patrones según distribución configurada
- **Maximiza variedad** usando tracking de uso de ingredientes
- **Randomización inteligente**: Pool de 3x los candidatos menos usados, luego shuffle
- Solo usa patrones con ingredientes disponibles
- Genera warnings detallados y estadísticas completas
- **Usa algoritmo de Zeller** para calcular días sin depender de timezone
- Formateo de fechas sin UTC (YYYY-MM-DD en timezone local)

**Métodos principales:**
- `generatePlan()` - Orquesta generación completa del plan
- `generateDayPlan()` - Genera las 3 comidas de un día
- `generateMeal()` - Genera una comida usando patrones disponibles
- `generateMealFromPattern()` - Selecciona ingredientes para un patrón específico
- `selectPatternByDistribution()` - Elige patrón basándose en déficit vs target
- `selectIngredientsWithLeastUsage()` - Prioriza ingredientes menos usados
- `selectRandomSubset()` - Añade randomización a la selección
- `getDayName()` - Implementa algoritmo de Zeller (sin timezone)
- `formatDate()` - Formato YYYY-MM-DD en timezone local

**Helpers públicos:**
- `createDefaultConfig()` - Crea configuración con distribuciones default
- `validatePlanningPrerequisites()` - Valida que se puede generar un plan

---

## Infraestructura de Testing

### ✅ Framework de Testing Completo (2026-01-18)

**Tecnologías Implementadas:**
- **Vitest 2.1.0** - Framework de testing unitario y de componentes
- **Playwright 1.51.1** - Framework de testing E2E
- **React Testing Library 16.1.0** - Utilities para testing de componentes React
- **dotenv-cli 11.0.0** - Gestión de variables de entorno para testing
- **jsdom** - Simulación de DOM para component tests

**Entorno de Testing:**
- Proyecto Supabase separado para testing (no contamina producción)
- Variables de entorno en `tests/.env.test`
- Script `dev:test` que carga ambiente de testing
- 2 usuarios de test programáticos con contraseñas consistentes

### Archivos de Configuración

📁 [playwright.config.ts](../playwright.config.ts)
- Configuración de Playwright para E2E tests
- Usa `dev:test` script para cargar variables de test
- Ejecución secuencial (workers: 1) para multi-user tests
- Screenshots y videos en caso de fallo

📁 [vitest.config.ts](../vitest.config.ts)
- Configuración de Vitest para component tests
- CSS deshabilitado (fix para PostCSS/Tailwind v4)
- Aliases para lodash ESM compatibility
- Setup file: `tests/setup.ts`

📁 [tests/setup.ts](../tests/setup.ts)
- Custom matchers: `toBeInTheDocument`, `toBeDisabled`
- Reemplazo de @testing-library/jest-dom (evita ESM issues)
- Mock de Next.js router
- Auto-cleanup después de cada test

📁 [tests/vitest.d.ts](../tests/vitest.d.ts)
- Definiciones de tipos para custom matchers

### Tests Implementados

#### Component Tests ✅ 14/14 PASSING
📁 [tests/component/LoginPage.test.tsx](../tests/component/LoginPage.test.tsx)
- Render inicial con todos los elementos del form
- Login exitoso
- Login con errores
- Estados de loading
- Toggle entre login/signup
- Google OAuth button
- Validación de formulario

#### E2E Authentication Tests ✅ 11/11 PASSING
📁 [tests/e2e/auth/login.spec.ts](../tests/e2e/auth/login.spec.ts)
- Display de página de login
- Login exitoso con redirección
- Login fallido con credenciales inválidas
- Validación de formulario
- Logout con limpieza de sesión
- Persistencia de sesión (refresh page)
- Redirección a login en rutas protegidas
- Login secuencial de múltiples usuarios

#### E2E Data Isolation Test ❌ BLOCKED
📁 [tests/e2e/auth/data-isolation.spec.ts](../tests/e2e/auth/data-isolation.spec.ts)
- Test para validar RLS policies
- **BLOQUEADO** por bug crítico de infinite recursion en RLS
- Ver sección "Deuda Técnica Crítica" abajo

### Utilities de Testing

📁 [tests/utils/supabase-mock.ts](../tests/utils/supabase-mock.ts)
- Mock client de Supabase para component tests
- Simula respuestas de auth y database

📁 [tests/scripts/create-test-users.ts](../tests/scripts/create-test-users.ts)
- Script para crear usuarios de test programáticamente
- Usa SUPABASE_SERVICE_ROLE_KEY
- Asegura contraseñas consistentes con `.env.test`

### Comandos de Testing

```bash
npm run test                 # Vitest component tests
npm run test:e2e            # Playwright E2E tests
npm run dev:test            # Next.js dev server con ambiente de test
```

### Cobertura de Testing

**Phase 1: Setup** ✅ COMPLETADO
- Framework installation y configuración
- Ambiente de testing separado
- Utilities y helpers

**Phase 2: Authentication** ⚠️ PARCIALMENTE COMPLETADO
- ✅ Component tests (14/14 passing)
- ✅ E2E auth tests (11/11 passing)
- ❌ Data isolation test (blocked por RLS bug)

**Phase 3: Collaboration** ⏳ PENDIENTE
- Bloqueado hasta resolver RLS bug
- Tests de colaboración multi-usuario
- Validación de permisos

---

## Lógica Clave del Sistema

### Regla Fundamental
**Si no existen ingredientes de un tipo requerido, el patrón NO está disponible y NO se usa.**

### Ejemplo:
```
Base de datos tiene:
✅ Proteína Almuerzo (5 ingredientes)
✅ Carb Almuerzo (8 ingredientes)
✅ Verdura (6 ingredientes)
❌ Compuesto Almuerzo (0 ingredientes)
❌ Completo Almuerzo (0 ingredientes)

Resultado:
✅ Patrón 1 (Tradicional) → DISPONIBLE
❌ Patrón 2 (Compuesto + Verdura) → NO DISPONIBLE (falta Compuesto)
❌ Patrón 3 (Completo) → NO DISPONIBLE (falta Completo)

Motor de planificación:
→ Solo usará Patrón 1 para todos los almuerzos
```

### Distribución Automática
Si usuario configura: 60% Patrón 1, 30% Patrón 2, 10% Patrón 3
Pero solo Patrón 1 está disponible:
→ Motor ajusta automáticamente a 100% Patrón 1

---

## Características Implementadas en la Página de Planes

### ✅ Página `/planes` - Planificación Semanal
📁 [src/app/planes/page.tsx](../src/app/planes/page.tsx)

**1. Estado del Sistema**
- Muestra cantidad de ingredientes, patrones y planes guardados
- Validación de prerequisites antes de generar
- Warnings claros sobre qué falta

**2. Visualización de Patrones Disponibles**
- Los 7 patrones organizados por tipo de comida (Desayuno, Almuerzo, Onces)
- Indica claramente cuáles están disponibles (✅) y cuáles no (❌)
- Muestra qué tipos de ingredientes faltan para cada patrón

**3. Configuración del Plan**
- Selector de fecha de inicio
- Duración: 5 o 7 días
- Repeticiones máximas por semana (1, 2, 3 o sin límite)

**4. Generación Automática**
- Botón "Generar Plan Semanal"
- Loading state durante generación
- Manejo de errores con mensajes descriptivos

**5. Visualización del Plan Generado**
- Nombre automático (ej: "Semana del 20 de Enero 2026")
- Lista de advertencias si algo falta
- Estadísticas: total comidas, ingredientes únicos, patrones usados
- Vista por día con las 3 comidas
- Cada comida muestra: patrón usado + ingredientes seleccionados
- Código de colores: amarillo (Desayuno), verde (Almuerzo), azul (Onces)

**6. Edición de Comidas** ⚡ NUEVO
- Click en cualquier comida abre editor inline
- Selección/deselección de ingredientes por checkboxes
- Filtra solo ingredientes de tipos compatibles
- Botones Guardar/Cancelar

**7. Guardar y Recuperar Planes**
- Botón "Guardar Plan" → almacena en `weekly_plans` table
- Confirmación de guardado exitoso
- Lista de planes anteriores con nombre, fechas y fecha de creación
- Vista vacía con mensaje instructivo cuando no hay planes

**8. Confirmación de Regeneración**
- Dialog de confirmación antes de sobrescribir plan actual
- Evita pérdida accidental de trabajo

**9. Gestión de Colaboradores** ✅ NUEVO
- Botón "👥 Colaborar" en cada plan guardado
- Modal para gestionar colaboradores
- Buscar usuarios por email
- Agregar colaboradores (solo owners)
- Eliminar colaboradores (solo owners)
- Indicadores visuales de rol (owner/collaborator)
- Permisos diferenciados por rol

### Características Técnicas

- Usa `WeeklyPlanningEngine` para generación
- Lee patrones desde `meal_patterns` table en Supabase
- Lee ingredientes desde `food_ingredients` table
- Guarda planes en `weekly_plans` table (JSONB)
- Validación completa de disponibilidad de patrones
- Manejo de errores robusto
- Componentes: Toast, ConfirmDialog, CollaboratorsManager
- Responsive design (mobile-friendly)
- **Autenticación real con Supabase Auth** ✅ NUEVO
- **Sistema de colaboración multi-usuario** ✅ NUEVO

---

## Archivos del Proyecto

### Documentación Activa
- [README.md](./README.md) - Punto de entrada, índice de documentación ⭐
- [BACKLOG.md](./BACKLOG.md) - Tareas pendientes organizadas por prioridad
- [MEAL-PATTERNS-FINAL.md](./MEAL-PATTERNS-FINAL.md) - Definición completa de patrones
- [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Este archivo
- [SETUP-AUTH.md](./SETUP-AUTH.md) - Guía de configuración de autenticación ✅ NUEVO

### Documentación Obsoleta
Ver: [obsolete/](./obsolete/)
- `SCHEMA-V3.md` - Diseño de 3 niveles (NO implementado)
- `MIGRATION-STATUS.md` - Estado migración V3 (NO realizada)
- `migration-v3.sql` - Script migración V3 (NO usado)
- `PROGRESO-SESION.md`, `PASOS-FINALES.md`, etc.

### Scripts SQL (Ejecutados)
📁 [supabase/migrations/](../supabase/migrations/)
- `001_update_ingredient_types.sql` - Actualización de tipos
- `002_create_meal_patterns.sql` - Tabla + 7 patrones del sistema
- `003_create_weekly_plans.sql` - Tablas weekly_plans y pattern_distributions
- `004_remove_completo_onces_pattern.sql` - Limpieza
- ~~`005_create_dev_user.sql`~~ - ELIMINADO (deuda técnica resuelta)
- `006_create_plan_collaborators.sql` - Sistema de colaboración ✅ NUEVO
- `007_create_user_search_function.sql` - Búsqueda de usuarios ✅ NUEVO

### Código Core
- [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts) - Sistema de patrones (280 líneas)
- [src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts) - Motor de planificación (484 líneas)
- [src/middleware.ts](../src/middleware.ts) - Protección de rutas ✅ NUEVO

### Sistema de Familia ✅ NUEVO (2026-01-19)
📁 [src/types/family.ts](../src/types/family.ts) - Tipos TypeScript
📁 [src/lib/hooks/useFamily.ts](../src/lib/hooks/useFamily.ts) - Hook React
📁 [src/components/FamilyManager.tsx](../src/components/FamilyManager.tsx) - Componente UI
📁 [src/app/familia/page.tsx](../src/app/familia/page.tsx) - Página /familia

**Funcionalidades:**
- Crear familia (hasta 6 miembros)
- Unirse con código de invitación (8 caracteres)
- Roles: admin (gestiona miembros) y member
- Ingredientes y planes compartidos automáticamente
- Salir de familia (datos se desasocian)

**Funciones RPC (SECURITY DEFINER):**
- `create_family(name)` - Crea familia + usuario como admin
- `join_family(invite_code)` - Une usuario a familia
- `leave_family()` - Sale de familia
- `get_user_family()` - Info de familia del usuario
- `get_family_members()` - Lista de miembros
- `regenerate_invite_code()` - Nuevo código (solo admin)
- `remove_family_member(user_id)` - Elimina miembro (solo admin)
- `transfer_admin_role(user_id)` - Transfiere rol admin

### Componentes
- [src/components/Header.tsx](../src/components/Header.tsx) - Header con nombre de usuario ✅ ACTUALIZADO
- [src/components/MobileSidebar.tsx](../src/components/MobileSidebar.tsx) - Menú hamburguesa lateral para mobile ✅ NUEVO (2026-02-06)
  - Overlay con animación slide-in desde la izquierda
  - Solo visible en mobile (md:hidden)
  - Incluye todos los enlaces, info de usuario y botón de cierre de sesión
- [src/components/Toast.tsx](../src/components/Toast.tsx) - Notificaciones
- [src/components/ConfirmDialog.tsx](../src/components/ConfirmDialog.tsx) - Diálogos de confirmación
- [src/components/FamilyManager.tsx](../src/components/FamilyManager.tsx) - Gestión de familia ✅ NUEVO
- ~~[src/components/CollaboratorsManager.tsx]~~ - ❌ ELIMINADO (reemplazado por FamilyManager)

### Páginas Implementadas
- [src/app/login/page.tsx](../src/app/login/page.tsx) - Autenticación ✅
- [src/app/login/callback/route.ts](../src/app/login/callback/route.ts) - Callback OAuth (server route) ✅ ACTUALIZADO
- [src/app/familia/page.tsx](../src/app/familia/page.tsx) - Gestión de familia ✅ NUEVO
- [src/app/ingredientes/page.tsx](../src/app/ingredientes/page.tsx) - CRUD completo ✅
  - Filtro multi-select por tipo con botones tipo "pills"
  - Búsqueda por nombre
  - Creación múltiple con separador `|`
  - **Autenticación real integrada** ✅ NUEVO
- [src/app/planes/page.tsx](../src/app/planes/page.tsx) - Planificación semanal ✅
  - **Gestión de colaboradores integrada** ✅ NUEVO
  - **Autenticación real integrada** ✅ NUEVO
  - **Drag & Drop para intercambiar comidas** ✅ NUEVO (2026-02-06)
    - Arrastra y suelta comidas del mismo tipo entre días
    - Efectos visuales: opacity, ring-indigo-400, scale transitions
    - Validación automática de tipo de comida (desayunos↔desayunos, etc.)
  - **Regeneración con patrón random** ✅ NUEVO (2026-02-06)
    - Selecciona patrón aleatorio de los disponibles (no solo el actual)
    - Mayor variedad en regeneraciones sucesivas
- ~~[src/app/combinaciones/page.tsx]~~ - ELIMINADO ❌
- [src/app/platos/page.tsx](../src/app/platos/page.tsx) - Existe pero NO se usa

### Otras Páginas
- [src/app/page.tsx](../src/app/page.tsx) - Homepage (actualizado: 3→2 columnas)
- [src/app/layout.tsx](../src/app/layout.tsx) - Layout con navegación (sin "Mis Menús")
- `/alimentos`, `/reglas`, `/debug`, `/test`, `/test-db` - Páginas varias

---

## Notas Importantes

### 1. Archivos Obsoletos (movidos a `/docs/obsolete/`)
**Documentación histórica:**
- `SCHEMA-V3.md`, `migration-v3.sql` - Diseño de 3 niveles NO implementado
- `PROGRESO-SESION.md`, `PASOS-FINALES.md` - Progreso de sesiones antiguas
- Ver [obsolete/README.md](./obsolete/README.md) para contexto completo

**Código legacy del sistema de combinaciones (eliminado 2026-01-17):**
- `schema-v2.sql` - Esquema con tabla `meal_combinations`
- `migration-v2.sql` - Migración V2 (no usada)
- `run-migration.ts`, `verify-migration.ts` - Scripts de migración

**Tipos deprecados:**
- `MealCombination`, `CreateCombinationForm`, etc. marcados con `@deprecated` en [src/types/v2.ts](../src/types/v2.ts)

### 2. Limpieza de Arquitectura Legacy (2026-01-17)
- ❌ Sistema de combinaciones/menús **completamente eliminado**
- ❌ Página `/combinaciones` eliminada del código
- ✅ Navegación actualizada: solo "Ingredientes" y "Planes"
- ✅ Homepage rediseñado de 3 a 2 columnas
- ✅ Todos los archivos SQL y scripts legacy movidos a `docs/obsolete/`

### 3. Sistema de Reglas AI con LLM (2026-01-24/25)
📁 Arquitectura completa en 3 fases implementadas

**Fase 1 - Validación Básica (2026-01-24)**
- Tabla `rules` en BD con reglas en lenguaje natural
- CRUD completo en página `/reglas`
- Validación de reglas con Gemini al crearlas (rechaza reglas sin sentido)
- Inferencia automática de `meal_type` e ingredientes mencionados
- Toggle activate/deactivate por regla

**Fase 2 - Modificaciones Automáticas (2026-01-24)**
📁 [src/lib/agents/planning-agent.ts](../src/lib/agents/planning-agent.ts) - Orchestrator principal
- Workflow con 5 nodos especializados:
  1. `generateBasePlanNode` - Genera plan base con WeeklyPlanningEngine
  2. `validateRulesNode` - Valida plan contra reglas activas con Gemini
  3. `suggestModificationsNode` - Gemini sugiere ingredient replacements
  4. `applyModificationsNode` - Aplica modificaciones programáticamente
  5. `finalizeNode` - Empaqueta resultado final + warnings
- Iteración automática hasta 3 veces para corregir conflictos
- Estado inmutable con spread operator pattern
- Tabla `agent_logs` en BD para debugging y transparencia

📁 [src/lib/llm/gemini-client.ts](../src/lib/llm/gemini-client.ts) - Cliente Gemini
- Modelo configurable vía `GEMINI_MODEL` env var
- Default: `gemini-2.5-flash` (modelo gratuito, verificado con API)
- Funciones:
  - `validateRuleText()` - Valida reglas al crearlas
  - `validatePlanAgainstRules()` - Detecta conflictos en plan
  - `suggestPlanModifications()` - Propone cambios específicos
- JSON response con `responseMimeType: 'application/json'`
- Temperature: 0.1 para respuestas consistentes

**Fase 3 - Feedback en Tiempo Real (2026-01-25)**
📁 [src/app/api/planning/generate/route.ts](../src/app/api/planning/generate/route.ts)
- SSE (Server-Sent Events) con `ReadableStream`
- Función `streamPlanningProgress()` retorna streaming response
- Headers correctos: `text/event-stream`, `no-cache`, `keep-alive`
- Función `mapViolationsToConflicts()` convierte violations técnicas a formato user-friendly
- Soporte para reintentos con `existingPlan` opcional

📁 [src/components/PlanningProgressModal.tsx](../src/components/PlanningProgressModal.tsx)
- Modal no bloqueante (puede cerrarse durante proceso)
- Estados: generating, validating, fixing, success, partial, error, closed
- Mensajes user-friendly en español:
  - 🔄 "Generando tu plan semanal..."
  - 🔍 "Revisando plan contra X reglas activas..."
  - 🔧 "Ajustando plan para cumplir las reglas..."
- Visualización detallada de conflictos:
  - Agrupados por regla
  - Lista de comidas afectadas con día + tipo
  - Explicación del conflicto
  - Sugerencia de corrección manual
- Botones contextuales:
  - **Ver Plan**: Cierra modal y muestra plan generado
  - **Reintentar**: Lanza 3 iteraciones más con plan actual (máx 2 veces)
  - **Entendido**: Solo cierra modal

📁 [src/app/planes/page.tsx](../src/app/planes/page.tsx)
- Función `generatePlanWithSSE()` consume stream con `fetch` + `ReadableStream.getReader()`
- Procesa eventos SSE y actualiza modal en tiempo real
- Lógica de reintentos: máximo 2 adicionales (3 intentos × 3 iteraciones = 9 total)
- Botón deshabilitado automáticamente después del límite
- Estados del modal sincronizados con eventos SSE

📁 [src/types/agent.ts](../src/types/agent.ts)
- `SSEEvent` - Union type de eventos SSE (generating, validating, fixing, success, partial_success, error)
- `ConflictDetail` - Formato user-friendly para mostrar conflictos pendientes
- `PlanningAgentState` - Estado del agente con ingredientes, patterns, violations, modifications
- `PlanningAgentResult` - Resultado final con plan + agent log

**Tecnologías:**
- Gemini 2.5 Flash API (`@google/generative-ai`)
- Server-Sent Events (SSE) nativo de Next.js
- ReadableStream API para streaming
- Agent pattern con 5 nodos especializados
- TypeScript types completos

**Fase 4 - Prompts Externos (2026-01-26)**
📁 [src/lib/prompts/](../src/lib/prompts/) - Sistema de prompts externos

**Motivación:** Prompts embebidos en código TypeScript son difíciles de mantener, versionar y colaborar. Separación necesaria para mejor mantenibilidad.

**Implementación:**
- ✅ 3 prompts extraídos a archivos `.md` separados:
  - `validate-rule.md` - Validación de reglas al crearlas
  - `validate-plan.md` - Detección de violaciones contra reglas activas
  - `suggest-modifications.md` - Sugerencias de corrección de conflictos
- ✅ Sistema de template loader: [src/lib/prompts/prompt-loader.ts](../src/lib/prompts/prompt-loader.ts)
  - Soporte para variables: `{{variableName}}`
  - Soporte para condicionales: `{{#if var}}...{{/if}}`
  - Cache en memoria para performance
  - Mensajes de error claros
- ✅ Cliente Gemini refactorizado: [src/lib/llm/gemini-client.ts](../src/lib/llm/gemini-client.ts)
  - Usa `getPrompt()` en lugar de strings embebidos
  - Código más limpio y enfocado en infraestructura
  - De ~267 líneas a ~160 líneas efectivas
- ✅ Prompt `suggest-modifications` mejorado:
  - Sección "Pattern Validation Rules" con guía paso a paso
  - Ejemplos concretos de patrones válidos/inválidos
  - Checklist de validación para el LLM
  - Validación explícita de tipos y cantidades de ingredientes

**Beneficios:**
- ✅ Prompts editables sin recompilar código
- ✅ Historial de cambios claro en git (separado del código)
- ✅ Fácil colaboración (no-devs pueden editar prompts)
- ✅ A/B testing sencillo (crear variantes de archivos)
- ✅ Mejor separación de responsabilidades

**Documentación:**
- [src/lib/prompts/README.md](../src/lib/prompts/README.md) - Guía completa de uso

### 4. Mejoras de UX Implementadas (2026-01-17)
**Filtro Multi-Select de Ingredientes:**
- Implementado sistema de botones tipo "pills" para filtrar por tipo
- Permite seleccionar múltiples tipos simultáneamente
- Botón "Limpiar filtros" cuando hay selecciones activas
- Contador visual de tipos seleccionados
- Diseño moderno con colores indigo para tipos activos

### 5. Distribuciones de Patrones
- Sistema usa distribuciones hardcodeadas en `DEFAULT_PATTERN_DISTRIBUTIONS`
- Usuario podrá personalizarlas en el futuro
- La tabla `pattern_distributions` está creada pero aún no se usa desde UI
- **Distribuciones actuales:**
  - Desayuno: 70% Tradicional, 30% Compuesto
  - Almuerzo: 60% Tradicional, 30% Compuesto+Verdura, 10% Completo
  - Onces: 60% Tradicional, 40% Compuesto+Fruta

### 5. Multi-usuario y Seguridad
- ✅ Todas las tablas tienen RLS (Row Level Security) policies
- ✅ Sistema preparado para multi-usuario (columna `user_id` en todas las tablas)
- ✅ **Autenticación real implementada** (2026-01-17)
  - Supabase Auth con email/password + Google OAuth
  - Middleware de protección de rutas
  - Sistema de familia (reemplaza colaboración)
  - ~~Deuda técnica de autenticación temporal~~ **ELIMINADA**
- ✅ **Bug crítico de seguridad RLS resuelto** (2026-01-23)
  - Usuarios ya NO pueden ver planes de otras familias
  - Políticas RLS con validación explícita `auth.uid() IS NOT NULL`
  - Scripts de diagnóstico para verificación futura

### 6. Bugs Conocidos y Deuda Técnica

**✅ RESUELTOS:**
- ~~**RLS Infinite Recursion**~~ - Resuelto con sistema de familia (2026-01-19)
- ~~**Bug seguridad RLS en weekly_plans**~~ - Resuelto con migración 020 (2026-01-23)

**Alta Prioridad:**
- Motor de reglas: Las reglas no se están aplicando correctamente en el algoritmo
- UX Móvil: Tipografía muy clara, navegación oculta en vertical, scrolling excesivo
- Ver sección "🐛 Bugs Pendientes" en [BACKLOG.md](./BACKLOG.md)

### 7. Mantenimiento del Repositorio (2026-01-30)

**Limpieza de archivos en raíz:**
- ✅ Movido `SETUP-AUTH.md` → [docs/SETUP-AUTH.md](./SETUP-AUTH.md) para mejor organización
- ✅ Eliminados archivos JavaScript obsoletos no usados:
  - `check-env.js` (sin referencias en código)
  - `simple-server.js` (sin referencias en código)
  - `static-server.js` (sin referencias en código)
- ✅ Actualizadas todas las referencias en documentación:
  - [CLAUDE.md](../CLAUDE.md) - Link actualizado
  - [BACKLOG.md](./BACKLOG.md) - Path relativo corregido
  - [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Path relativo corregido
- ✅ Build verificado exitosamente sin errores

**Beneficio:** Raíz del repositorio más limpia y organizada, solo con archivos esenciales de configuración.

---

## Decisiones Técnicas Clave

### ¿Por qué 2 niveles en lugar de 3?
- Usuario NO quiere gestionar "platos intermedios"
- Usuario NO quiere app de recetas
- Objetivo: **Planificación rápida**, no gestión de recetas complejas
- Motor combina ingredientes automáticamente

### ¿Por qué patrones fijos en BD?
- Permite evolución futura (usuarios podrán crear patrones custom)
- Separación de lógica y datos
- Fácil agregar nuevos patrones sin cambiar código

### ¿Por qué validación de disponibilidad?
- Evita errores: nunca intenta generar con ingredientes inexistentes
- Auto-adaptativo: funciona con cualquier cantidad de ingredientes
- Permite arranque gradual (empezar con solo patrón 1, agregar más después)

---

## Estado de Testing

⏳ **Pendiente**: Testing con datos reales después de implementar página de planificación

Casos a probar:
1. Plan con todos los patrones disponibles
2. Plan con solo algunos patrones disponibles
3. Plan con ingredientes insuficientes para algunos tipos
4. Edición manual de comidas generadas
5. Regeneración de plan completo
6. Guardar y recuperar planes

---

## Contribuciones del Usuario

El usuario proporcionó:
- Definición exacta de los patrones de comida
- Clarificación de tipos de ingredientes
- Decisión de arquitectura (2 niveles vs 3 niveles)
- Export de base de datos actual para migración
- Feedback iterativo en diseño

---

## Próximas Prioridades

Ver [BACKLOG.md](./BACKLOG.md) para lista completa y actualizada.

### 🔥 Crítico
1. **Resolver bug de RLS infinite recursion** - BLOQUEA testing de colaboración (2026-01-18)
   - Re-pensar estrategia de RLS desde cero
   - Ver opciones detalladas en BACKLOG.md

### ⚡ Alta Prioridad
1. ~~**Testing completo** del sistema de autenticación y colaboración~~ ⚠️ **PARCIALMENTE COMPLETADO**
   - ✅ Framework de testing instalado (Vitest + Playwright)
   - ✅ Component tests (14/14 passing)
   - ✅ E2E auth tests (11/11 passing)
   - ❌ Data isolation test (bloqueado por RLS bug)
   - ❌ Collaboration tests (bloqueado por RLS bug)
2. **Nuevas reglas inteligentes** (no repetir onces/ensaladas por X días)
3. **Mejoras UX planificador** (lock items, vista previa, intercambio de menús)
4. **CRUD de reglas** desde UI
5. **Modularización del código** (refactoring)

### 🔸 Media Prioridad
6. **CRUD de tipos** desde UI (no hardcodeados)
7. **Orden alfabético automático** en dropdowns
8. **Integración con LLMs** (interpretación de reglas, sugerencias)

---

**Última actualización**: 2026-01-30 (Fix crítico de seguridad RLS + Animación SVG)
**Estado**: Bug crítico de seguridad resuelto + UX mejorado con animación SVG ✅
**Cambios de hoy**:
- ✅ **🔒 FIX CRÍTICO DE SEGURIDAD - RLS en family_members**
  - **Problema**: Tabla `family_members` sin RLS desde migración 013 (completamente expuesta)
  - **Impacto**: Cualquier usuario autenticado podía ver/modificar todos los miembros de todas las familias
  - **Solución**: Migración [024_enable_rls_family_members.sql](../supabase/migrations/024_enable_rls_family_members.sql)
  - RLS habilitado con políticas que usan `get_current_user_family_id()` (SECURITY DEFINER, sin recursión)
  - SELECT: Solo miembros de la familia del usuario
  - INSERT/UPDATE/DELETE: Bloqueados (solo via RPC functions: create_family, join_family, etc.)
  - **Limpieza adicional**: Migración [025_cleanup_legacy_tables.sql](../supabase/migrations/025_cleanup_legacy_tables.sql)
    - Eliminadas 7 tablas legacy: meal_combinations, food_ingredients_backup, total_plans, plans_with_family, families_count, weekly_plans_count, ingredients_count
    - Tablas no usadas en código (verificado con grep)
  - **Resultado**: Security Advisor limpio - 8 errores → 0 errores ✅
- ✅ **SVG Animado en Modal de Progreso AI**
  - SVG personalizado de olla con burbujas de vapor subiendo
  - Animación de tapa con efecto de vapor escapando (keyframes SVG)
  - 10 mensajes rotativos temáticos sobre cocina
  - Rotación automática cada 2.5 segundos durante procesamiento
  - Archivo modificado: [src/components/PlanningProgressModal.tsx](../src/components/PlanningProgressModal.tsx)
  - Beneficio: Mejor UX, usuario recibe feedback constante que el proceso está activo
- ✅ **Opción Lottie agregada al backlog** como mejora opcional futura

**Cambios previos (2026-01-26)**:
- ✅ **Refactorización de Prompts LLM**
  - Prompts extraídos de [src/lib/llm/gemini-client.ts](../src/lib/llm/gemini-client.ts) a archivos `.md` externos
  - 3 archivos creados: `validate-rule.md`, `validate-plan.md`, `suggest-modifications.md`
  - Sistema de template loader: [src/lib/prompts/prompt-loader.ts](../src/lib/prompts/prompt-loader.ts)
  - Soporte para variables `{{var}}` y condicionales `{{#if var}}...{{/if}}`
  - Cache en memoria para optimizar performance
  - Documentación completa: [src/lib/prompts/README.md](../src/lib/prompts/README.md)
- ✅ **Mejora del Prompt suggest-modifications**
  - Sección "Pattern Validation Rules" con validación paso a paso
  - Ejemplos concretos: Desayuno, Almuerzo, Onces (válidos ✅ e inválidos ❌)
  - Checklist de validación para que el LLM se auto-verifique
  - Énfasis explícito: "CRITICALLY IMPORTANT", "MUST", validación de tipos
- ✅ **Navegación mejorada**
  - Enlace "Reglas" agregado al header: [src/components/Header.tsx](../src/components/Header.tsx)
  - Orden: Ingredientes → Reglas → Planes → Mi Familia

**Archivos creados en sesión anterior (2026-01-26)**:
- [src/lib/prompts/prompt-loader.ts](../src/lib/prompts/prompt-loader.ts) - Template system
- [src/lib/prompts/validate-rule.md](../src/lib/prompts/validate-rule.md) - Validación de reglas
- [src/lib/prompts/validate-plan.md](../src/lib/prompts/validate-plan.md) - Detección de violaciones
- [src/lib/prompts/suggest-modifications.md](../src/lib/prompts/suggest-modifications.md) - Sugerencias de corrección
- [src/lib/prompts/README.md](../src/lib/prompts/README.md) - Documentación completa

### 4. Mejoras UX Mobile + Bug Crítico LLM Resuelto (2026-02-06)

**🐛 Bug Crítico Resuelto:**
- **Problema**: Sistema NO usaba LLM si usuario no tenía familia
  - Backend API rechazaba requests sin `familyId` (400 Bad Request)
  - Frontend requería `familyId` para detectar reglas activas
  - Impacto: Motor AI nunca se ejecutaba para usuarios sin familia
- **Solución implementada**:
  - ✅ Frontend ([src/app/planes/page.tsx](../src/app/planes/page.tsx)): Query de reglas condicional
  - ✅ Backend ([src/app/api/planning/generate/route.ts](../src/app/api/planning/generate/route.ts)): `familyId` opcional, query condicional
  - ✅ Agent ([src/lib/agents/planning-agent.ts](../src/lib/agents/planning-agent.ts)): Parámetro `familyId: string | null`
- **Resultado**: Sistema usa LLM correctamente con o sin familia

**🎨 Mejoras UX Mobile:**
1. **Tipografía mejorada**:
   - Cambiado `text-gray-500/600` → `text-gray-700/900`
   - Mejor contraste en todas las pantallas móviles
   - Archivos: [src/app/page.tsx](../src/app/page.tsx), [src/app/ingredientes/page.tsx](../src/app/ingredientes/page.tsx), [src/app/planes/page.tsx](../src/app/planes/page.tsx), [src/components/Header.tsx](../src/components/Header.tsx)

2. **Menú hamburguesa lateral**:
   - Nuevo componente: [src/components/MobileSidebar.tsx](../src/components/MobileSidebar.tsx)
   - Overlay + animación slide-in desde izquierda
   - Solo visible en mobile (`md:hidden`)
   - Incluye todos los enlaces, info de usuario y cierre de sesión

3. **Drag & Drop nativo HTML5**:
   - Intercambio de comidas del mismo tipo entre días
   - Efectos visuales: `opacity-50`, `ring-4 ring-indigo-400`, `scale-95/105`
   - Validación automática de tipo de comida
   - Implementado en [src/app/planes/page.tsx](../src/app/planes/page.tsx)

4. **Regeneración con patrón random**:
   - Ahora selecciona patrón aleatorio (no solo el actual)
   - Mayor variedad en regeneraciones sucesivas
   - Actualiza `pattern_id` y `pattern_name` automáticamente

**Verificado contra código real**: Sí ✅
- Motor de planificación: [src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts)
- Sistema de patrones: [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts)
- Cliente Gemini: [src/lib/llm/gemini-client.ts](../src/lib/llm/gemini-client.ts) - refactorizado
- Prompts LLM: [src/lib/prompts/](../src/lib/prompts/) - nueva estructura
- Página de planes: [src/app/planes/page.tsx](../src/app/planes/page.tsx)
- Autenticación: [src/app/login/page.tsx](../src/app/login/page.tsx), [src/middleware.ts](../src/middleware.ts)
- Familia: [src/components/FamilyManager.tsx](../src/components/FamilyManager.tsx), [src/lib/hooks/useFamily.ts](../src/lib/hooks/useFamily.ts)
- Testing: [tests/component/](../tests/component/), [tests/e2e/](../tests/e2e/)
- Migraciones SQL: [supabase/migrations/](../supabase/migrations/)
