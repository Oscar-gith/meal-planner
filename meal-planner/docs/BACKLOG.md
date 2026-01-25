# Meal Planner - Backlog

## 📌 Estado Actual del Proyecto

**Última actualización:** 2026-01-19 (Sistema de Familia implementado)

### ✅ Arquitectura Implementada

**DECISIÓN TOMADA:** Se implementó sistema de patrones de comida con arquitectura de 2 niveles:

```
Ingredientes (con tipos específicos por patrón)
    ↓
Patrones de Comida (7 patrones del sistema)
    ↓
Planes Semanales (generación automática)
```

**Implementación:**
- Motor de planificación basado en patrones ([src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts))
- Sistema de validación de disponibilidad ([src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts))
- 7 patrones predefinidos en BD: Desayuno (2), Almuerzo (3), Onces (2)
- Generación automática que combina ingredientes según patrones disponibles

Ver [MEAL-PATTERNS-FINAL.md](MEAL-PATTERNS-FINAL.md) y [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) para detalles completos.

---

## ✅ Funcionalidades Completadas

### Core del Sistema
- [x] Arquitectura de 2 niveles con sistema de patrones
- [x] Base de datos PostgreSQL en Supabase
- [x] Tablas: `food_ingredients`, `meal_patterns`, `weekly_plans`, `pattern_distributions`, `plan_collaborators`
- [x] Motor de planificación basado en patrones ([src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts))
- [x] Sistema de validación de disponibilidad de patrones
- [x] 7 patrones predefinidos en BD (Desayuno: 2, Almuerzo: 3, Onces: 2)
- [x] Separación de datos por usuario (user_id en todas las tablas)
- [x] RLS (Row Level Security) en Supabase
- [x] **Autenticación Real** con Supabase Auth ✅ NUEVO
- [x] **Sistema de Familia** (reemplaza colaboración) ✅ NUEVO (2026-01-19)

### Páginas Implementadas
- [x] [/login](../src/app/login/page.tsx) - Autenticación ✅ NUEVO
  - Login/registro con email y password
  - Autenticación con Google OAuth
  - Toggle entre registro e inicio de sesión
  - Manejo de errores y validaciones
- [x] [/login/callback](../src/app/login/callback/route.ts) - Callback OAuth (server route) ✅ ACTUALIZADO
- [x] [/familia](../src/app/familia/page.tsx) - Gestión de familia ✅ NUEVO (2026-01-19)
  - Crear familia e invitar hasta 5 miembros
  - Unirse con código de invitación
  - Ver miembros, roles (admin/member)
  - Ingredientes y planes compartidos automáticamente
- [x] [/ingredientes](../src/app/ingredientes/page.tsx) - CRUD completo de ingredientes
  - Filtro multi-select por tipo (botones tipo "pills")
  - Búsqueda por nombre
  - Creación múltiple con separador `|`
  - **Autenticación real integrada** ✅ NUEVO
- [x] [/planes](../src/app/planes/page.tsx) - Planificación semanal completa
  - Configuración de plan (5 o 7 días)
  - Visualización de patrones disponibles
  - Generación automática con distribución de patrones
  - Edición individual de comidas
  - Sustituciones de comidas
  - Guardar planes en BD
  - Ver planes guardados
  - **Planes compartidos con familia** ✅ ACTUALIZADO (2026-01-19)
  - **Autenticación real integrada** ✅

### Bugs Resueltos
- [x] Bug calendario: domingo incluido incorrectamente ✅
- [x] Bug regla huevos: repetición consecutiva ✅
- [x] Combinaciones ilógicas en generación ✅
- [x] Persistencia de planes ✅
- [x] Historial de planes ✅
- [x] Bug fechas con timezone ✅
- [x] Bug regeneración de plan ✅
- [x] Bug distribución de patrones ✅

