#!/bin/bash
# Session Start Hook for Meal Planner
# This script runs automatically when a Claude Code session starts

# Add custom message to Claude's context
cat <<'EOF'
📋 CONTEXTO DE SESIÓN CARGADO

Documentos principales listos:
- docs/BACKLOG.md (tareas y prioridades)
- docs/IMPLEMENTATION-SUMMARY.md (estado técnico)
- CLAUDE.md (guía del proyecto)

💡 Recuerda: Lee BACKLOG.md y presenta opciones antes de comenzar a trabajar.
EOF

exit 0
