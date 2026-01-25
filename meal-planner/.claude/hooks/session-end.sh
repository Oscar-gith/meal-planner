#!/bin/bash
# Session End Hook for Meal Planner
# This script runs automatically when a Claude Code session ends

# Log session end time
echo "🔚 Sesión terminada: $(date '+%Y-%m-%d %H:%M:%S')" >> .claude/session-log.txt
echo "Duración: ${CLAUDE_SESSION_DURATION:-unknown}" >> .claude/session-log.txt
echo "---" >> .claude/session-log.txt

# Reminder message
cat <<'EOF'
⚠️  RECORDATORIO: Actualiza la documentación antes de salir

Ejecuta el prompt de cierre:
"Cierra sesión: actualiza docs con lo completado hoy, verifica consistencia, y sugiere commit si aplica."
EOF

exit 0