### Limpieza de Código Completada
- [x] Eliminación de arquitectura deprecada de combinaciones/menús ✅
- [x] Página `/combinaciones` eliminada (sistema legacy) ✅
- [x] Tipos deprecados marcados con `@deprecated` en `src/types/v2.ts` ✅
- [x] Archivos legacy movidos a `docs/obsolete/` ✅
- [x] Navegación actualizada (solo Ingredientes y Planes) ✅

---

## 🐛 Bugs Pendientes

**Prioridad: CRÍTICA** 🔥
- [x] ~~**RLS Infinite Recursion en plan_collaborators**~~ ✅ **RESUELTO (2026-01-19)**
  - Solución: Reemplazado sistema de `plan_collaborators` por nuevo sistema de "Familia"
  - Ver sección "Sistema de Familia" abajo

**Prioridad: Alta**
- [x] ~~**🔒 SEGURIDAD - Planes visibles sin autorización**~~ ✅ **RESUELTO (2026-01-23)**
  - Problema: Usuarios podían ver planes guardados de otras familias
  - Causa raíz: Políticas RLS no validaban explícitamente `auth.uid() IS NOT NULL`
  - Solución: Migración `020_verify_and_fix_rls.sql` con validación explícita
  - Políticas actualizadas: `weekly_plans`, `families`, `food_ingredients`
  - Scripts de diagnóstico creados para verificación futura
- [ ] **Motor de reglas**: Las reglas no se están aplicando correctamente en el algoritmo
- [ ] Validar que todas las reglas se aplican correctamente
- [ ] Mejorar logging para debug del algoritmo
- [x] ~~Datos huérfanos con user_id incorrecto~~ ✅ **RESUELTO** - Migración 012

**Prioridad: Media**
- [ ] **Home page - Resumen hardcodeado**: Los números en el resumen (96 Alimentos, 6 Reglas, etc.) están hardcodeados y no deberían mostrarse sin usuario logueado
  - Ocultar sección "Resumen" para usuarios no autenticados
  - Cargar datos reales desde BD cuando hay usuario logueado
- [ ] **UX Móvil - Tipografía muy clara**: Los colores de los tipos de letra son muy claros/tenues cuando se ve desde celular, dificulta la lectura
- [ ] **UX Móvil - Navegación y scrolling**:
  - Menú horizontal (Ingredientes, Planes, Familia) se oculta en orientación vertical del celular
  - Solo se muestra cuando el celular está en horizontal
  - Requiere demasiado scrolling en móvil - optimizar layout para pantallas pequeñas

---

## 📋 Tareas Pendientes

### 🔥 PRIORIDAD CRÍTICA

~~#### 1. Autenticación Real (DEUDA TÉCNICA)~~ ✅ **COMPLETADO** (2026-01-17)

**✅ Implementado:**
- [x] Páginas `/login` y `/login/callback` creadas
- [x] Login/registro con email y password
- [x] Autenticación con Google OAuth configurada y funcionando
- [x] Middleware de protección de rutas ([src/middleware.ts](../src/middleware.ts))
- [x] Header dinámico con usuario y botón "Cerrar sesión"
- [x] Integración en páginas de ingredientes y planes
- [x] Sistema de colaboración multi-usuario implementado
- [x] Archivos temporales eliminados (`dev-user.ts`, `005_create_dev_user.sql`)

**Migraciones ejecutadas:**
- [x] `006_create_plan_collaborators.sql` - Sistema de colaboración
- [x] `007_create_user_search_function.sql` - Búsqueda segura de usuarios

**Documentación creada:**
- [x] [SETUP-AUTH.md](../SETUP-AUTH.md) - Guía completa de configuración

**Estado:** ✅ **LISTO PARA PRODUCCIÓN** (autenticación configurada y probada)

#### 2. Crear Ingredientes Faltantes para Patrones ✅ COMPLETADO

**Estado:** Todos los ingredientes necesarios ya fueron creados por el usuario.

---

