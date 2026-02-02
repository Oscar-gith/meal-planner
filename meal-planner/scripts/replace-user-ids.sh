#!/bin/bash
# Script para reemplazar los user IDs de producción por el nuevo user ID de desarrollo
# Esto permite importar los datos manteniendo la integridad referencial

set -e

echo "🔄 Reemplazando user IDs de producción por ID de desarrollo..."
echo ""

# IDs de producción (a reemplazar)
OLD_ID_USER1="your_prod_user_id_1"
OLD_ID_USER2="your_prod_user_id_2"
OLD_ID_USER3="your_prod_user_id_3"

# Nuevo ID de desarrollo (creado manualmente en Supabase)
NEW_ID_DEV="your_dev_user_id"

# Archivo de entrada
INPUT_FILE="scripts/prod-data.sql"

# Archivo de salida
OUTPUT_FILE="scripts/prod-data-dev.sql"

# Verificar que el archivo de entrada existe
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo $INPUT_FILE"
    echo "   Ejecuta primero: ./scripts/migrate-prod-to-dev-direct.sh"
    exit 1
fi

echo "📝 Procesando $INPUT_FILE..."
echo ""
echo "Reemplazando:"
echo "  - User 1: $OLD_ID_USER1 → $NEW_ID_DEV"
echo "  - User 2: $OLD_ID_USER2 → $NEW_ID_DEV"
echo "  - User 3: $OLD_ID_USER3 → $NEW_ID_DEV"
echo ""

# Hacer los reemplazos usando sed
sed -e "s/$OLD_ID_USER1/$NEW_ID_DEV/g" \
    -e "s/$OLD_ID_USER2/$NEW_ID_DEV/g" \
    -e "s/$OLD_ID_USER3/$NEW_ID_DEV/g" \
    "$INPUT_FILE" > "$OUTPUT_FILE"

echo "✅ Archivo generado: $OUTPUT_FILE"
echo ""
echo "📊 Resumen de cambios:"
echo "   - User 1: $(grep -o "$OLD_ID_USER1" "$INPUT_FILE" | wc -l | tr -d ' ') ocurrencias reemplazadas"
echo "   - User 2: $(grep -o "$OLD_ID_USER2" "$INPUT_FILE" | wc -l | tr -d ' ') ocurrencias reemplazadas"
echo "   - User 3: $(grep -o "$OLD_ID_USER3" "$INPUT_FILE" | wc -l | tr -d ' ') ocurrencias reemplazadas"
echo ""
echo "Próximo paso:"
echo "  Importar el archivo a desarrollo:"
echo "  PGPASSWORD=\"your_dev_db_password\" /usr/local/opt/libpq/bin/psql -h db.your_dev_project_id.supabase.co -p 6543 -U postgres -d postgres -f $OUTPUT_FILE"
echo ""
