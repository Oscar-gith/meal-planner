#!/bin/bash
# Migrar datos de producción a desarrollo usando PostgreSQL directo
# No requiere autenticación de Supabase CLI - usa connection strings directas

set -e

echo "🔄 Migrando PROD → DEV usando PostgreSQL directo"
echo ""

# ============================================================================
# CONFIGURACIÓN - Edita estas variables
# ============================================================================

# Producción (cuenta original)
PROD_PROJECT_ID="your_prod_project_id"
PROD_DB_PASSWORD="your_prod_db_password"
PROD_HOST="db.${PROD_PROJECT_ID}.supabase.co"

# Desarrollo (cuenta nueva)
DEV_PROJECT_ID="your_dev_project_id"
DEV_DB_PASSWORD="your_dev_db_password"
DEV_HOST="db.${DEV_PROJECT_ID}.supabase.co"

# Función para URL-encodear passwords con caracteres especiales
urlencode() {
    local string="${1}"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="${c}" ;;
            * ) printf -v o '%%%02x' "'$c"
        esac
        encoded+="${o}"
    done
    echo "${encoded}"
}

# Connection strings con passwords URL-encodeadas
PROD_DB_URL="postgresql://postgres:$(urlencode "${PROD_DB_PASSWORD}")@${PROD_HOST}:5432/postgres"
DEV_DB_URL="postgresql://postgres:$(urlencode "${DEV_DB_PASSWORD}")@${DEV_HOST}:5432/postgres"

# ============================================================================
# Configurar PATH para PostgreSQL tools
# ============================================================================

# Agregar libpq al PATH si existe
if [ -d "/usr/local/opt/libpq/bin" ]; then
    export PATH="/usr/local/opt/libpq/bin:$PATH"
elif [ -d "/opt/homebrew/opt/libpq/bin" ]; then
    export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
fi

# Verificar que pg_dump está instalado
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump no está instalado"
    echo ""
    echo "Instálalo con:"
    echo "  brew install libpq"
    exit 1
fi

echo "✅ PostgreSQL tools encontrados: $(which pg_dump)"
echo ""

# ============================================================================
# PASO 1: Dump del schema de producción
# ============================================================================

echo "📦 Paso 1/3: Creando dump del SCHEMA de producción..."
pg_dump "${PROD_DB_URL}" \
  --schema-only \
  --no-owner \
  --no-acl \
  --schema=public \
  -f scripts/prod-schema.sql

echo "✅ Schema exportado: scripts/prod-schema.sql"
echo ""

# ============================================================================
# PASO 2: Dump de los DATOS de producción
# ============================================================================

echo "💾 Paso 2/3: Creando dump de DATOS de producción..."
pg_dump "${PROD_DB_URL}" \
  --data-only \
  --no-owner \
  --no-acl \
  --schema=public \
  --exclude-table=supabase_migrations \
  --inserts \
  --rows-per-insert=100 \
  -f scripts/prod-data.sql

echo "✅ Datos exportados: scripts/prod-data.sql"
echo ""

# ============================================================================
# PASO 3: Restaurar en desarrollo
# ============================================================================

echo "📤 Paso 3/3: Restaurando en desarrollo..."

echo "   → Aplicando schema..."
if PGPASSWORD="${DEV_DB_PASSWORD}" psql -h "${DEV_HOST}" -p 6543 -U postgres -d postgres -f scripts/prod-schema.sql 2>&1 | grep -v "NOTICE" | grep -E "(ERROR|FATAL|Connection refused|authentication failed)"; then
    echo ""
    echo "❌ Error al aplicar schema"
    echo "   Verifica que:"
    echo "   1. El proyecto dev esté ACTIVO (no pausado) en el dashboard"
    echo "   2. El password sea correcto"
    echo "   3. Las conexiones directas estén habilitadas"
    exit 1
fi

echo "   → Importando datos..."
if PGPASSWORD="${DEV_DB_PASSWORD}" psql -h "${DEV_HOST}" -p 6543 -U postgres -d postgres -f scripts/prod-data.sql 2>&1 | grep -v "NOTICE" | grep -E "(ERROR|FATAL|Connection refused|authentication failed)"; then
    echo ""
    echo "❌ Error al importar datos"
    exit 1
fi

echo ""
echo "✨ ¡Migración completada exitosamente!"
echo ""
echo "📊 Verifica en:"
echo "   Dev Dashboard: https://supabase.com/dashboard/project/${DEV_PROJECT_ID}/editor"
echo ""
echo "⚠️  Recuerda configurar OAuth redirect URLs en el proyecto dev"
echo ""
