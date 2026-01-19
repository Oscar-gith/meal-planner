# Testing Setup - Meal Planner

## ✅ Fase 1: Setup Completado

### Dependencias Instaladas
- ✅ Vitest 2.1.0 (unit/component tests)
- ✅ @testing-library/react 16.1.0
- ✅ @testing-library/jest-dom 6.6.0
- ✅ @testing-library/user-event 14.5.2
- ✅ Playwright 1.51.1 (E2E tests)
- ✅ jsdom 26.0.0
- ✅ @vitejs/plugin-react 4.3.4
- ✅ @vitest/coverage-v8 2.1.0

### Scripts Disponibles
```bash
npm run test              # Run unit/component tests
npm run test:ui           # Run tests with UI
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Run E2E tests with UI
npm run test:e2e:debug    # Run E2E tests in debug mode
```

### Estructura de Carpetas
```
tests/
├── setup.ts                          # Global test setup
├── .env.test.template               # Template for test environment variables
├── utils/
│   ├── supabase-mock.ts            # Supabase client mocking utilities
│   ├── auth-helpers.ts             # Authentication test helpers
│   └── db-helpers.ts               # Database test helpers
├── component/                       # Component tests
├── integration/                     # Integration tests
│   ├── auth/                       # Auth integration tests
│   └── collaboration/              # Collaboration integration tests
└── e2e/                            # End-to-end tests
    ├── auth/                       # Auth E2E tests
    └── collaboration/              # Collaboration E2E tests
```

### Archivos de Configuración
- ✅ `vitest.config.ts` - Vitest configuration
- ✅ `playwright.config.ts` - Playwright configuration
- ✅ `tests/setup.ts` - Global test setup

## 🔄 Siguiente Paso: Configurar Supabase Test Project

### TODO - Usuario:
1. **Crear proyecto de Supabase:**
   - Ir a https://supabase.com
   - Crear nuevo proyecto: "meal-planner-test"
   - Esperar 5-10 minutos a que se cree

2. **Copiar credenciales:**
   - URL del proyecto
   - `anon` key (pública)
   - `service_role` key (privada)

3. **Ejecutar migraciones:**
   - Copiar todos los archivos de `supabase/migrations/` al nuevo proyecto
   - Ejecutar en orden (001, 002, 003, etc.)
   - Verificar que las tablas y RLS policies estén creadas

4. **Configurar autenticación:**
   - Authentication > Providers > Email: Activar "Enable Email Signup"
   - Authentication > Email Templates: Configurar auto-confirm para testing
   - Authentication > Providers > Google: Configurar OAuth (opcional)

5. **Crear archivo de configuración:**
   - Copiar `tests/.env.test.template` a `tests/.env.test`
   - Completar con las credenciales del proyecto test
   - Crear manualmente 2 usuarios de test en Supabase:
     - testuser1@mealplanner.test / TestPassword123!
     - testuser2@mealplanner.test / TestPassword456!

## 📋 Fase 2: Tests de Autenticación (Próximo)

Una vez que el proyecto de Supabase esté configurado, continuaremos con:
- ✅ Component test para LoginPage
- ✅ E2E tests de login/logout
- ✅ E2E test crítico: Data Isolation (valida RLS)
- ✅ E2E test de session persistence

## 📋 Fase 3: Tests de Colaboración (Después)

- ✅ Integration test de RLS policies
- ✅ E2E test completo de colaboración multi-usuario

## 🎯 Objetivo Final

Validar que:
- ✅ Autenticación funciona correctamente
- ✅ Datos están aislados entre usuarios (RLS)
- ✅ Sistema de colaboración funciona end-to-end
- ✅ Permisos se respetan (owner vs collaborator)
