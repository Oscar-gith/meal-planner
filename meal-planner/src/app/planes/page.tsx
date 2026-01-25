'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  WeeklyPlanningEngine,
  PlanningConfig,
  FoodIngredient,
  PlanningResult,
  createDefaultConfig,
  validatePlanningPrerequisites
} from '@/lib/weekly-planner'
import {
  MealPattern,
  PatternDistribution,
  getAvailablePatterns,
  countIngredientsByType
} from '@/lib/meal-patterns'
import Toast, { ToastType } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import PlanningProgressModal from '@/components/PlanningProgressModal'
import { useFamily } from '@/lib/hooks/useFamily'
import { Users } from 'lucide-react'
import { ConflictDetail, SSEEvent } from '@/types/agent'

interface SavedPlan {
  id: string
  name: string
  start_date: string
  end_date: string
  created_at: string
  user_id: string
  family_id?: string
}

interface MealEditorProps {
  meal: {
    meal_type: string
    pattern_id: string
    pattern_name: string
    ingredient_ids: string[]
    ingredients: FoodIngredient[]
  }
  ingredients: FoodIngredient[]
  onSave: (ingredientIds: string[]) => void
  onCancel: () => void
}

function MealEditor({ meal, ingredients, onSave, onCancel }: MealEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(meal.ingredient_ids)

  // Get ingredients that match the required types for this meal
  const requiredTypes = new Set<string>()
  meal.ingredients.forEach(ing => requiredTypes.add(ing.type))

  const availableIngredients = ingredients.filter(ing => requiredTypes.has(ing.type))

  const toggleIngredient = (ingredientId: string) => {
    if (selectedIds.includes(ingredientId)) {
      setSelectedIds(selectedIds.filter(id => id !== ingredientId))
    } else {
      setSelectedIds([...selectedIds, ingredientId])
    }
  }

  return (
    <div className="border-t pt-2 mt-2">
      <p className="text-xs text-gray-600 mb-2">Selecciona ingredientes:</p>
      <div className="space-y-1 max-h-48 overflow-y-auto mb-2">
        {availableIngredients.map((ingredient) => (
          <label
            key={ingredient.id}
            className="flex items-center text-xs cursor-pointer hover:bg-white/50 p-1 rounded"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(ingredient.id)}
              onChange={() => toggleIngredient(ingredient.id)}
              className="mr-2"
            />
            <span className="text-gray-700">
              {ingredient.name} <span className="text-gray-400">({ingredient.type})</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(selectedIds)}
          disabled={selectedIds.length === 0}
          className="flex-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

/**
 * Create pattern distributions from real database patterns
 */
function createDistributionsFromPatterns(patterns: MealPattern[]): Record<string, PatternDistribution[]> {
  const distributions: Record<string, PatternDistribution[]> = {}

  // Group patterns by meal type
  const patternsByMealType: Record<string, MealPattern[]> = {}
  for (const pattern of patterns) {
    if (!patternsByMealType[pattern.meal_type]) {
      patternsByMealType[pattern.meal_type] = []
    }
    patternsByMealType[pattern.meal_type].push(pattern)
  }

  // Create distributions for each meal type
  for (const [mealType, mealPatterns] of Object.entries(patternsByMealType)) {
    // Default percentages based on pattern name/order
    const percentages: Record<string, number[]> = {
      'Desayuno': [70, 30],      // Tradicional 70%, Compuesto 30%
      'Almuerzo': [60, 30, 10],  // Tradicional 60%, Compuesto 30%, Completo 10%
      'Onces': [60, 40]          // Tradicional 60%, Compuesto 40%
    }

    const defaultPercs = percentages[mealType] || []
    distributions[mealType] = mealPatterns
      .sort((a, b) => a.display_order - b.display_order)
      .map((pattern, index) => ({
        pattern_id: pattern.id,
        percentage: defaultPercs[index] || 0
      }))
  }

  return distributions
}

export default function PlanesPage() {
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generatedPlan, setGeneratedPlan] = useState<PlanningResult | null>(null)
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  // Data from database
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([])
  const [patterns, setPatterns] = useState<MealPattern[]>([])

  // Configuration
  const [config, setConfig] = useState<PlanningConfig>(createDefaultConfig(new Date()))

  // Edit mode
  const [editingMeal, setEditingMeal] = useState<{date: string, mealType: string} | null>(null)

  // Family hook
  const { family_id: familyId, family_name: familyName } = useFamily()

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    onConfirm: () => void
    type?: 'danger' | 'warning' | 'info'
  } | null>(null)

  // Planning progress modal (SSE)
  const [modalStatus, setModalStatus] = useState<
    'generating' | 'validating' | 'fixing' | 'success' | 'partial' | 'error' | 'closed'
  >('closed')
  const [modalMessage, setModalMessage] = useState<string>('')
  const [modalConflicts, setModalConflicts] = useState<ConflictDetail[]>([])
  const [modalErrorMessage, setModalErrorMessage] = useState<string>('')
  const [retryCount, setRetryCount] = useState<number>(0)

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type })
  }

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmDialog({ title, message, onConfirm, type })
  }

  // Modal callbacks
  const handleModalClose = () => {
    setModalStatus('closed')
    setRetryCount(0)
  }

  const handleModalRetry = () => {
    if (retryCount >= 2) {
      // Max retries reached (original + 2 retries = 3 total attempts)
      showToast('Máximo de intentos alcanzado. Edita el plan manualmente.', 'info')
      return
    }

    setRetryCount(retryCount + 1)
    // Retry with existing plan
    generatePlanWithSSE(generatedPlan?.plan)
  }

  const handleModalViewPlan = () => {
    setModalStatus('closed')
    setRetryCount(0)
    // Plan is already set in generatedPlan, just close modal
  }

  const supabase = createClient()

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      }
    }

    initUser()
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true)
    try {
      const [ingredientsResult, patternsResult, plansResult] = await Promise.all([
        supabase.from('food_ingredients').select('*'),
        supabase.from('meal_patterns').select('*').eq('is_system', true).order('display_order'),
        supabase.from('weekly_plans').select('id, name, start_date, end_date, created_at, user_id').order('created_at', { ascending: false }).limit(10)
      ])

      if (ingredientsResult.data) {
        setIngredients(ingredientsResult.data)
      }

      if (patternsResult.data) {
        setPatterns(patternsResult.data)

        // Update config distributions with real pattern IDs
        const realDistributions = createDistributionsFromPatterns(patternsResult.data)
        setConfig(prev => ({ ...prev, distributions: realDistributions }))
      }

      if (plansResult.data) {
        setSavedPlans(plansResult.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error cargando datos. Verifica la conexión con la base de datos.', 'error')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Generate plan with SSE progress updates
   */
  const generatePlanWithSSE = async (existingPlan?: unknown) => {
    setModalStatus('generating')
    setModalMessage('Generando tu plan semanal...')
    setModalConflicts([])
    setModalErrorMessage('')

    try {
      const response = await fetch('/api/planning/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          familyId,
          stream: true,
          existingPlan,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start planning')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Process SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data) as SSEEvent | { type: 'result'; data: unknown }

              if ('type' in event) {
                if (event.type === 'result') {
                  // Final result data
                  const result = event.data as {
                    planningResult: PlanningResult
                    agentLog: unknown
                  }
                  setGeneratedPlan(result.planningResult)
                } else if (event.type === 'generating') {
                  setModalStatus('generating')
                  setModalMessage(event.message)
                } else if (event.type === 'validating') {
                  setModalStatus('validating')
                  setModalMessage(`Revisando plan contra ${event.activeRulesCount} reglas activas...`)
                } else if (event.type === 'fixing') {
                  setModalStatus('fixing')
                  setModalMessage(`Aplicando ${event.changesCount} cambios en el plan`)
                } else if (event.type === 'success') {
                  setModalStatus('success')
                } else if (event.type === 'partial_success') {
                  setModalStatus('partial')
                  setModalConflicts(event.conflicts)
                } else if (event.type === 'error') {
                  setModalStatus('error')
                  setModalErrorMessage(event.message)
                }
              }
            } catch (parseError) {
              console.error('Error parsing SSE event:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('SSE error:', error)
      setModalStatus('error')
      setModalErrorMessage(error instanceof Error ? error.message : 'Error desconocido')
    }
  }

  const generatePlanInternal = async () => {
    // Validate prerequisites
    const validation = validatePlanningPrerequisites(ingredients, patterns)

    if (!validation.valid) {
      showToast(
        'No se puede generar el plan: ' + validation.errors.join(', '),
        'error'
      )
      return
    }

    setGenerating(true)
    try {
      // Check if there are active LLM rules
      const supabase = createClient()
      const { data: activeRules } = await supabase
        .from('rules')
        .select('id')
        .eq('family_id', familyId)
        .eq('is_active', true)
        .eq('validation_method', 'llm')

      // If there are active rules, use AI-powered planning with SSE
      if (activeRules && activeRules.length > 0 && familyId) {
        await generatePlanWithSSE()
        return
      }

      // Traditional planning (no rules or AI failed)
      const engine = new WeeklyPlanningEngine(ingredients, patterns, config)
      const result = engine.generatePlan()
      setGeneratedPlan(result)

      // Show warnings if any
      if (result.warnings.length > 0) {
        console.warn('Plan generated with warnings:', result.warnings)
        showToast('Plan generado con advertencias. Revisa la consola.', 'info')
      } else {
        showToast('Plan generado exitosamente', 'success')
      }

      console.log('Generated plan:', result)
    } catch (error) {
      console.error('Error generating plan:', error)
      showToast('Error generando el plan. Revisa la consola para más detalles.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleGeneratePlan = () => {
    // If there's already a plan, ask for confirmation
    if (generatedPlan) {
      showConfirm(
        'Plan existente',
        'Ya hay un plan generado. ¿Deseas generar uno nuevo?',
        () => {
          // Clear current plan first
          setGeneratedPlan(null)
          setEditingMeal(null)
          // Then generate new one
          generatePlanInternal()
        },
        'warning'
      )
    } else {
      generatePlanInternal()
    }
  }

  const handleClearPlan = () => {
    showConfirm(
      'Limpiar plan',
      '¿Estás seguro de que deseas limpiar el plan actual?',
      () => {
        setGeneratedPlan(null)
        setEditingMeal(null)
      },
      'warning'
    )
  }

  const handleSavePlan = async () => {
    if (!generatedPlan || !userId) return

    try {

      // Check if there's already a plan for this date range
      const { data: existingPlans, error: checkError } = await supabase
        .from('weekly_plans')
        .select('id, name, start_date, end_date')
        .eq('user_id', userId)
        .or(`start_date.lte.${generatedPlan.plan.end_date},end_date.gte.${generatedPlan.plan.start_date}`)

      if (checkError) throw checkError

      if (existingPlans && existingPlans.length > 0) {
        const existingPlan = existingPlans[0]
        const message = `Ya existe un plan para este período:\n\n"${existingPlan.name}"\n(${new Date(existingPlan.start_date).toLocaleDateString('es-ES')} - ${new Date(existingPlan.end_date).toLocaleDateString('es-ES')})`

        // Show confirmation and wait for user response
        return new Promise<void>((resolve) => {
          showConfirm(
            'Plan duplicado',
            message,
            async () => {
              try {
                // Delete the existing plan
                const { error: deleteError } = await supabase
                  .from('weekly_plans')
                  .delete()
                  .eq('id', existingPlan.id)

                if (deleteError) throw deleteError

                // Continue with saving
                const { error } = await supabase.from('weekly_plans').insert({
                  name: generatedPlan.plan.name,
                  start_date: generatedPlan.plan.start_date,
                  end_date: generatedPlan.plan.end_date,
                  plan_data: generatedPlan.plan,
                  user_id: userId,
                  family_id: familyId
                })

                if (error) throw error

                showToast('Plan guardado exitosamente', 'success')
                loadData()
                resolve()
              } catch (error) {
                console.error('Error saving plan:', error)
                showToast('Error guardando el plan', 'error')
              }
            },
            'warning'
          )
        })
      }

      const { error } = await supabase.from('weekly_plans').insert({
        name: generatedPlan.plan.name,
        start_date: generatedPlan.plan.start_date,
        end_date: generatedPlan.plan.end_date,
        plan_data: generatedPlan.plan,
        user_id: userId,
        family_id: familyId
      })

      if (error) throw error

      showToast('Plan guardado exitosamente', 'success')
      loadData() // Reload saved plans
    } catch (error) {
      console.error('Error saving plan:', error)
      showToast('Error guardando el plan', 'error')
    }
  }

  const handleViewPlan = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (error) throw error

      // Load the plan into the generated plan view
      setGeneratedPlan({
        plan: data.plan_data,
        warnings: [],
        stats: {
          patterns_used: {},
          total_meals: 0,
          ingredients_used: {},
          unavailable_patterns: []
        }
      })

      // Scroll to the plan view
      window.scrollTo({ top: 0, behavior: 'smooth' })
      showToast('Plan cargado exitosamente', 'success')
    } catch (error) {
      console.error('Error loading plan:', error)
      showToast('Error cargando el plan', 'error')
    }
  }

  const handleDeletePlan = (planId: string, planName: string) => {
    showConfirm(
      'Eliminar plan',
      `¿Estás seguro de que deseas eliminar el plan "${planName}"?`,
      async () => {
        try {
          const { error } = await supabase
            .from('weekly_plans')
            .delete()
            .eq('id', planId)

          if (error) throw error

          showToast('Plan eliminado exitosamente', 'success')
          loadData() // Reload saved plans
        } catch (error) {
          console.error('Error deleting plan:', error)
          showToast('Error eliminando el plan', 'error')
        }
      }
    )
  }

  const getPatternAvailability = (mealType: string) => {
    const ingredientTypeCount = countIngredientsByType(ingredients)
    return getAvailablePatterns(mealType, patterns, ingredientTypeCount)
  }

  const handleRegenerateMeal = (dayDate: string, mealType: string) => {
    if (!generatedPlan) return

    try {
      // Find the day and meal to regenerate
      const dayIndex = generatedPlan.plan.days.findIndex(d => d.date === dayDate)
      if (dayIndex === -1) return

      const day = generatedPlan.plan.days[dayIndex]
      const mealIndex = day.meals.findIndex(m => m.meal_type === mealType)
      if (mealIndex === -1) return

      const currentMeal = day.meals[mealIndex]

      // Get available patterns for this meal type
      const ingredientTypeCount = countIngredientsByType(ingredients)
      const availablePatterns = getAvailablePatterns(mealType, patterns, ingredientTypeCount)
        .filter(pa => pa.available)
        .map(pa => pa.pattern)

      if (availablePatterns.length === 0) {
        showToast(`No hay patrones disponibles para ${mealType}`, 'error')
        return
      }

      // Use the same pattern or pick a random one
      const pattern = availablePatterns.find(p => p.id === currentMeal.pattern_id) || availablePatterns[0]

      // Generate new ingredients for this meal (excluding current ones)
      const newIngredients: FoodIngredient[] = []
      for (const component of pattern.required_components) {
        const ingredientsOfType = ingredients.filter(ing => ing.type === component.type)

        // Filter out currently used ingredients
        const availableForSelection = ingredientsOfType.filter(
          ing => !currentMeal.ingredient_ids.includes(ing.id)
        )

        // If all are used, allow reusing
        const pool = availableForSelection.length > 0 ? availableForSelection : ingredientsOfType

        // Pick random ingredient(s)
        for (let i = 0; i < component.quantity; i++) {
          if (pool.length > 0) {
            const randomIndex = Math.floor(Math.random() * pool.length)
            newIngredients.push(pool[randomIndex])
            pool.splice(randomIndex, 1) // Remove to avoid duplicates in same meal
          }
        }
      }

      if (newIngredients.length === 0) {
        showToast('No se pudieron encontrar ingredientes alternativos', 'error')
        return
      }

      // Update the meal
      const newMeal = {
        ...currentMeal,
        ingredient_ids: newIngredients.map(i => i.id),
        ingredients: newIngredients
      }

      // Update the plan
      const newDays = [...generatedPlan.plan.days]
      newDays[dayIndex] = {
        ...day,
        meals: [
          ...day.meals.slice(0, mealIndex),
          newMeal,
          ...day.meals.slice(mealIndex + 1)
        ]
      }

      setGeneratedPlan({
        ...generatedPlan,
        plan: {
          ...generatedPlan.plan,
          days: newDays
        }
      })

      showToast('Comida regenerada exitosamente', 'success')

    } catch (error) {
      console.error('Error regenerating meal:', error)
      showToast('Error regenerando la comida', 'error')
    }
  }

  const handleEditMeal = (dayDate: string, mealType: string) => {
    setEditingMeal({ date: dayDate, mealType })
  }

  const handleSaveMealEdit = (dayDate: string, mealType: string, newIngredientIds: string[]) => {
    if (!generatedPlan) return

    const dayIndex = generatedPlan.plan.days.findIndex(d => d.date === dayDate)
    if (dayIndex === -1) return

    const day = generatedPlan.plan.days[dayIndex]
    const mealIndex = day.meals.findIndex(m => m.meal_type === mealType)
    if (mealIndex === -1) return

    const currentMeal = day.meals[mealIndex]
    const newIngredients = ingredients.filter(ing => newIngredientIds.includes(ing.id))

    const newMeal = {
      ...currentMeal,
      ingredient_ids: newIngredientIds,
      ingredients: newIngredients
    }

    const newDays = [...generatedPlan.plan.days]
    newDays[dayIndex] = {
      ...day,
      meals: [
        ...day.meals.slice(0, mealIndex),
        newMeal,
        ...day.meals.slice(mealIndex + 1)
      ]
    }

    setGeneratedPlan({
      ...generatedPlan,
      plan: {
        ...generatedPlan.plan,
        days: newDays
      }
    })

    setEditingMeal(null)
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Planificación Semanal
        </h1>
        <p className="text-gray-600">
          Genera planes semanales automáticos basados en patrones de comida y tus ingredientes disponibles.
        </p>
        {/* Family indicator */}
        {familyId && familyName && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
            <Users size={14} />
            Compartido con: {familyName}
          </div>
        )}
      </div>

      {/* Prerequisites check */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Estado del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Ingredientes:</span>
            <span className="ml-2 font-semibold text-blue-900">{ingredients.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Patrones:</span>
            <span className="ml-2 font-semibold text-blue-900">{patterns.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Planes guardados:</span>
            <span className="ml-2 font-semibold text-blue-900">{savedPlans.length}</span>
          </div>
        </div>
      </div>

      {/* Pattern availability section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Patrones Disponibles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Desayuno patterns */}
          <div>
            <h3 className="font-semibold text-yellow-800 mb-3">🌅 Desayuno</h3>
            <div className="space-y-2">
              {getPatternAvailability('Desayuno').map((pa) => (
                <div
                  key={pa.pattern.id}
                  className={`p-3 rounded-md border ${
                    pa.available
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {pa.available ? '✅' : '❌'} {pa.pattern.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{pa.pattern.description}</p>
                  {!pa.available && pa.missingTypes.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Faltan: {pa.missingTypes.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Almuerzo patterns */}
          <div>
            <h3 className="font-semibold text-green-800 mb-3">🍽️ Almuerzo</h3>
            <div className="space-y-2">
              {getPatternAvailability('Almuerzo').map((pa) => (
                <div
                  key={pa.pattern.id}
                  className={`p-3 rounded-md border ${
                    pa.available
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {pa.available ? '✅' : '❌'} {pa.pattern.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{pa.pattern.description}</p>
                  {!pa.available && pa.missingTypes.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Faltan: {pa.missingTypes.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Onces patterns */}
          <div>
            <h3 className="font-semibold text-blue-800 mb-3">☕ Onces</h3>
            <div className="space-y-2">
              {getPatternAvailability('Onces').map((pa) => (
                <div
                  key={pa.pattern.id}
                  className={`p-3 rounded-md border ${
                    pa.available
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {pa.available ? '✅' : '❌'} {pa.pattern.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{pa.pattern.description}</p>
                  {!pa.available && pa.missingTypes.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Faltan: {pa.missingTypes.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate new plan section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generar Nuevo Plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={(() => {
                const d = config.start_date
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
              })()}
              onChange={(e) => {
                // Parse date as local to avoid timezone offset issues
                // e.target.value is in format "YYYY-MM-DD"
                const [year, month, day] = e.target.value.split('-').map(Number)
                // Month is 0-indexed in JS Date, set time to noon to avoid DST issues
                const localDate = new Date(year, month - 1, day, 12, 0, 0)
                setConfig({...config, start_date: localDate})
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración
            </label>
            <select
              value={config.num_days}
              onChange={(e) => setConfig({...config, num_days: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="5">5 días (Lunes a Viernes)</option>
              <option value="7">7 días (Semana completa)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeticiones máximas
            </label>
            <select
              value={config.max_repetitions_per_week}
              onChange={(e) => setConfig({...config, max_repetitions_per_week: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="1">1 vez por semana</option>
              <option value="2">2 veces por semana</option>
              <option value="3">3 veces por semana</option>
              <option value="999">Sin límite</option>
            </select>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {generatedPlan.plan.name}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleClearPlan}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-medium"
              >
                🗑️ Limpiar
              </button>
              <button
                onClick={handleSavePlan}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-medium"
              >
                💾 Guardar Plan
              </button>
            </div>
          </div>

          {/* Warnings */}
          {generatedPlan.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Advertencias:</h4>
              <ul className="list-disc list-inside space-y-1">
                {generatedPlan.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Stats */}
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">📊 Estadísticas:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total comidas:</span>
                <span className="ml-2 font-semibold text-gray-900">{generatedPlan.stats.total_meals}</span>
              </div>
              <div>
                <span className="text-gray-600">Ingredientes únicos:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {Object.keys(generatedPlan.stats.ingredients_used).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Patrones usados:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {Object.keys(generatedPlan.stats.patterns_used).length}
                </span>
              </div>
            </div>
          </div>

          {/* Plan days */}
          <div className="grid gap-4">
            {generatedPlan.plan.days.map((day) => (
              <div key={day.date} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg text-gray-800 mb-3">
                  {day.day_name} - {(() => {
                    // Parse date string as local date (YYYY-MM-DD)
                    const [year, month, dayNum] = day.date.split('-').map(Number)
                    const localDate = new Date(year, month - 1, dayNum)
                    return localDate.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long'
                    })
                  })()}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {day.meals.map((meal) => {
                    const isEditing = editingMeal?.date === day.date && editingMeal?.mealType === meal.meal_type

                    return (
                      <div
                        key={meal.meal_type}
                        className={`rounded-md p-3 ${
                          meal.meal_type === 'Desayuno' ? 'bg-yellow-50' :
                          meal.meal_type === 'Almuerzo' ? 'bg-green-50' :
                          'bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-medium ${
                            meal.meal_type === 'Desayuno' ? 'text-yellow-800' :
                            meal.meal_type === 'Almuerzo' ? 'text-green-800' :
                            'text-blue-800'
                          }`}>
                            {meal.meal_type === 'Desayuno' ? '🌅' :
                             meal.meal_type === 'Almuerzo' ? '🍽️' :
                             '☕'} {meal.meal_type}
                          </h4>
                          <button
                            onClick={() => handleRegenerateMeal(day.date, meal.meal_type)}
                            className="text-xs px-2 py-1 rounded bg-white hover:bg-gray-100 border border-gray-300 transition-colors"
                            title="Regenerar esta comida"
                          >
                            🔄
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 italic">{meal.pattern_name}</p>

                        {isEditing ? (
                          <MealEditor
                            meal={meal}
                            ingredients={ingredients}
                            onSave={(newIngredientIds) => handleSaveMealEdit(day.date, meal.meal_type, newIngredientIds)}
                            onCancel={() => setEditingMeal(null)}
                          />
                        ) : (
                          <>
                            <ul className="space-y-1 mb-2">
                              {meal.ingredients.map((ingredient) => (
                                <li
                                  key={ingredient.id}
                                  className={`text-sm ${
                                    meal.meal_type === 'Desayuno' ? 'text-yellow-700' :
                                    meal.meal_type === 'Almuerzo' ? 'text-green-700' :
                                    'text-blue-700'
                                  }`}
                                >
                                  • {ingredient.name}
                                </li>
                              ))}
                            </ul>
                            <button
                              onClick={() => handleEditMeal(day.date, meal.meal_type)}
                              className="text-xs text-gray-600 hover:text-gray-800 underline"
                            >
                              Editar ingredientes
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing plans section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Planes Guardados
        </h2>

        {savedPlans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium mb-2">No hay planes guardados</h3>
            <p>Los planes que guardes aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPlans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-md p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(plan.start_date).toLocaleDateString('es-ES')} - {new Date(plan.end_date).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Creado: {new Date(plan.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewPlan(plan.id)}
                      className="bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 font-medium text-sm"
                      title="Ver plan"
                    >
                      👁️ Ver
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      className="bg-red-600 text-white py-2 px-3 rounded-md hover:bg-red-700 font-medium text-sm"
                      title="Eliminar plan"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm()
            setConfirmDialog(null)
          }}
          onCancel={() => setConfirmDialog(null)}
          type={confirmDialog.type}
        />
      )}

      {/* Planning progress modal (SSE) */}
      <PlanningProgressModal
        isOpen={modalStatus !== 'closed'}
        status={modalStatus}
        message={modalMessage}
        conflicts={modalConflicts}
        errorMessage={modalErrorMessage}
        onClose={handleModalClose}
        onRetry={retryCount < 2 ? handleModalRetry : undefined}
        onViewPlan={handleModalViewPlan}
      />
    </div>
  )
}