### ⚡ PRIORIDAD ALTA

#### 3. Testing Completo del Sistema de Autenticación y Colaboración

**✅ FASE 1 - Testing Setup (COMPLETADO 2026-01-18)**
- [x] Crear proyecto de Supabase para testing
- [x] Instalar framework de testing (Vitest + Playwright)
- [x] Configurar archivos de testing (`vitest.config.ts`, `playwright.config.ts`)
- [x] Crear utilities de testing (supabase-mock, auth-helpers)
- [x] Actualizar package.json y .gitignore
- [x] Crear script `dev:test` con dotenv-cli
- [x] Crear usuarios de testing programáticamente

**Archivos creados:**
- `playwright.config.ts` - Config Playwright
- `vitest.config.ts` - Config Vitest
- `tests/setup.ts` - Setup global + custom matchers
- `tests/utils/supabase-mock.ts` - Mock de Supabase
- `tests/scripts/create-test-users.ts` - Script de usuarios

**✅ FASE 2 - Testing de Autenticación (COMPLETADO 2026-01-18)**
- [x] **Component tests**:
  - [x] LoginPage component test (14/14 tests passing) ✅
  - [x] Render inicial y elementos del formulario
  - [x] Login con email/password (success, error, loading)
  - [x] Registro de usuario (toggle, submission, confirmation)
  - [x] Google OAuth iniciación
  - [x] Validación de formularios
- [x] **E2E tests de autenticación** (11/11 tests passing) ✅:
  - [x] Display correcto de login page
  - [x] Login exitoso con credenciales válidas
  - [x] Error con credenciales inválidas
  - [x] Error con usuario no existente
  - [x] Validación de campos requeridos
  - [x] Toggle entre login/signup
  - [x] Logout exitoso
  - [x] Persistencia de sesión (page reload)
  - [x] Persistencia de sesión (new tab)
  - [x] Redirect a login sin autenticación
  - [x] Login secuencial de múltiples usuarios

**Archivos creados:**
- `tests/component/LoginPage.test.tsx` - Component tests ✅
- `tests/e2e/auth/login.spec.ts` - E2E auth tests ✅

**❌ FASE 2 - Data Isolation Test (BLOQUEADO por bug RLS)**
- [x] Test creado pero no pasa ❌
- [ ] **BUG CRÍTICO**: Infinite recursion en RLS policies
  - Archivo: `tests/e2e/auth/data-isolation.spec.ts`
  - Error: "infinite recursion detected in policy for relation plan_collaborators"
  - Causa: Trigger `create_plan_owner_collaborator` + RLS policies circulares
  - Intentos de fix: 8+ iteraciones sin éxito
  - **DECISIÓN**: Pausar y re-pensar estrategia de RLS

**✅ FASE 3 - Testing de Familia (DESBLOQUEADA - nuevo sistema implementado)**
- [ ] **Testing de familia**:
  - [ ] Crear familia con usuario 1
  - [ ] Unirse a familia con usuario 2 usando código
  - [ ] Verificar que usuario 2 ve ingredientes de la familia
  - [ ] Verificar que usuario 2 ve planes de la familia
  - [ ] Crear ingrediente desde usuario 2, verificar visible para usuario 1
  - [ ] Crear plan desde usuario 2, verificar visible para usuario 1
  - [ ] Salir de familia y verificar aislamiento de datos
- [ ] **Testing de integración**:
  - [ ] Crear ingredientes con usuario autenticado
  - [ ] Generar plan con ingredientes del usuario
  - [ ] Guardar plan y verificar owner
  - [ ] Ver planes en lista (solo propios + familia)

#### 4. Nuevas Reglas Inteligentes

- [ ] **Regla meriendas**: No repetir ningún item de onces hasta 2 días después
- [ ] **Regla ensaladas**: No repetir ensalada hasta 2 días después
- [ ] **Reglas temporales**: Sistema para definir "no repetir X por Y días"
- [ ] **Validador de reglas**: Verificar que el plan cumple todas las reglas antes de mostrarlo

