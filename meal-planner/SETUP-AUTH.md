# Setup de Autenticación y Colaboración

Este documento contiene las instrucciones para configurar la autenticación real y el sistema de colaboración en Meal Planner.

## 📋 Prerequisitos

1. Proyecto de Supabase creado
2. Variables de entorno configuradas en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

## 🔧 Paso 1: Ejecutar Migraciones SQL

Ejecuta las siguientes migraciones en orden en el SQL Editor de Supabase:

### Migración 006: Sistema de Colaboradores
```bash
supabase/migrations/006_create_plan_collaborators.sql
```

Esta migración crea:
- Tabla `plan_collaborators` para gestionar colaboradores
- Políticas RLS actualizadas en `weekly_plans` para incluir colaboradores
- Trigger automático para crear registro de owner al crear plan
- Funciones helper: `is_plan_owner()`, `get_user_plan_role()`

### Migración 007: Función de Búsqueda de Usuarios
```bash
supabase/migrations/007_create_user_search_function.sql
```

Esta migración crea:
- Función `find_user_by_email(email)` para buscar usuarios de forma segura
- Permite agregar colaboradores por email

## 🔐 Paso 2: Configurar Proveedores de Autenticación en Supabase

### Email/Password (Ya habilitado por defecto)
1. Ve a Authentication > Settings en tu dashboard de Supabase
2. Verifica que "Email" esté habilitado
3. Configura opciones:
   - **Enable email confirmations**: Recomendado para producción
   - **Secure email change**: Habilitado
   - **Enable email OTP**: Opcional

### Google OAuth (Opcional pero recomendado)
1. Ve a Authentication > Providers en Supabase
2. Habilita "Google"
3. Necesitas crear OAuth credentials en Google Cloud Console:

   a. Ve a [Google Cloud Console](https://console.cloud.google.com/)

   b. Crea un nuevo proyecto o selecciona uno existente

   c. Habilita Google+ API:
      - APIs & Services > Library
      - Busca "Google+ API"
      - Click "Enable"

   d. Crea credenciales OAuth:
      - APIs & Services > Credentials
      - Click "Create Credentials" > "OAuth client ID"
      - Application type: "Web application"
      - Authorized redirect URIs:
        ```
        https://<tu-proyecto>.supabase.co/auth/v1/callback
        ```

   e. Copia Client ID y Client Secret

   f. En Supabase, pega:
      - Google Client ID
      - Google Client Secret

4. Guarda cambios

## 🚀 Paso 3: Verificar Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

## ✅ Paso 4: Probar la Aplicación

### 1. Iniciar desarrollo
```bash
npm run dev
```

### 2. Probar flujo de registro
1. Abre http://localhost:3000
2. Click en "Iniciar sesión"
3. Crea una cuenta nueva con email/password o Google
4. Verifica que aparezca tu email en el header

### 3. Probar creación de ingredientes y planes
1. Ve a "Ingredientes"
2. Crea algunos ingredientes
3. Ve a "Planes"
4. Genera y guarda un plan

### 4. Probar colaboración
1. Crea una segunda cuenta (otro email)
2. Con la primera cuenta:
   - Ve a un plan guardado
   - Click en "👥 Colaborar"
   - Agrega el email del segundo usuario
3. Con la segunda cuenta:
   - Inicia sesión
   - Ve a "Planes"
   - Deberías ver el plan compartido

## 🔒 Paso 5: Configurar RLS Policies (Ya hecho)

Las políticas RLS ya están configuradas en las migraciones, pero verifica que estén activas:

### weekly_plans
- ✅ Users can view plans they own or collaborate on
- ✅ Users can insert their own plans
- ✅ Users can update plans they own or collaborate on
- ✅ Only owners can delete plans

### plan_collaborators
- ✅ Users can view collaborators of their plans
- ✅ Plan owners can add collaborators
- ✅ Plan owners can remove collaborators

### food_ingredients
- ✅ Users can view their own ingredients
- ✅ Users can insert their own ingredients
- ✅ Users can update their own ingredients
- ✅ Users can delete their own ingredients

## 📝 Notas Importantes

### Seguridad
- ✅ Todas las rutas protegidas con middleware
- ✅ RLS habilitado en todas las tablas
- ✅ Función de búsqueda de usuarios usa SECURITY DEFINER
- ✅ Solo usuarios confirmados pueden ser agregados como colaboradores

### Limitaciones Actuales
- Los colaboradores pueden editar planes pero no eliminarlos
- Solo el owner puede agregar/quitar colaboradores
- Los patrones de comida son compartidos (is_system = true)

### Próximos Pasos Recomendados
1. Configurar email templates personalizados en Supabase
2. Agregar página de perfil de usuario
3. Implementar notificaciones cuando te agregan como colaborador
4. Agregar paginación a lista de planes guardados

## 🐛 Troubleshooting

### Error: "find_user_by_email is not a function"
- Verifica que ejecutaste la migración 007
- Revisa que la función tenga GRANT EXECUTE TO authenticated

### Error: "No se encontró un usuario con ese email"
- Verifica que el usuario esté registrado
- Verifica que el email esté confirmado (email_confirmed_at NOT NULL)

### Error: "Row Level Security policy violation"
- Verifica que las políticas RLS estén habilitadas
- Revisa los logs de Supabase para más detalles

### Usuario no puede ver plan compartido
- Verifica que el collaborator fue agregado correctamente
- Revisa la tabla plan_collaborators en Supabase
- Verifica que las políticas RLS incluyan la query de colaboradores

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del navegador (Console)
2. Revisa los logs de Supabase (Logs > API)
3. Verifica que todas las migraciones se ejecutaron correctamente
4. Consulta la documentación de Supabase: https://supabase.com/docs

---

**¡Listo!** Tu aplicación ahora tiene autenticación real y sistema de colaboración multi-usuario.
