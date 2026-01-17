# Meal Planner - Backlog

## 📌 Estado Actual del Proyecto

**Última actualización:** 2026-01-17

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
- [x] Tablas: `food_ingredients`, `meal_patterns`, `weekly_plans`, `pattern_distributions`
- [x] Motor de planificación basado en patrones ([src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts))
- [x] Sistema de validación de disponibilidad de patrones
- [x] 7 patrones predefinidos en BD (Desayuno: 2, Almuerzo: 3, Onces: 2)
- [x] Separación de datos por usuario (user_id en todas las tablas)
- [x] RLS (Row Level Security) en Supabase

### Páginas Implementadas
- [x] [/ingredientes](../src/app/ingredientes/page.tsx) - CRUD completo de ingredientes
  - Filtro multi-select por tipo (botones tipo "pills")
  - Búsqueda por nombre
  - Creación múltiple con separador `|`
- [x] [/planes](../src/app/planes/page.tsx) - Planificación semanal completa
  - Configuración de plan (5 o 7 días)
  - Visualización de patrones disponibles
  - Generación automática con distribución de patrones
  - Edición individual de comidas
  - Sustituciones de comidas
  - Guardar planes en BD
  - Ver planes guardados

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

**Prioridad: Alta**
- [ ] **Motor de reglas**: Las reglas no se están aplicando correctamente en el algoritmo
- [ ] Validar que todas las reglas se aplican correctamente
- [ ] Mejorar logging para debug del algoritmo

---

## 📋 Tareas Pendientes

### 🔥 PRIORIDAD CRÍTICA

#### 1. Autenticación Real (DEUDA TÉCNICA)
**Estado actual**: Usando hardcoded UUID `00000000-0000-0000-0000-000000000000` para desarrollo

**Archivos a eliminar:**
- [src/lib/auth/dev-user.ts](../src/lib/auth/dev-user.ts) - Helper temporal con UUID hardcodeado
- `supabase/migrations/005_create_dev_user.sql` - Usuario fake en auth.users

**Páginas a crear:**
- `/login` - Login/registro con email y password
- `/login/callback` - Callback de OAuth

**Archivos a actualizar:**
- [src/app/planes/page.tsx](../src/app/planes/page.tsx) - Línea 19: Reemplazar `import { getDevUserId }` y usar `supabase.auth.getUser()`
- [src/app/ingredientes/page.tsx](../src/app/ingredientes/page.tsx) - Línea 36: Reemplazar `DEFAULT_USER_ID` hardcodeado

**Total verificado:** Solo 2 páginas usan autenticación temporal ✅

**Funcionalidades:**
- Login/registro con email y password usando Supabase Auth
- Sign in con cuenta de Google (OAuth)
- Protección de rutas con middleware
- Manejo de sesiones con cookies
- Header con usuario y botón "Cerrar sesión"

**⚠️ IMPORTANTE**: NO DESPLEGAR A PRODUCCIÓN sin autenticación real.

#### 2. Crear Ingredientes Faltantes para Patrones ✅ COMPLETADO

~~Según [MEAL-PATTERNS-FINAL.md](MEAL-PATTERNS-FINAL.md), faltan ingredientes de estos tipos:~~

**Estado:** Todos los ingredientes necesarios ya fueron creados por el usuario.

---

### ⚡ PRIORIDAD ALTA

#### 3. Nuevas Reglas Inteligentes

- [ ] **Regla meriendas**: No repetir ningún item de onces hasta 2 días después
- [ ] **Regla ensaladas**: No repetir ensalada hasta 2 días después
- [ ] **Reglas temporales**: Sistema para definir "no repetir X por Y días"
- [ ] **Validador de reglas**: Verificar que el plan cumple todas las reglas antes de mostrarlo

#### 4. Mejoras UX del Planificador
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

---

### 🔸 PRIORIDAD MEDIA

#### 7. CRUD de Tipos
- [ ] **Página de gestión de tipos**: Nueva página para administrar tipos
  - CRUD completo para tipos de ingredientes (Fruta, Carb, Proteína, etc.)
  - CRUD completo para tipos de comidas (Desayuno, Almuerzo, Onces, etc.)
  - Los tipos deben ser editables desde UI, no hardcodeados

#### 8. Mejoras UX Generales
- [x] **Filtro multi-select de ingredientes**: Implementado con botones tipo "pills" ✅
- [ ] **Orden alfabético automático**: Tipos de alimento ordenados alfabéticamente
  - Aplicar en dropdowns y vistas de listado
  - Auto-reordenar al crear tipo nuevo

#### 9. Motor de Reglas con LLM (NUEVA PROPUESTA) 🤖
**Motivación:** El motor de reglas fijas es complejo y poco flexible. Propuesta de arquitectura con LLM.

**Funcionalidades:**
- [ ] **Evaluador LLM de Planes**: LLM evalúa si el plan generado cumple todas las reglas
- [ ] **Refinador Autónomo**: Si no cumple reglas, LLM ajusta el plan automáticamente
- [ ] **CRUD de Reglas en Lenguaje Natural**: Usuario escribe reglas como texto libre
  - Ejemplo: "No repetir ningún ingrediente de onces hasta 2 días después"
  - Ejemplo: "No quiero pescado los viernes"
  - Ejemplo: "Máximo 2 veces arroz por semana"
- [ ] **Gestión de Reglas**: Activar/desactivar, editar, priorizar reglas
- [ ] **Sistema de Iteración**: LLM itera hasta que el plan cumpla todas las reglas activas
- [ ] **Explicación de Cambios**: LLM explica por qué hizo cada ajuste al plan

**Ventajas:**
- ✅ Flexibilidad total: usuario puede crear cualquier regla
- ✅ Sin código hardcodeado: todas las reglas en BD
- ✅ Fácil de mantener y extender
- ✅ Usuario puede ser tan específico como quiera

**Arquitectura Propuesta:**
1. Motor genera plan base con patrones
2. LLM evalúa plan contra reglas activas
3. Si no cumple: LLM genera nuevo plan ajustado
4. Repetir hasta cumplir todas las reglas (max 3-5 iteraciones)
5. Mostrar plan final + explicación de ajustes

#### 10. LLMs y Agentes Inteligentes (Otras Funcionalidades)
- [ ] Generación de descripciones automáticas de platos
- [ ] Sugerencias inteligentes basadas en historial
- [ ] Chat bot para consultas sobre nutrición
- [ ] Análisis de balance nutricional

---

### 🔹 PRIORIDAD BAJA

#### 11. Scheduling Automático de Planes 📅
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

#### 12. Mejoras en Visualización
- [ ] Vista de tarjetas para alimentos con imágenes
- [ ] Vista de lista compacta
- [ ] Filtros avanzados (búsqueda por texto, tags)
- [ ] Categorías visuales con íconos
- [ ] Drag & drop para reorganizar
- [ ] Vista calendario para planes generados

#### 13. Analytics y Reportes 📊
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

**Última actualización:** 2026-01-17 (Sesión vespertina)
**Estado:** Sistema de planificación basado en patrones completamente funcional ✅
**Cambios recientes:** Eliminada arquitectura legacy de combinaciones, implementado filtro multi-select
**Próximo paso recomendado:** Implementar autenticación real (prioridad crítica)