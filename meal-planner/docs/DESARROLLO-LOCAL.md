# Desarrollo Local - Separación de Ambientes

## Problema

Cuando ejecutas `npm run dev`, la app se conecta al proyecto de **producción** de Supabase. Si haces login en localhost, Supabase te redirecciona a la URL de producción configurada en el dashboard.

## Solución

Usar el proyecto de **test** para desarrollo local:

### 1. Configurar URLs en Supabase Dashboard (Proyecto de Test)

Ir a: [https://supabase.com/dashboard/project/xgofutvrhfpywqhrrvlp/auth/url-configuration](https://supabase.com/dashboard/project/xgofutvrhfpywqhrrvlp/auth/url-configuration)

**Site URL:**
```
http://localhost:3000
```

**Redirect URLs:** Agregar estas URLs (una por línea)
```
http://localhost:3000/**
http://localhost:3000/login/callback
http://localhost:3000/auth/callback
```

### 2. Usar comando de desarrollo con ambiente de test

En lugar de:
```bash
npm run dev  # ❌ Conecta a producción
```

Usar:
```bash
npm run dev:test  # ✅ Conecta a proyecto de test
```

El comando `dev:test` carga automáticamente las variables de `tests/.env.test` que apuntan al proyecto de test.

### 3. Verificar que funciona

1. Ejecutar `npm run dev:test`
2. Ir a http://localhost:3000/login
3. Hacer login con usuario de test:
   - Email: `testuser1@mealplanner.test`
   - Password: `TestPassword123!`
4. Verificar que NO redirecciona a producción
5. Verificar en consola del navegador que está usando URL de test:
   ```
   https://xgofutvrhfpywqhrrvlp.supabase.co  ← URL de test
   ```

## Ambientes Disponibles

| Ambiente | Comando | Variables | Proyecto Supabase |
|----------|---------|-----------|-------------------|
| **Desarrollo (Producción)** | `npm run dev` | `.env.local` | `ovhzvwmiouaoilswgeef` |
| **Desarrollo (Test)** | `npm run dev:test` | `tests/.env.test` | `xgofutvrhfpywqhrrvlp` |
| **Testing E2E** | `npm run test:e2e` | `tests/.env.test` | `xgofutvrhfpywqhrrvlp` |

## Notas Importantes

### ⚠️ NUNCA ejecutar migraciones en producción manualmente

- Migraciones en producción se aplican solo vía CI/CD o con extrema precaución
- Para testing local, usar siempre el proyecto de test

### Crear nuevos usuarios de test

Si necesitas más usuarios de test, crearlos en el Dashboard de Supabase (proyecto test):
1. Ir a: https://supabase.com/dashboard/project/xgofutvrhfpywqhrrvlp/auth/users
2. Click "Add User"
3. Email: `testuser3@mealplanner.test`
4. Password: `TestPassword789!`
5. **Desactivar "Confirm email"** para no tener que verificar email

### Resetear base de datos de test

Si necesitas resetear la DB de test:
```bash
# Conectar al proyecto de test
supabase link --project-ref xgofutvrhfpywqhrrvlp

# Resetear DB (CUIDADO: borra todos los datos)
supabase db reset
```

## FAQ

**P: ¿Por qué `npm run dev` conecta a producción?**
R: Porque el `.env.local` contiene las credenciales de producción. Es útil para desarrollar features nuevas y ver cómo funcionan con datos reales, pero NO se debe usar para testing destructivo.

**P: ¿Puedo cambiar `.env.local` para apuntar al proyecto de test?**
R: Sí, pero es mejor usar `npm run dev:test` y mantener `.env.local` apuntando a producción. Así evitas commits accidentales con cambios en `.env.local`.

**P: ¿Cómo sé a qué proyecto estoy conectado?**
R: Revisar la consola del navegador en Network tab. Las peticiones a Supabase mostrarán la URL del proyecto (ovhzvwmiouaoilswgeef = producción, xgofutvrhfpywqhrrvlp = test).

**P: ¿Puedo usar Supabase local development?**
R: Sí, pero requiere configuración adicional. Ver: https://supabase.com/docs/guides/cli/local-development
