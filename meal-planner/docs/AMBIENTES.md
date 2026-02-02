# Ambientes de Desarrollo

Este documento explica la configuración de ambientes (dev, test, prod) del proyecto meal-planner.

## Resumen de Ambientes

El proyecto tiene **3 ambientes completamente separados**, cada uno con su propio proyecto Supabase:

| Ambiente | Proyecto Supabase | Variables de Entorno | Propósito |
|----------|------------------|---------------------|-----------|
| **Desarrollo** | `vxhjzhwlyuiinpelpqae` | `.env.local` | Desarrollo local, experimentación segura |
| **Testing** | `xgofutvrhfpywqhrrvlp` | `tests/.env.test` | Tests automatizados (Vitest + Playwright) |
| **Producción** | `ovhzvwmiouaoilswgeef` | Variables en Vercel | App desplegada en Vercel |

## Ambiente de Desarrollo

### Configuración

El ambiente de desarrollo usa el archivo `.env.local` en la raíz del proyecto.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://vxhjzhwlyuiinpelpqae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key
GOOGLE_API_KEY=your_gemini_api_key
```

### Uso

```bash
npm run dev
```

La app se ejecuta en `http://localhost:3000` conectada al proyecto dev.

### Datos

- Clonados desde producción (script `scripts/migrate-prod-to-dev-direct.sh`)
- **Seguro para experimentar**: cambios NO afectan producción
- Puedes borrar y recrear datos sin consecuencias

### OAuth Redirect URLs

Google OAuth configurado para:
- `https://vxhjzhwlyuiinpelpqae.supabase.co/auth/v1/callback`

## Ambiente de Testing

### Configuración

El ambiente de testing usa el archivo `tests/.env.test`.

```bash
# tests/.env.test
NEXT_PUBLIC_SUPABASE_URL=https://xgofutvrhfpywqhrrvlp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
GOOGLE_API_KEY=your_gemini_api_key
```

### Uso

```bash
# Tests unitarios y de componentes
npm test

# Tests E2E
npm run test:e2e
```

### Datos

- Usuarios de prueba creados programáticamente
- Base de datos limpia antes de cada suite de tests
- Datos aislados por test (cada test usa su propio contexto)

### OAuth Redirect URLs

Google OAuth configurado para:
- `https://xgofutvrhfpywqhrrvlp.supabase.co/auth/v1/callback`

## Ambiente de Producción

### Configuración

Las variables de entorno están configuradas en **Vercel** (no en archivos locales).

Se mantiene un backup en `.env.production` (NO se commitea a git):

```bash
# .env.production (BACKUP - NO USAR LOCALMENTE)
NEXT_PUBLIC_SUPABASE_URL=https://ovhzvwmiouaoilswgeef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
GOOGLE_API_KEY=your_gemini_api_key
```

### Despliegue

El despliegue a producción se hace automáticamente via Vercel cuando haces push a `main`:

```bash
git push origin main
```

Vercel detecta el push, ejecuta `npm run build` y despliega automáticamente.

### Datos

- **Datos reales de usuarios**
- ⚠️ **NUNCA experimentar directamente en producción**
- Cambios en el schema deben probarse primero en dev y test

### OAuth Redirect URLs

Google OAuth configurado para:
- `https://ovhzvwmiouaoilswgeef.supabase.co/auth/v1/callback`

## Scripts Útiles

### Migrar Datos de Prod a Dev

```bash
./scripts/migrate-prod-to-dev-direct.sh
```

Este script:
1. Hace dump del schema y datos de producción
2. Reemplaza los user IDs por los de desarrollo
3. Importa todo a la base de datos de desarrollo

**Nota**: Los datos de producción se clonan, NO se mueven. Producción no se afecta.

### Reemplazar User IDs

```bash
./scripts/replace-user-ids.sh
```

Este script toma el dump de producción (`scripts/prod-data.sql`) y genera una versión con los IDs de usuario actualizados para desarrollo (`scripts/prod-data-dev.sql`).

## Flujo de Trabajo Típico

### 1. Desarrollo de Nueva Feature

1. Trabaja localmente con `npm run dev` (usa proyecto dev)
2. Haz cambios en el código
3. Prueba manualmente en `http://localhost:3000`
4. Los cambios afectan SOLO tu proyecto dev

### 2. Testing

1. Escribe tests en `tests/`
2. Ejecuta `npm test` (tests unitarios/componentes)
3. Ejecuta `npm run test:e2e` (tests E2E con Playwright)
4. Los tests usan el proyecto test, completamente aislado

### 3. Migraciones de Base de Datos

Si necesitas cambiar el schema (agregar tablas, columnas, etc.):