#### 4. Mejoras UX del Planificador
- [ ] **Intercambio de menús entre días**: Permitir arrastrar/intercambiar comidas completas entre días
  - Ejemplo: Mover almuerzo del lunes al miércoles y viceversa
  - Mantener integridad del resto del plan (otros días no afectados)
  - UI con drag & drop o botones de intercambio
  - Funciona para cualquier tipo de comida (desayuno, almuerzo, onces)
- [ ] **Lock items**: Marcar comidas como "no cambiar" durante regeneración
- [ ] **Vista previa**: Mostrar cambios antes de confirmar

#### 5. CRUD de Reglas
- [ ] Agregar nuevas reglas en lenguaje natural
- [ ] Editar reglas existentes
- [ ] Activar/desactivar reglas
- [ ] Validación de formularios de reglas

#### 6. Arquitectura y Organización del Código
- [ ] **Modularización**: Refactorizar aplicación para que no sea una sola página "spaghetti"
  - Separar componentes reutilizables
  - Organizar lógica de negocio en módulos
  - Estructura clara de carpetas y responsabilidades
- [x] **Consolidación de documentación**: Todos los .md ya están en `/docs` ✅

#### 7. Separación de Ambientes (Dev/Test/Prod) 🔧 ACTUALIZADO 2026-01-24
**Motivación:** Actualmente `npm run dev` conecta a producción y `npm run dev:test` mezcla desarrollo con testing. NO es una buena práctica tener dev y test en el mismo ambiente.

**Situación actual:**
- **prod**: `ovhzvwmiouaoilswgeef` (usado con `npm run dev` - ⚠️ RIESGO)
- **test**: `xgofutvrhfpywqhrrvlp` (usado con `npm run dev:test` + E2E tests - ⚠️ MEZCLADO)

**Configuración ideal:**
- **dev**: Nuevo proyecto Supabase dedicado para desarrollo local
- **test**: `xgofutvrhfpywqhrrvlp` (SOLO para E2E tests automatizados)
- **prod**: `ovhzvwmiouaoilswgeef` (producción, sin acceso directo desde dev)

**Tareas:**
- [ ] **Crear proyecto Supabase dedicado para desarrollo**
  - Nuevo proyecto en Supabase dashboard
  - Aplicar todas las migraciones (000-023)
  - Seed data de desarrollo (ingredientes ejemplo, patrones, etc.)
  - Configurar OAuth redirect URLs para localhost:3000
- [ ] **Reorganizar variables de entorno**
  - `.env.local` → **desarrollo local** (nuevo proyecto dev)
  - `.env.production` → producción (Vercel)
  - `tests/.env.test` → testing (mantener xgofutvrhfpywqhrrvlp, SOLO para E2E)
- [ ] **Actualizar scripts npm**
  - `npm run dev` → usa `.env.local` (proyecto dev)
  - `npm run dev:test` → ELIMINAR (confunde dev con test)
  - `npm run test:e2e` → usa `tests/.env.test` (proyecto test)
- [ ] **Documentar flujo de migraciones**
  - Aplicar primero en dev → testear
  - Luego en test → E2E tests
  - Finalmente en prod → deployment
- [ ] **Protección de producción**
  - Nunca conectar directamente a prod desde localhost
  - Considerar IP whitelist en Supabase prod
  - Monitoreo de conexiones sospechosas

**Beneficios:**
- ✅ Desarrollo seguro sin riesgo a prod
- ✅ Testing aislado con datos controlados
- ✅ Separación clara de responsabilidades
- ✅ Facilita onboarding de nuevos devs
- ✅ Permite experimentar sin consecuencias

**Referencias:**
- [docs/DESARROLLO-LOCAL.md](docs/DESARROLLO-LOCAL.md) - Documentación temporal (será actualizada)

---

