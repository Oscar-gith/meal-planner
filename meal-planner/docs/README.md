# Documentación del Proyecto - Meal Planner

**Última actualización:** 2026-01-17

## 📖 Guía de Inicio Rápido

### 🚀 Inicio de Sesión de Trabajo

**Usa el prompt de inicio:** [PROMPT-INICIO-SESION.md](PROMPT-INICIO-SESION.md)

Copia y pega el prompt al inicio de cada sesión para que Claude:
1. Lea la documentación actualizada
2. Verifique el estado del proyecto
3. Te presente opciones de trabajo

### 🏁 Cierre de Sesión de Trabajo

**Usa el prompt de cierre:** [PROMPT-CIERRE-SESION.md](PROMPT-CIERRE-SESION.md)

Copia y pega el prompt al final de cada sesión para:
1. Resumir lo completado
2. Actualizar la documentación
3. Preparar el próximo commit
4. Dejar todo listo para la siguiente sesión

---

### Lectura Manual (si prefieres no usar prompts)

Si estás comenzando una nueva sesión de trabajo manualmente:

1. **Lee el [BACKLOG.md](BACKLOG.md)** para ver qué está pendiente y las prioridades
2. **Revisa [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)** para entender el estado actual
3. **Consulta [MEAL-PATTERNS-FINAL.md](MEAL-PATTERNS-FINAL.md)** si vas a trabajar con patrones o ingredientes

---

## 📚 Documentación Activa

### [BACKLOG.md](BACKLOG.md)
**Propósito:** Lista de tareas pendientes, prioridades y roadmap del proyecto

**Contenido:**
- Estado actual de la arquitectura implementada
- Funcionalidades completadas
- Bugs pendientes
- Tareas organizadas por prioridad (Crítica, Alta, Media, Baja)
- Ideas para brainstorming futuro

**Cuándo consultarlo:** Al inicio de cada sesión para decidir qué trabajar

---

### [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)
**Propósito:** Resumen técnico completo de la implementación actual

**Contenido:**
- Arquitectura final decidida (2 niveles con patrones)
- Estructura de base de datos (tablas y relaciones)
- Tipos de ingredientes definidos
- Patrones de comida implementados
- Código implementado (archivos clave)
- Lógica del motor de planificación
- Estado de testing

**Cuándo consultarlo:** Cuando necesites entender cómo funciona el sistema actual

---

### [MEAL-PATTERNS-FINAL.md](MEAL-PATTERNS-FINAL.md)
**Propósito:** Definición detallada del sistema de patrones de comida

**Contenido:**
- Tipos de ingredientes por tipo de comida
- Definición de los 7 patrones del sistema
- Lógica del motor de planificación
- Reglas de validación de disponibilidad
- Ejemplos concretos de cada patrón
- Estado de ingredientes (cuáles existen, cuáles faltan)

**Cuándo consultarlo:** Cuando trabajes con patrones, ingredientes o generación de planes

---

## 🗂️ Estructura del Proyecto

```
docs/
├── README.md                      # Este archivo (índice de documentación)
├── PROMPT-INICIO-SESION.md        # ⭐ Prompt para iniciar sesiones de trabajo
├── PROMPT-CIERRE-SESION.md        # ⭐ Prompt para cerrar sesiones de trabajo
├── BACKLOG.md                     # Tareas pendientes y prioridades
├── IMPLEMENTATION-SUMMARY.md      # Resumen técnico del sistema
├── MEAL-PATTERNS-FINAL.md         # Definición de patrones de comida
└── obsolete/                      # Documentación obsoleta (referencia histórica)
    ├── README.md                  # Índice de archivos obsoletos
    ├── SCHEMA-V3.md               # Diseño de 3 niveles (NO implementado)
    ├── MIGRATION-STATUS.md        # Status migración V3 (NO realizada)
    ├── migration-v3.sql           # Script migración V3 (NO usado)
    ├── PROGRESO-SESION.md         # Progreso sesiones antiguas
    ├── PASOS-FINALES.md           # Setup inicial (ya completado)
    ├── EJECUTAR-MIGRACION.md      # Instrucciones migración antigua
    └── MIGRATION_GUIDE.md         # Guía migración antigua
```

---

## 🎯 Estado del Proyecto

### ✅ Sistema Actual
- **Arquitectura:** 2 niveles (Ingredientes → Patrones → Planes)
- **Motor de planificación:** Funcional y basado en patrones
- **Páginas:** `/ingredientes`, `/combinaciones`, `/planes` implementadas
- **Base de datos:** PostgreSQL en Supabase con RLS

### 🔥 Próximas Prioridades

1. **Autenticación Real** - Reemplazar UUID hardcodeado
2. **Crear Ingredientes Faltantes** - Para habilitar todos los patrones
3. **Nuevas Reglas Inteligentes** - Sistema de reglas temporales
4. **Mejoras UX** - Lock items, vista previa

Ver [BACKLOG.md](BACKLOG.md) para lista completa.

---

## 📝 Notas Importantes

### Archivos Obsoletos
La carpeta `obsolete/` contiene documentación de diseños NO implementados:
- **SCHEMA-V3.md**: Se decidió NO implementar arquitectura de 3 niveles
- Los archivos se mantienen para referencia histórica pero NO reflejan el sistema actual

### Convención de Nombres
- Archivos en MAYÚSCULAS = Documentación principal
- Archivos en minúsculas = Scripts SQL u otros archivos técnicos

---

## 🔗 Enlaces Útiles

### Código Principal
- Motor de planificación: [src/lib/weekly-planner.ts](../src/lib/weekly-planner.ts)
- Sistema de patrones: [src/lib/meal-patterns.ts](../src/lib/meal-patterns.ts)
- Página de planes: [src/app/planes/page.tsx](../src/app/planes/page.tsx)
- Página de ingredientes: [src/app/ingredientes/page.tsx](../src/app/ingredientes/page.tsx)

### Base de Datos
- Migraciones: [supabase/migrations/](../supabase/migrations/)
- Tipos TypeScript: [src/types/](../src/types/)

---

**¿Listo para comenzar?** → Lee el [BACKLOG.md](BACKLOG.md) y elige tu próxima tarea