1. Crea la migración en `supabase/migrations/`
2. Aplica primero en **dev** usando Supabase Dashboard o CLI
3. Prueba que todo funciona en dev
4. Aplica en **test** y verifica que los tests pasan
5. Cuando estés seguro, aplica en **prod**

**IMPORTANTE**: Nunca aplicar migraciones directamente en prod sin probar antes.

### 4. Despliegue a Producción

1. Asegúrate de que todos los tests pasan: `npm test && npm run test:e2e`
2. Haz commit de tus cambios: `git add . && git commit -m "feat: ..."`
3. Push a main: `git push origin main`
4. Vercel despliega automáticamente
5. Verifica que funciona en producción: visita la URL de Vercel

## Solución de Problemas

### Error: "redirect_uri_mismatch" en OAuth

Asegúrate de que el redirect URI esté configurado en Google Cloud Console:
- Dev: `https://vxhjzhwlyuiinpelpqae.supabase.co/auth/v1/callback`
- Test: `https://xgofutvrhfpywqhrrvlp.supabase.co/auth/v1/callback`
- Prod: `https://ovhzvwmiouaoilswgeef.supabase.co/auth/v1/callback`

### Error: "relation does not exist"

El schema no está aplicado. Opciones:
- Aplicar migraciones manualmente en Supabase Dashboard → SQL Editor
- Usar `./scripts/migrate-prod-to-dev-direct.sh` para clonar desde prod

### No puedo conectarme a la base de datos desde psql

Verifica:
1. El proyecto está **activo** (no pausado) en Supabase Dashboard
2. El password es correcto
3. Las conexiones directas están habilitadas (Dashboard → Settings → Database)
4. Tu IP no está bloqueada por Supabase

### Los datos de producción no se ven en dev

1. Verifica que el script `migrate-prod-to-dev-direct.sh` se ejecutó sin errores
2. Verifica que el usuario existe en `auth.users` (Dashboard → Authentication → Users)
3. Verifica que el usuario está asignado a una familia (`family_members` table)
4. Chequea las políticas RLS (Row Level Security) - deben permitir acceso basado en `family_id`

## Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `.env.local` | Variables de desarrollo (commitear con valores dummy) |
| `.env.production` | Backup de variables de prod (NO commitear) |
| `.env.example` | Template de variables de entorno |
| `tests/.env.test` | Variables de testing (commitear con valores reales) |
| `scripts/migrate-prod-to-dev-direct.sh` | Script para clonar datos de prod a dev |
| `scripts/replace-user-ids.sh` | Script para adaptar IDs de usuario |
| `.gitignore` | Asegúrate de que `.env.local` y `.env.production` están ignorados |

## Seguridad

### ¿Qué commitear a Git?

✅ **SÍ commitear:**
- `.env.example` (valores dummy)
- `tests/.env.test` (proyecto de test es público)

❌ **NO commitear:**
- `.env.local` (contiene keys del proyecto dev)
- `.env.production` (contiene keys de producción)
- Archivos SQL con dumps de producción (pueden contener datos sensibles)

### Service Role Keys

Las `SUPABASE_SERVICE_ROLE_KEY` son keys poderosas que **bypass RLS**. Nunca las expongas:
- NO las commits a git (excepto test que es público)
- NO las compartas públicamente
- USA SOLO en código del servidor (API routes, server components)

## Organizaciones Supabase

Los proyectos están distribuidos en dos organizaciones:

| Organización | Proyectos |
|--------------|-----------|
| **meal-planner** (cuenta original) | Producción, Testing |
| **meal-planner-dev** (cuenta nueva) | Desarrollo |

Esto permite tener 3 proyectos en el free tier (2 por organización + 1 en otra).

## Preguntas Frecuentes

### ¿Por qué no usar Supabase Branching?

Supabase Branching permite crear branches de tu proyecto, pero:
- Cuesta ~$2.70/mes adicional
- No es necesario para un proyecto de aprendizaje
- Múltiples proyectos gratis es más simple

### ¿Puedo usar el proyecto dev para tests E2E?

No se recomienda. Los tests E2E crean y borran datos constantemente, lo cual puede interferir con el desarrollo manual. Mantén test y dev separados.

### ¿Cómo sincronizo cambios de schema entre ambientes?

1. Haz el cambio en dev primero
2. Crea una migración SQL en `supabase/migrations/`
3. Aplica la migración en test
4. Cuando todo funcione, aplica en prod
5. Commitea la migración a git para que el equipo tenga el historial

### ¿Necesito regenerar tokens OAuth para cada ambiente?

No. Puedes usar el mismo Client ID de Google OAuth para todos los ambientes. Solo necesitas agregar los 3 redirect URIs al mismo Client ID.

Si prefieres máxima separación (para analytics, logs, etc.), puedes crear Client IDs separados por ambiente.

---

**Última actualización**: 2026-02-01