### 🔸 PRIORIDAD MEDIA

#### 8. Framework de Testing Automatizado
- [ ] **Evaluar y seleccionar framework de testing**:
  - [ ] Investigar opciones: Vitest, Jest, Playwright, Cypress
  - [ ] Considerar testing unitario vs E2E vs integración
  - [ ] Evaluar compatibilidad con Next.js 15 y Supabase
  - [ ] Revisar performance y velocidad de ejecución
- [ ] **Setup inicial del framework**:
  - [ ] Instalar y configurar framework seleccionado
  - [ ] Configurar scripts en package.json
  - [ ] Setup de CI/CD para tests automáticos (GitHub Actions)
- [ ] **Escribir tests básicos**:
  - [ ] Tests unitarios para funciones de utilidad
  - [ ] Tests de componentes React
  - [ ] Tests de integración para flujos críticos
  - [ ] Tests E2E para user journeys principales
- [ ] **Coverage y reportes**:
  - [ ] Configurar code coverage
  - [ ] Establecer threshold mínimo (ej: 80%)
  - [ ] Generar reportes HTML

#### 9. CRUD de Tipos
- [ ] **Página de gestión de tipos**: Nueva página para administrar tipos
  - CRUD completo para tipos de ingredientes (Fruta, Carb, Proteína, etc.)
  - CRUD completo para tipos de comidas (Desayuno, Almuerzo, Onces, etc.)
  - Los tipos deben ser editables desde UI, no hardcodeados

#### 10. Mejoras UX Generales
- [x] **Filtro multi-select de ingredientes**: Implementado con botones tipo "pills" ✅
- [ ] **Orden alfabético automático**: Tipos de alimento ordenados alfabéticamente
  - Aplicar en dropdowns y vistas de listado
  - Auto-reordenar al crear tipo nuevo

#### 11. Motor de Reglas con LLM 🤖 ✅ IMPLEMENTADO (Fases 1-3)
**Motivación:** El motor de reglas fijas es complejo y poco flexible. Arquitectura con LLM implementada.

**✅ FASE 1 - Validación Básica (COMPLETADA 2026-01-24)**
- [x] **Tabla de reglas** en BD (`rules` table)
- [x] **CRUD de Reglas en Lenguaje Natural**: Usuario escribe reglas como texto libre
  - Ejemplo: "No repetir ningún ingrediente de onces hasta 2 días después"
  - Ejemplo: "No quiero pescado los viernes"
  - Ejemplo: "Máximo 2 veces arroz por semana"
- [x] **Gestión de Reglas**: Activar/desactivar reglas (toggle is_active)
- [x] **Evaluador LLM de Planes**: Gemini valida plan contra reglas activas
- [x] **Visualización de conflictos**: Warnings mostrados en UI
- [x] **Validación de reglas** al crearlas con Gemini (rechaza reglas sin sentido)
- [x] **Inferencia automática**: LLM infiere meal_type y ingredientes mencionados

**✅ FASE 2 - Modificaciones Automáticas (COMPLETADA 2026-01-24)**
- [x] **Refinador Autónomo**: LLM ajusta el plan automáticamente si no cumple reglas
- [x] **Sistema de Iteración**: Agente itera hasta 3 veces para corregir conflictos
- [x] **Aplicación de cambios**: Modifications aplicadas programáticamente al plan
- [x] **Workflow con 5 nodos**: generateBasePlan, validateRules, suggestModifications, applyModifications, finalize
- [x] **Agent logs en BD**: Tabla `agent_logs` para debugging y transparencia

**✅ FASE 3 - Feedback en Tiempo Real (COMPLETADA 2026-01-25)**
- [x] **SSE (Server-Sent Events)**: Streaming de progreso en tiempo real
- [x] **Modal de progreso**: `PlanningProgressModal` con estados visuales
- [x] **Mensajes user-friendly**: 🔄 Generando, 🔍 Revisando, 🔧 Ajustando
- [x] **Sistema de Reintentos**: Máximo 2 reintentos adicionales (9 iteraciones total)
- [x] **Visualización de conflictos**: Detalles agrupados por regla con sugerencias
- [x] **ConflictDetail type**: Formato user-friendly para end users

