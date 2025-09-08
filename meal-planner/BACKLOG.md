# Meal Planner - Backlog

## ✅ Completado en Sesión 1
- [x] Arquitectura y diseño de la aplicación
- [x] Base de datos PostgreSQL en Supabase con 96 alimentos y 6 reglas
- [x] Importación de datos desde CSV
- [x] Interfaz web moderna con Next.js y Tailwind CSS
- [x] Algoritmo básico de planificación con reglas predefinidas
- [x] Visualización de alimentos por categorías
- [x] Generación de planes semanales
- [x] Deploy en Vercel con CI/CD automático

## 🐛 Bugs Identificados - Sesión 1
**Prioridad: Crítica - Arreglar primero**

- [ ] **Bug calendario**: Incluye domingo aun con flag de fines de semana deshabilitado
- [ ] **Bug regla huevos**: Repite huevos días consecutivos ignorando la regla "No huevo dos días seguidos"
- [ ] **Motor de reglas**: Las reglas no se están aplicando correctamente en el algoritmo

## 📋 Para Próximas Sesiones

### 1. Bugs Críticos y Mejoras al Algoritmo
**Prioridad: Crítica**
- [ ] Arreglar lógica de fechas para respetar flag de fines de semana
- [ ] Corregir aplicación de reglas en el motor de planificación
- [ ] Validar que todas las reglas se aplican correctamente
- [ ] Mejorar logging para debug del algoritmo

### 2. Nuevas Reglas Inteligentes
**Prioridad: Alta**
- [ ] **Regla meriendas**: No repetir ningún item de onces hasta 2 días después
- [ ] **Regla ensaladas**: No repetir ensalada hasta 2 días después  
- [ ] **Reglas temporales**: Sistema para definir "no repetir X por Y días"
- [ ] **Validador de reglas**: Verificar que el plan cumple todas las reglas antes de mostrarlo

### 3. Mejoras UX del Planificador
**Prioridad: Alta**
- [ ] **Confirmación**: Preguntar antes de sobreescribir plan actual
- [ ] **Edición individual**: Click en cualquier comida para cambiarla
- [ ] **Regeneración parcial**: Cambiar solo desayuno/almuerzo/once de un día
- [ ] **Sustituciones**: "Dame otra opción para esta comida"
- [ ] **Lock items**: Marcar comidas como "no cambiar" durante regeneración
- [ ] **Vista previa**: Mostrar cambios antes de confirmar

### 4. CRUD de Alimentos y Reglas
**Prioridad: Alta**
- [ ] Agregar nuevos alimentos con formulario
- [ ] Editar alimentos existentes (nombre, tipo, subtipo)
- [ ] Eliminar alimentos
- [ ] Agregar nuevas reglas en lenguaje natural
- [ ] Editar reglas existentes
- [ ] Activar/desactivar reglas
- [ ] Validación de formularios

### 5. Sistema de Autenticación  
**Prioridad: Media**
- [ ] Autenticación con email/password usando Supabase Auth
- [ ] Login con Google OAuth
- [ ] Registro de nuevos usuarios
- [ ] Protección de rutas privadas
- [ ] Datos aislados por usuario
- [ ] Re-habilitar RLS con políticas de seguridad por usuario

### 6. LLMs y Agentes Inteligentes
**Prioridad: Media**
- [ ] Integración con OpenAI/Claude API para interpretación de reglas
- [ ] Sistema agentico para reglas complejas
- [ ] Generación de descripciones automáticas de platos
- [ ] Sugerencias inteligentes basadas en historial
- [ ] Chat bot para consultas sobre nutrición
- [ ] Análisis de balance nutricional

### 7. Mejoras en Visualización
**Prioridad: Baja** 
- [ ] Vista de tarjetas para alimentos con imágenes
- [ ] Vista de lista compacta
- [ ] Filtros avanzados (búsqueda por texto, tags)
- [ ] Categorías visuales con íconos
- [ ] Drag & drop para reorganizar
- [ ] Vista calendario para planes generados

### 8. Funcionalidades Adicionales
**Prioridad: Baja**
- [ ] Historial de planes generados
- [ ] Guardado de planes favoritos
- [ ] Lista de compras automática
- [ ] Export a PDF/Excel
- [ ] Notificaciones por email
- [ ] Modo oscuro
- [ ] Aplicación móvil (React Native/Capacitor)

## 🚀 Ideas para Brainstorming

### Visualización de Alimentos
- **Tarjetas con fotos** de los platos
- **Agrupación visual** por colores de meal type
- **Vista tipo Pinterest** con grid masonry
- **Búsqueda predictiva** con auto-complete
- **Tags personalizados** por usuario
- **Vista nutricional** con macros

### LLM Integration Ideas
- **"Planner Asistente"**: Chat para modificar planes
- **Análisis nutricional**: "¿Este plan está balanceado?"
- **Generación creativa**: "Sugiere una variación de este plato"
- **Interpretación de reglas complejas**: "No quiero pescado los viernes católicos"

## 🏗️ Arquitectura Futura
- **Microservicios**: Separar LLM logic en service dedicado
- **Cache Redis**: Para planes generados frecuentemente  
- **Queue system**: Para procesamiento async de reglas complejas
- **Analytics**: Tracking de uso y preferencias

---

**Generado:** ${new Date().toISOString()}  
**Estado:** Aplicación base completada y funcional ✅