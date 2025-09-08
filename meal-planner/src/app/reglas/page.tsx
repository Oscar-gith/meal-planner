'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Rule } from '@/types'

export default function ReglasPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadRules()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRules() {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('meal_type', { ascending: true })

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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Reglas de Planificación
        </h1>
        <p className="text-gray-600">
          Reglas que guían la generación automática de planes de comidas.
        </p>
      </div>

      {/* Rules by category */}
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
                    className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-400"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium">
                          {rule.rule_text}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            Método: {rule.validation_method}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            rule.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {rule.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay reglas configuradas
          </h3>
          <p className="text-gray-600">
            Agrega reglas para personalizar la planificación de comidas.
          </p>
        </div>
      )}
    </div>
  )
}