**Ventajas Implementadas:**
- ✅ Flexibilidad total: usuario puede crear cualquier regla
- ✅ Sin código hardcodeado: todas las reglas en BD
- ✅ Fácil de mantener y extender
- ✅ Usuario puede ser tan específico como quiera
- ✅ Feedback en tiempo real durante el proceso
- ✅ Reintentos automáticos si quedan conflictos

**Arquitectura Implementada:**
1. ✅ Motor genera plan base con patrones
2. ✅ Gemini 2.5 Flash evalúa plan contra reglas activas (SSE: "Revisando...")
3. ✅ Si no cumple: Gemini sugiere modificaciones específicas
4. ✅ Aplicación programática de modificaciones (SSE: "Ajustando...")
5. ✅ Repetir hasta cumplir todas las reglas (max 3 iteraciones × 3 reintentos = 9 total)
6. ✅ Mostrar plan final + conflictos restantes con sugerencias manuales

**Tecnologías:**
- Gemini 2.5 Flash (modelo gratuito, `gemini-2.5-flash`)
- Server-Sent Events (SSE) para streaming
- Agent pattern con 5 nodos especializados
- TypeScript types completos (SSEEvent, ConflictDetail)

**Archivos clave:**
- `src/lib/agents/planning-agent.ts` - Orchestrator
- `src/lib/agents/nodes/` - Nodos especializados
- `src/lib/llm/gemini-client.ts` - Cliente Gemini
- `src/components/PlanningProgressModal.tsx` - UI de progreso
- `src/app/api/planning/generate/route.ts` - API con SSE

**Pendientes (Fase 4 - Features Avanzados):**
- [ ] **Explicación de Cambios**: LLM explica por qué hizo cada ajuste (en modal)
- [ ] **Rule templates**: Templates pre-definidos de reglas comunes
- [ ] **Priorización de reglas**: Sistema de prioridades entre reglas conflictivas
- [ ] **Visual diff**: Before/after de las modificaciones aplicadas
- [ ] **Agent reasoning viewer**: Log detallado del proceso de decisión del agente
- [ ] **Bulk operations**: Enable/disable múltiples reglas a la vez

#### 12. LLMs y Agentes Inteligentes (Otras Funcionalidades)
- [ ] Generación de descripciones automáticas de platos
- [ ] Sugerencias inteligentes basadas en historial
- [ ] Chat bot para consultas sobre nutrición
- [ ] Análisis de balance nutricional

---

### 🔹 PRIORIDAD BAJA

#### 13. Scheduling Automático de Planes 📅
**Objetivo:** Generar planes automáticamente en schedule configurado

**Funcionalidades:**
- [ ] **Configuración de Schedule**: Usuario define cuándo generar planes
  - Ejemplo: "Cada lunes generar plan para la semana"
  - Ejemplo: "Cada domingo a las 6pm generar plan de 7 días"
- [ ] **Cron Jobs**: Sistema de tareas programadas
- [ ] **Notificaciones**: Email/push cuando se genera nuevo plan
- [ ] **Historial Automático**: Guardar todos los planes generados automáticamente
- [ ] **Override Manual**: Usuario puede regenerar manualmente si no le gusta

**Implementación:**
- Backend: Vercel Cron Jobs o similar
- Alternativa: GitHub Actions con schedule
- Notificaciones: Supabase Edge Functions + email service

#### 14. Mejoras en Visualización
- [ ] Vista de tarjetas para alimentos con imágenes
- [ ] Vista de lista compacta
- [ ] Filtros avanzados (búsqueda por texto, tags)
- [ ] Categorías visuales con íconos
- [ ] Drag & drop para reorganizar
- [ ] Vista calendario para planes generados

