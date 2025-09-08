'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FoodItem, Rule, PlanPreferences } from '@/types'
import { MealPlannerEngine, WeeklyPlan } from '@/lib/meal-planner/engine'

export default function PlanesPage() {
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<WeeklyPlan | null>(null)
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [preferences, setPreferences] = useState<PlanPreferences>({
    days: 5,
    includeWeekends: false,
    startDate: new Date().toISOString().split('T')[0]
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      const [foodsResult, rulesResult] = await Promise.all([
        supabase.from('food_items').select('*'),
        supabase.from('rules').select('*').eq('is_active', true)
      ])

      if (foodsResult.data) setFoods(foodsResult.data)
      if (rulesResult.data) setRules(rulesResult.data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleGeneratePlan = async () => {
    if (foods.length === 0) {
      alert('No hay alimentos cargados. Verifica la conexión con la base de datos.')
      return
    }

    setGenerating(true)
    try {
      // Create meal planner engine
      const engine = new MealPlannerEngine(foods, rules, [])
      
      // Generate plan
      const plan = engine.generateWeeklyPlan(preferences)
      setGeneratedPlan(plan)
      
      console.log('Generated plan:', plan)
    } catch (error) {
      console.error('Error generating plan:', error)
      alert('Error generando el plan. Revisa la consola.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Planes de Comidas
        </h1>
        <p className="text-gray-600">
          Genera y gestiona tus planes semanales de comidas automáticamente.
        </p>
      </div>

      {/* Generate new plan section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generar Nuevo Plan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de la semana
            </label>
            <select 
              value={preferences.days}
              onChange={(e) => setPreferences({...preferences, days: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="5">Lunes a Viernes (5 días)</option>
              <option value="7">Lunes a Domingo (7 días)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio
            </label>
            <input 
              type="date" 
              value={preferences.startDate}
              onChange={(e) => setPreferences({...preferences, startDate: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={preferences.includeWeekends}
              onChange={(e) => setPreferences({...preferences, includeWeekends: e.target.checked})}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
            />
            <span className="ml-2 text-sm text-gray-700">Incluir fines de semana</span>
          </label>
          <div className="text-sm text-gray-500">
            {foods.length} alimentos • {rules.length} reglas activas
          </div>
        </div>

        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {generating ? '🔄 Generando plan...' : '🗓️ Generar Plan Semanal'}
        </button>
      </div>

      {/* Generated plan display */}
      {generatedPlan && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Plan Generado - Semana del {new Date(generatedPlan.weekStart).toLocaleDateString('es-ES')}
          </h2>
          
          <div className="grid gap-4">
            {generatedPlan.days.map((day) => (
              <div key={day.date} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg text-gray-800 mb-3">
                  {day.day_name} ({new Date(day.date).toLocaleDateString('es-ES')})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Desayuno */}
                  <div className="bg-yellow-50 rounded-md p-3">
                    <h4 className="font-medium text-yellow-800 mb-2">🌅 Desayuno</h4>
                    <ul className="space-y-1">
                      {day.meals.Desayuno?.map((meal, idx) => (
                        <li key={idx} className="text-sm text-yellow-700">
                          • {meal.food_item.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Almuerzo */}
                  <div className="bg-green-50 rounded-md p-3">
                    <h4 className="font-medium text-green-800 mb-2">🍽️ Almuerzo</h4>
                    <ul className="space-y-1">
                      {day.meals.Almuerzo?.map((meal, idx) => (
                        <li key={idx} className="text-sm text-green-700">
                          • {meal.food_item.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Onces */}
                  <div className="bg-blue-50 rounded-md p-3">
                    <h4 className="font-medium text-blue-800 mb-2">🥙 Onces</h4>
                    <ul className="space-y-1">
                      {day.meals.Onces?.map((meal, idx) => (
                        <li key={idx} className="text-sm text-blue-700">
                          • {meal.food_item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing plans section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Planes Anteriores
        </h2>
        
        {!generatedPlan ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium mb-2">No hay planes generados</h3>
            <p>Genera tu primer plan de comidas para comenzar.</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Aquí aparecerán los planes guardados anteriormente.</p>
          </div>
        )}
      </div>
    </div>
  )
}