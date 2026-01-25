'use client'

/**
 * Planning Progress Modal
 * Shows real-time progress updates during AI-powered plan generation
 * with user-friendly messages and conflict resolution UI
 */

import { ConflictDetail } from '@/types/agent'

interface PlanningProgressModalProps {
  isOpen: boolean
  status: 'generating' | 'validating' | 'fixing' | 'success' | 'partial' | 'error' | 'closed'
  message?: string
  conflicts?: ConflictDetail[]
  errorMessage?: string
  onClose: () => void
  onRetry?: () => void
  onViewPlan?: () => void
}

export default function PlanningProgressModal({
  isOpen,
  status,
  message,
  conflicts = [],
  errorMessage,
  onClose,
  onRetry,
  onViewPlan,
}: PlanningProgressModalProps) {
  if (!isOpen || status === 'closed') {
    return null
  }

  const isProcessing = status === 'generating' || status === 'validating' || status === 'fixing'
  const hasConflicts = status === 'partial' && conflicts.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {status === 'success' && 'Plan Generado'}
            {status === 'partial' && 'Plan Generado'}
            {status === 'error' && 'Error'}
            {isProcessing && 'Generando Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Processing state */}
          {isProcessing && (
            <div className="text-center">
              {/* Spinner */}
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>

              {/* Status message */}
              <p className="text-gray-700 text-base mb-2">
                {status === 'generating' && '🔄 Generando tu plan semanal...'}
                {status === 'validating' && '🔍 Revisando plan contra reglas activas...'}
                {status === 'fixing' && '🔧 Ajustando plan para cumplir las reglas...'}
              </p>

              {/* Additional message */}
              {message && <p className="text-gray-600 text-sm">{message}</p>}
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                Plan generado exitosamente
              </p>
              <p className="text-gray-600">
                Todas las reglas se cumplen correctamente
              </p>
            </div>
          )}

          {/* Partial success with conflicts */}
          {hasConflicts && (
            <div>
              <div className="flex items-start gap-3 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Plan generado con algunos conflictos pendientes
                  </p>
                  <p className="text-sm text-gray-600">
                    No pudimos ajustar automáticamente todos los conflictos. Revisa los
                    detalles a continuación y haz los cambios manualmente, o intenta
                    nuevamente.
                  </p>
                </div>
              </div>

              {/* Conflicts list */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    {/* Rule text */}
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-lg">📋</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Regla: &ldquo;{conflict.rule_text}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Affected meals */}
                    <div className="ml-7 space-y-2 mb-3">
                      {conflict.affected_meals.map((meal, mealIndex) => (
                        <div key={mealIndex} className="text-sm">
                          <p className="text-gray-700">
                            • <span className="font-medium">{meal.meal_type}</span> del{' '}
                            <span className="font-medium">{meal.day}</span>:{' '}
                            {meal.explanation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Suggestion */}
                    <div className="ml-7 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium text-blue-900">
                          → Sugerencia:
                        </span>{' '}
                        {conflict.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                Error al generar el plan
              </p>
              <p className="text-gray-600">{errorMessage || 'Ocurrió un error inesperado'}</p>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        {!isProcessing && (
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            {/* Retry button (only for partial success) */}
            {hasConflicts && onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Reintentar
              </button>
            )}

            {/* View plan button (for success or partial) */}
            {(status === 'success' || hasConflicts) && onViewPlan && (
              <button
                onClick={onViewPlan}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Ver Plan
              </button>
            )}

            {/* Close button (for error or as fallback) */}
            {(status === 'error' || (!onViewPlan && !hasConflicts)) && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cerrar
              </button>
            )}

            {/* Understood button (for partial with view plan) */}
            {hasConflicts && onViewPlan && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Entendido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