#### 15. Rediseño de Home Page 🏠 NUEVO
**Objetivo:** Crear una página de inicio que explique de qué se trata la app

**Para usuarios NO autenticados:**
- [ ] Landing page atractiva que explique el propósito de la app
- [ ] Secciones: ¿Qué es?, Características, Cómo funciona
- [ ] Call-to-action claro para registrarse/iniciar sesión
- [ ] Ocultar sección "Resumen" (no mostrar datos sin login)

**Para usuarios autenticados:**
- [ ] Dashboard personalizado con datos reales del usuario
- [ ] Resumen dinámico (ingredientes, planes, familia)
- [ ] Accesos rápidos a funcionalidades principales
- [ ] Última actividad o plan reciente

#### 16. Analytics y Reportes 📊
**Objetivo:** Insights sobre consumo y preferencias del usuario

**Funcionalidades:**
- [ ] **Dashboard de Analytics**: Vista con estadísticas generales
- [ ] **Ingredientes Más Consumidos**: Top 10 ingredientes por frecuencia
- [ ] **Patrones Más Usados**: Qué patrones se usan más
- [ ] **Balance Nutricional**: Gráficos de distribución de tipos de alimentos
- [ ] **Tendencias Temporales**: Consumo por semana/mes
- [ ] **Favoritos del Usuario**: Ingredientes que más aparecen en planes guardados
- [ ] **Reportes Exportables**: PDF/Excel con resumen mensual

**Métricas a Trackear:**
- Frecuencia de uso de cada ingrediente
- Frecuencia de uso de cada patrón
- Planes generados vs guardados (tasa de satisfacción)
- Tiempo entre generaciones de plan
- Ingredientes nunca usados (sugerencias de limpieza)

#### 14. Monetización 💰
**Estrategias propuestas:**

**Opción A - Freemium:**
- [ ] **Tier Gratuito**: Límite de 10 ingredientes, 2 planes guardados
- [ ] **Tier Premium**: Ilimitado + features avanzadas
  - LLM rules engine
  - Scheduling automático
  - Analytics avanzados
  - Export PDF personalizado
  - Sin publicidad

**Opción B - Publicidad:**
- [ ] **Ads en Free Tier**: Google AdSense o similar
- [ ] **Ubicaciones**: Footer, sidebar en desktop
- [ ] **No invasivos**: No interrumpir flujo de uso

**Opción C - Tips/Donaciones:**
- [ ] **"Buy Me a Coffee" Button**: En footer o settings
- [ ] **Ko-fi Integration**: Alternativa a BMAC
- [ ] **Mensaje de Apoyo**: "¿Te gusta la app? Apóyanos con un café ☕"

**Opción D - Sponsor/Afiliados:**
- [ ] **Affiliate Links**: Productos de cocina, ingredientes
- [ ] **Partnerships**: Tiendas de alimentos, meal kit services

**Decisión:** Empezar con Opción C (tips), luego evaluar Freemium si hay tracción

#### 15. Funcionalidades Adicionales
- [ ] Lista de compras automática
- [ ] Export a PDF/Excel
- [ ] Notificaciones por email
- [ ] Modo oscuro
- [ ] Aplicación móvil (React Native/Capacitor)

---

## 💡 Ideas para Brainstorming Futuro

### Visualización de Alimentos
- Tarjetas con fotos de los platos
- Agrupación visual por colores de meal type
- Vista tipo Pinterest con grid masonry
- Búsqueda predictiva con auto-complete
- Tags personalizados por usuario
- Vista nutricional con macros

### Motor de Reglas con LLM (Propuesta Usuario)
**Enfoque Revolucionario:**
- Motor de reglas completamente basado en LLM
- Reglas en lenguaje natural guardadas en BD
- LLM evalúa y ajusta planes de forma autónoma
- Usuario crea reglas como quiera sin limitaciones técnicas
- Sistema iterativo hasta cumplir todas las reglas

