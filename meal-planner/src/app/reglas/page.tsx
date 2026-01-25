'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Rule } from '@/types'
import { RuleValidationResult } from '@/types/agent'

export default function ReglasPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [familyId, setFamilyId] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [ruleText, setRuleText] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<RuleValidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadUserAndRules()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUserAndRules() {
    try {
      // Get current user and family
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        return
      }

      // Get user's family
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single()

      if (familyMember) {
        setFamilyId(familyMember.family_id)
      }

      // Load rules
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading rules:', error)
      } else {
        setRules(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function validateRuleText() {
    if (ruleText.trim().length < 10) {
      setValidationResult({
        is_valid: false,
        reason: 'La regla debe tener al menos 10 caracteres',
        inferred_meal_type: null,
        suggestion: undefined
      })
      return
    }

    setValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch('/api/rules/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_text: ruleText })
      })

      const result = await response.json()

      if (response.ok) {
        setValidationResult(result)
      } else {
        setValidationResult({
          is_valid: false,
          reason: result.error || 'Error al validar la regla',
          inferred_meal_type: null,
          suggestion: undefined
        })
      }
    } catch (error) {
      console.error('Validation error:', error)
      setValidationResult({
        is_valid: false,
        reason: 'Error de conexión. Intenta de nuevo.',
        inferred_meal_type: null,
        suggestion: undefined
      })
    } finally {
      setValidating(false)
    }
  }

  async function createRule() {
    if (!validationResult?.is_valid || !familyId) {
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No user found')
      }

      const newRule = {
        rule_text: ruleText.trim(),
        meal_type: validationResult.inferred_meal_type,
        validation_method: 'llm' as const,
        llm_interpretation: validationResult.reason,
        is_active: true,
        user_id: user.id,
        family_id: familyId
      }

      const { error } = await supabase.from('rules').insert(newRule)

      if (error) {
        console.error('Error creating rule:', error)
        alert('Error al crear la regla')
        return
      }

      // Reset form and reload
      setRuleText('')
      setValidationResult(null)
      setShowForm(false)
      await loadUserAndRules()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear la regla')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleRule(ruleId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId)

      if (error) {
        console.error('Error toggling rule:', error)
        return
      }

      // Update local state
      setRules(rules.map(r => r.id === ruleId ? { ...r, is_active: !currentStatus } : r))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId)

      if (error) {
        console.error('Error deleting rule:', error)
        return
      }

      // Update local state
      setRules(rules.filter(r => r.id !== ruleId))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando reglas...</div>
      </div>
    )
  }

  const groupedRules = rules.reduce((acc, rule) => {
    const key = rule.meal_type || 'General'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(rule)
    return acc
  }, {} as Record<string, Rule[]>)

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reglas de Planificación
            </h1>
            <p className="text-gray-600">
              Define reglas personalizadas en lenguaje natural para guiar la generación automática de planes.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nueva Regla'}
          </button>
        </div>
      </div>

      {/* Create Rule Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-indigo-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Crear Nueva Regla
          </h2>

          <div className="space-y-4">
            {/* Rule text input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe tu regla en lenguaje natural
              </label>
              <textarea
                value={ruleText}
                onChange={(e) => setRuleText(e.target.value)}
                placeholder="Ejemplo: No repetir huevos hasta 2 días después"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Validate button */}
            <div className="flex gap-3">
              <button
                onClick={validateRuleText}
                disabled={validating || ruleText.trim().length < 10}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {validating ? 'Validando con IA...' : 'Validar Regla'}
              </button>
            </div>

            {/* Validation result */}
            {validationResult && (
              <div className={`p-4 rounded-lg border-2 ${
                validationResult.is_valid
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="text-2xl">
                    {validationResult.is_valid ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      validationResult.is_valid ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {validationResult.is_valid ? 'Regla válida' : 'Regla inválida'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      validationResult.is_valid ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {validationResult.reason}
                    </p>
                    {validationResult.inferred_meal_type && (
                      <p className="text-sm mt-2 text-green-600">
                        <strong>Tipo de comida detectado:</strong> {validationResult.inferred_meal_type}
                      </p>
                    )}
                    {validationResult.suggestion && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Sugerencia:</strong> {validationResult.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Create button (only show if valid) */}
            {validationResult?.is_valid && (
              <div className="pt-2">
                <button
                  onClick={createRule}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creando...' : 'Crear Regla'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules by category */}
      {Object.keys(groupedRules).length > 0 ? (
        <div className="grid gap-6">
          {Object.entries(groupedRules).map(([mealType, typeRules]) => (
            <div key={mealType} className="bg-white rounded-lg shadow-md">
              <div className="bg-indigo-50 px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-indigo-900">
                  {mealType}
                </h2>
                <p className="text-sm text-indigo-600">
                  {typeRules.length} regla{typeRules.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {typeRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`rounded-lg p-4 border-l-4 ${
                        rule.is_active
                          ? 'bg-gray-50 border-indigo-400'
                          : 'bg-gray-100 border-gray-300 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium">
                            {rule.rule_text}
                          </p>
                          {rule.llm_interpretation && (
                            <p className="mt-2 text-sm text-gray-600 italic">
                              IA: {rule.llm_interpretation}
                          </p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>
                              Método: {rule.validation_method}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              rule.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {rule.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleRule(rule.id, rule.is_active)}
                            className={`px-3 py-1 text-sm rounded ${
                              rule.is_active
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            } transition-colors`}
                          >
                            {rule.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="px-3 py-1 text-sm rounded bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-gray-400 text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay reglas configuradas
          </h3>
          <p className="text-gray-600 mb-4">
            Agrega reglas para personalizar la planificación de comidas con IA.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Crear primera regla
          </button>
        </div>
      )}
    </div>
  )
}