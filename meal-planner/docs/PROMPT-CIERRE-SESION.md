# Prompt de Cierre de Sesión

Copia y pega este prompt al FINAL de cada sesión de trabajo con Claude Code:

---

```
Hemos terminado la sesión de trabajo de hoy.

Por favor, ayúdame a cerrar la sesión correctamente:

1. **Resume lo que hicimos:**
   - Lista los cambios realizados (archivos creados/modificados)
   - Menciona funcionalidades implementadas
   - Indica bugs resueltos o nuevos bugs encontrados

2. **Actualiza la documentación:**
   - Revisa docs/BACKLOG.md:
     * Marca como completado [x] las tareas que terminamos
     * Agrega nuevas tareas si identificamos algo pendiente
     * Actualiza la fecha de "Última actualización"

   - Revisa docs/IMPLEMENTATION-SUMMARY.md:
     * Agrega las nuevas funcionalidades implementadas
     * Actualiza la sección "Código Implementado" si creamos archivos nuevos
     * Actualiza "Notas Importantes" si hay nueva deuda técnica
     * Actualiza la fecha

   - Si trabajamos con patrones, revisa docs/MEAL-PATTERNS-FINAL.md:
     * Actualiza el "Estado de Implementación"
     * Marca como completado lo que terminamos
     * Actualiza la fecha

3. **Verifica consistencia:**
   - Confirma que los 3 documentos principales están sincronizados
   - Verifica que las referencias cruzadas funcionen
   - Asegúrate de que no queden TODOs obsoletos en los docs

4. **Genera resumen final:**
   - Qué se completó hoy
   - Qué quedó pendiente para la próxima sesión
   - Próximos pasos recomendados

5. **Checklist de git (si aplica):**
   - ¿Hay cambios sin commitear?
   - ¿Debería crear un commit ahora?
   - Sugiere un mensaje de commit apropiado

¿Puedes ayudarme con esto?
```

---

## Notas de Uso

- **Cuándo usar:** Al FINAL de cada sesión de trabajo
- **Tiempo estimado:** 5-10 minutos para actualizar documentación
- **Importante:** NO saltes este paso, mantiene la documentación sincronizada

## Ejemplo de Respuesta Esperada

Claude debería responder algo como:

```
✅ RESUMEN DE LA SESIÓN

🎯 COMPLETADO HOY:
- Implementada autenticación con Supabase Auth
- Creadas páginas /login y /login/callback
- Eliminado src/lib/auth/dev-user.ts
- Actualizado planes/page.tsx y combinaciones/page.tsx

📝 DOCUMENTACIÓN ACTUALIZADA:
- ✅ BACKLOG.md
  * Marcada tarea #1 (Autenticación) como completada
  * Fecha actualizada a 2026-01-18

- ✅ IMPLEMENTATION-SUMMARY.md
  * Agregada sección "Sistema de Autenticación"
  * Eliminada nota de deuda técnica
  * Fecha actualizada a 2026-01-18

- ✅ Verificación de consistencia: Todos los docs sincronizados

⏳ PENDIENTE PARA PRÓXIMA SESIÓN:
- Crear ingredientes faltantes para patrones (Prioridad CRÍTICA #2)
- Probar el sistema de autenticación en producción

🔜 PRÓXIMO PASO RECOMENDADO:
Trabajar en crear ingredientes de tipos faltantes (Proteína Desayuno,
Carb Desayuno, etc.) para habilitar todos los patrones de comida.

📦 ESTADO DE GIT:
- 5 archivos modificados
- 2 archivos nuevos
- 1 archivo eliminado

💡 COMMIT SUGERIDO:
feat: Implement Supabase authentication

- Add login and callback pages
- Remove dev-user temporary auth
- Update planes and combinaciones pages to use real auth
- Add middleware for route protection

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Checklist Manual (después del prompt)

Después de que Claude termine, verifica tú mismo:

- [ ] Los cambios de código hacen sentido
- [ ] La documentación está actualizada
- [ ] No hay información contradictoria entre documentos
- [ ] El commit message refleja correctamente los cambios
- [ ] Estás satisfecho con lo completado hoy

---

## Variaciones del Prompt

### Si terminaste antes de tiempo o hubo problemas:

```
Sesión terminada (no completamos todo lo planeado).

Por favor:
1. Resume lo que SÍ completamos
2. Documenta problemas encontrados o blockers
3. Actualiza BACKLOG.md con el estado real
4. Sugiere qué hacer en la próxima sesión

NO hagas commit si el trabajo está incompleto.
```

### Si solo hiciste exploraciones/investigación:

```
Sesión de exploración terminada (no hubo cambios en código).

Por favor:
1. Resume hallazgos importantes
2. Agrega TODOs al BACKLOG.md si encontramos tareas nuevas
3. Actualiza notas en IMPLEMENTATION-SUMMARY.md si es relevante
4. Recomienda próximos pasos basados en lo aprendido

NO necesitamos commit.
```

---

## Tips para Sesiones Productivas

### Frecuencia de commits:
- **Sesión pequeña (< 2 horas):** 1 commit al final
- **Sesión mediana (2-4 horas):** 2-3 commits por funcionalidad
- **Sesión larga (> 4 horas):** Commit cada vez que completes algo funcional

### Cuándo NO hacer commit:
- Código no funciona o tiene errores
- Funcionalidad está a medias
- No pasaron los tests
- Hay TODOs o FIXMEs que debían resolverse

### Cuándo SÍ hacer commit:
- Funcionalidad completa y funcionando
- Tests pasando
- Documentación actualizada
- Código revisado

---

**Tip:** Ejecuta este prompt SIEMPRE, incluso si la sesión fue corta. 5 minutos de documentación ahora te ahorran 30 minutos de confusión después.