**Beneficios:**
- Sin complejidad en código de reglas
- Infinita flexibilidad
- Fácil de mantener y extender
- Natural para el usuario

### Scheduling Automático
- Generación programada de planes (ej: cada lunes)
- Notificaciones automáticas cuando hay nuevo plan
- Configuración flexible de horarios

### Analytics y Reportes
- Dashboard con estadísticas de consumo
- Ingredientes y patrones más usados
- Tendencias temporales
- Reportes exportables

### Monetización
- **Fase 1**: "Buy me a coffee" button (tips voluntarios)
- **Fase 2**: Freemium model si hay tracción
- **Fase 3**: Ads discretos en tier gratuito
- **Fase 4**: Partnerships con tiendas de alimentos

### LLM Integration Ideas Adicionales
- "Planner Asistente": Chat para modificar planes
- Análisis nutricional: "¿Este plan está balanceado?"
- Generación creativa: "Sugiere una variación de este plato"
- Interpretación de reglas complejas: "No quiero pescado los viernes católicos"

### Arquitectura Futura
- Microservicios: Separar LLM logic en service dedicado
- Cache Redis: Para planes generados frecuentemente
- Queue system: Para procesamiento async de reglas complejas
- Analytics DB: Tracking detallado de uso y preferencias
- Cron system: Para scheduling automático

---

## 📚 Documentación de Referencia

### Documentación Activa
- [README.md](README.md) - **INICIO AQUÍ** - Índice y guía de inicio rápido
- [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) - Resumen técnico completo (verificado vs código real)
- [MEAL-PATTERNS-FINAL.md](MEAL-PATTERNS-FINAL.md) - Definición completa de patrones de comida
- [BACKLOG.md](BACKLOG.md) - Este archivo

### Documentación Obsoleta
Ver [obsolete/](obsolete/) para:
- `SCHEMA-V3.md` - Diseño de 3 niveles (NO implementado)
- `MIGRATION-STATUS.md` - Estado migración V3 (NO realizada)
- `PROGRESO-SESION.md` - Progreso de sesiones antiguas
- Y otros archivos de referencia histórica

---

**Última actualización:** 2026-01-25 (SSE Progress Feedback + Gemini 2.5 Flash)
**Estado:** Sistema de reglas AI completamente funcional con feedback en tiempo real
**Cambios de hoy:**
- ✅ **Sistema SSE (Server-Sent Events)** implementado completamente
  - Modal de progreso en tiempo real durante generación de planes
  - Mensajes user-friendly en español (generando, validando, ajustando)
  - Estados visuales: generating, validating, fixing, success, partial, error
  - Visualización detallada de conflictos pendientes
- ✅ **Sistema de Reintentos** implementado
  - Máximo 2 reintentos adicionales (3 intentos totales = 9 iteraciones LLM)
  - Botón "Reintentar" con plan existente como base
  - Overlay "Procesando..." mientras reintenta
  - Deshabilitación automática después de límite
- ✅ **Modelo Gemini actualizado** a `gemini-2.5-flash` (modelo gratuito correcto)
  - Verificado con lista de modelos disponibles de la API
  - Variable de entorno `GEMINI_MODEL` configurable
  - Documentación actualizada en `.env.local.example`
- ✅ **Componente PlanningProgressModal** creado
  - No bloqueante (puede cerrarse durante proceso)
  - Botones contextuales: Ver Plan, Reintentar, Entendido
  - Conflictos agrupados por regla con sugerencias
- ✅ Build exitoso confirmado

**Próximo paso recomendado:**
1. Testing manual del flujo SSE completo
2. Testing E2E de aislamiento de datos entre familias
3. **Crear proyecto dev separado** (ver sección "7. Separación de Ambientes")
4. Mejoras UX móvil (tipografía, navegación, scrolling)