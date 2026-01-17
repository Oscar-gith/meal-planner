# Meal Planner

Sistema de planificación de comidas con arquitectura modular de tres niveles: Ingredientes → Combinaciones → Planes Semanales.

## Características Actuales

- ✅ CRUD de ingredientes individuales con tipos personalizables
- ✅ Creación masiva de ingredientes (separados por `|`)
- ✅ CRUD de combinaciones/menús con validación inteligente
- ✅ Alertas de duplicación de tipos (ej: múltiples carbohidratos)
- ✅ Filtrado avanzado por tipo y búsqueda de texto
- ✅ Nombres automáticos para combinaciones
- ✅ Sistema de notificaciones moderno (toast)
- ✅ Interfaz responsive con Tailwind CSS

## Stack Tecnológico

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Base de Datos**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (próximamente)
- **Icons**: Lucide React

## Empezar

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno en `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
```

3. Ejecutar servidor de desarrollo:
```bash
npm run dev
```

4. Abrir [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
/src
  /app              # Páginas de Next.js App Router
    /ingredientes   # CRUD de ingredientes
    /combinaciones  # CRUD de menús/combinaciones
  /components       # Componentes reutilizables
    Toast.tsx
    ConfirmDialog.tsx
  /lib              # Lógica de negocio y utilidades
    /supabase       # Cliente de Supabase
    /meal-planner   # Motor de planificación
  /types            # Definiciones de TypeScript
/docs               # Documentación del proyecto
  BACKLOG.md        # Tareas pendientes y roadmap
```

## Documentación

Toda la documentación técnica se encuentra en la carpeta [/docs](./docs/):

- [BACKLOG.md](./docs/BACKLOG.md) - Tareas futuras y roadmap
- [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) - Guía de migración de datos
- Otros archivos históricos de desarrollo

## Próximas Características

Ver [docs/BACKLOG.md](./docs/BACKLOG.md) para la lista completa. Prioridades:

- 🔜 Sistema de autenticación multi-usuario
- 🔜 Login con Google OAuth
- 🔜 Página de gestión de tipos (ingredientes y comidas)
- 🔜 Motor de planificación semanal rediseñado
- 🔜 Modularización de código

## Deploy

El proyecto está configurado para deploy en [Vercel](https://vercel.com):

```bash
vercel deploy
```

Consulta la [documentación de Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying).
