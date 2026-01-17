# Prompt de Inicio de Sesión

Copia y pega este prompt al inicio de cada sesión de trabajo con Claude Code:

---

```
Voy a comenzar una nueva sesión de trabajo en el proyecto Meal Planner.

Por favor, ayúdame a prepararnos siguiendo estos pasos:

1. **Lee la documentación base:**
   - Lee docs/README.md para entender la estructura del proyecto
   - Lee docs/BACKLOG.md para ver las tareas pendientes y prioridades
   - Lee docs/IMPLEMENTATION-SUMMARY.md para entender el estado técnico actual

2. **Verifica el estado del proyecto:**
   - Confirma que los 3 documentos principales están actualizados (fecha 2026-01-17 o posterior)
   - Si encuentras algo desactualizado, avísame antes de continuar

3. **Preséntame un resumen ejecutivo:**
   - Estado actual del proyecto (qué está funcionando)
   - Prioridades críticas y altas del backlog
   - Opciones de tareas para trabajar hoy

4. **Espera mi decisión:**
   - Una vez que me presentes las opciones, esperaré a que yo decida en qué trabajar
   - NO comiences a trabajar automáticamente

¿Listo para comenzar?
```

---

## Notas de Uso

- **Cuándo usar:** Al inicio de CADA sesión de trabajo
- **Tiempo estimado:** 2-3 minutos para que Claude lea y prepare el resumen
- **Resultado esperado:** Un resumen ejecutivo con opciones claras de trabajo

## Ejemplo de Respuesta Esperada

Claude debería responder algo como:

```
✅ Documentación leída y verificada

📊 ESTADO ACTUAL:
- Sistema de planificación basado en patrones: Funcional ✅
- Motor de generación de planes: Implementado ✅
- Páginas: /ingredientes, /planes, /combinaciones

🔥 PRIORIDADES CRÍTICAS:
1. Autenticación real (eliminar UUID hardcodeado)
2. Crear ingredientes faltantes para patrones

⚡ PRIORIDADES ALTAS:
3. Nuevas reglas inteligentes
4. Mejoras UX del planificador
5. CRUD de reglas

📋 OPCIONES PARA HOY:
A. Implementar autenticación con Supabase Auth
B. Crear ingredientes de tipos faltantes (Desayuno, Compuestos)
C. Trabajar en reglas inteligentes
D. Mejoras UX (lock items, vista previa)
E. Otra tarea específica

¿En qué quieres trabajar hoy?
```

---

## Variaciones del Prompt

### Si ya sabes en qué quieres trabajar:

```
Hola! Voy a trabajar en [TAREA ESPECÍFICA] hoy.

Por favor:
1. Lee docs/BACKLOG.md y docs/IMPLEMENTATION-SUMMARY.md
2. Busca información relevante sobre [TAREA ESPECÍFICA]
3. Preséntame un plan de acción para completar la tarea

¿Listo?
```

### Si es una sesión de bugfix:

```
Hola! Encontré un bug: [DESCRIPCIÓN DEL BUG]

Por favor:
1. Lee docs/IMPLEMENTATION-SUMMARY.md para entender el contexto
2. Busca en el código dónde podría estar el problema
3. Propón soluciones

¿Listo?
```

---

**Tip:** Guarda este archivo en tus marcadores o ten una nota con el prompt base para copiarlo rápidamente.
