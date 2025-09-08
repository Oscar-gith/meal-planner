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

## 📋 Para Próximas Sesiones

### 1. CRUD de Alimentos y Reglas
**Prioridad: Alta**
- [ ] Agregar nuevos alimentos con formulario
- [ ] Editar alimentos existentes (nombre, tipo, subtipo)
- [ ] Eliminar alimentos
- [ ] Agregar nuevas reglas en lenguaje natural
- [ ] Editar reglas existentes
- [ ] Activar/desactivar reglas
- [ ] Validación de formularios

### 2. Sistema de Autenticación  
**Prioridad: Alta**
- [ ] Autenticación con email/password usando Supabase Auth
- [ ] Login con Google OAuth
- [ ] Registro de nuevos usuarios
- [ ] Protección de rutas privadas
- [ ] Datos aislados por usuario
- [ ] Re-habilitar RLS con políticas de seguridad por usuario

### 3. LLMs y Agentes Inteligentes
**Prioridad: Media**
- [ ] Integración con OpenAI/Claude API para interpretación de reglas
- [ ] Sistema agentico para reglas complejas
- [ ] Generación de descripciones automáticas de platos
- [ ] Sugerencias inteligentes basadas en historial
- [ ] Chat bot para consultas sobre nutrición
- [ ] Análisis de balance nutricional

### 4. Mejoras en Visualización
**Prioridad: Media** 
- [ ] Vista de tarjetas para alimentos con imágenes
- [ ] Vista de lista compacta
- [ ] Filtros avanzados (búsqueda por texto, tags)
- [ ] Categorías visuales con íconos
- [ ] Drag & drop para reorganizar
- [ ] Vista calendario para planes generados

### 5. Funcionalidades Adicionales
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