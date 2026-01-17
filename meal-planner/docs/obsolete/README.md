# Documentación Obsoleta

Esta carpeta contiene documentación de diseños e implementaciones que **NO se realizaron** pero se mantienen para referencia histórica.

---

## ⚠️ IMPORTANTE

**Nada de lo que está en esta carpeta refleja el sistema actual.**

Estos archivos documentan decisiones que fueron consideradas pero descartadas, o pasos de migración que ya fueron completados y ya no son relevantes.

---

## 📄 Contenido

### Diseño de 3 Niveles (NO Implementado)

**Archivos:**
- `SCHEMA-V3.md` - Diseño detallado de arquitectura de 3 niveles
- `MIGRATION-STATUS.md` - Estado de migración a V3
- `migration-v3.sql` - Script SQL para migración

**Contexto:**
Se evaluó implementar una arquitectura de 3 niveles (Ingredientes → Platos → Menús) pero se decidió usar un enfoque más simple de 2 niveles con sistema de patrones.

**Decisión tomada:**
Sistema de patrones de comida con generación automática. Ver [../IMPLEMENTATION-SUMMARY.md](../IMPLEMENTATION-SUMMARY.md) para detalles de lo que SÍ se implementó.

---

### Documentación de Sesiones Antiguas

**Archivos:**
- `PROGRESO-SESION.md` - Progreso de sesiones de desarrollo antiguas
- `PASOS-FINALES.md` - Pasos de configuración inicial
- `EJECUTAR-MIGRACION.md` - Instrucciones para ejecutar migración V2
- `MIGRATION_GUIDE.md` - Guía de migración antigua

**Contexto:**
Documentación de sesiones de trabajo anteriores que ya fueron completadas. La información relevante ya está consolidada en los documentos principales.

**Estado actual:**
- Las migraciones mencionadas ya fueron ejecutadas
- El setup inicial ya está completo
- El progreso está documentado en [../IMPLEMENTATION-SUMMARY.md](../IMPLEMENTATION-SUMMARY.md)

---

## 🔄 Si Necesitas Esta Información

Aunque esta documentación está obsoleta, puede ser útil para:
- Entender decisiones arquitectónicas pasadas
- Ver qué alternativas se consideraron y por qué se descartaron
- Referencia histórica del desarrollo del proyecto

---

**Para documentación actual, consulta:** [../README.md](../README.md)
