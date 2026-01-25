/**
 * Node 4: Apply Modifications
 * Applies suggested modifications to the current plan programmatically
 */

import { PlanningAgentState, AgentLogEntry, PlanModification } from '@/types/agent'
import { WeeklyPlan } from '@/lib/weekly-planner'
import { FoodIngredient } from '@/types'

export async function applyModificationsNode(
  state: PlanningAgentState
): Promise<Partial<PlanningAgentState>> {
  const startTime = Date.now()

  // No modifications to apply
  if (state.modifications.length === 0) {
    const logEntry: AgentLogEntry = {
      step: 'apply_modifications',
      message: 'No modifications to apply',
      timestamp: new Date().toISOString(),
      data: {
        modifications_count: 0,
      },
    }

    return {
      agentLog: [...state.agentLog, logEntry],
    }
  }

  try {
    // Clone the current plan to avoid mutations
    const updatedPlan: WeeklyPlan = JSON.parse(JSON.stringify(state.currentPlan))
    let modificationsApplied = 0

    // Apply each modification
    for (const mod of state.modifications) {
      const applied = applyModificationToPlan(updatedPlan, mod, state.ingredients)
      if (applied) {
        modificationsApplied++
      }
    }

    const logEntry: AgentLogEntry = {
      step: 'apply_modifications',
      message: `Applied ${modificationsApplied}/${state.modifications.length} modifications`,
      timestamp: new Date().toISOString(),
      data: {
        modifications_applied: modificationsApplied,
        modifications_attempted: state.modifications.length,
        duration_ms: Date.now() - startTime,
      },
    }

    return {
      currentPlan: updatedPlan,
      iterationCount: state.iterationCount + 1,
      agentLog: [...state.agentLog, logEntry],
    }
  } catch (error) {
    const errorLog: AgentLogEntry = {
      step: 'apply_modifications',
      message: 'Error applying modifications',
      timestamp: new Date().toISOString(),
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }

    // On error, return current plan unchanged
    return {
      warnings: [
        ...state.warnings,
        'Could not apply modifications. Plan returned with violations.',
      ],
      agentLog: [...state.agentLog, errorLog],
    }
  }
}

/**
 * Apply a single modification to a plan
 * Returns true if successfully applied, false otherwise
 */
function applyModificationToPlan(
  plan: WeeklyPlan,
  modification: PlanModification,
  ingredients: FoodIngredient[]
): boolean {
  try {
    // Find the day and meal to modify
    const day = plan.days.find((d) => d.date === modification.day_date)
    if (!day) {
      console.warn(`[applyModification] Day not found: ${modification.day_date}`)
      return false
    }

    const meal = day.meals.find((m) => m.meal_type === modification.meal_type)
    if (!meal) {
      console.warn(
        `[applyModification] Meal not found: ${modification.meal_type} on ${modification.day_date}`
      )
      return false
    }

    // Verify that all new ingredients exist
    const newIngredients = ingredients.filter((ing) =>
      modification.new_ingredient_ids.includes(ing.id)
    )

    if (newIngredients.length !== modification.new_ingredient_ids.length) {
      console.warn(
        `[applyModification] Some ingredient IDs not found in available ingredients`
      )
      return false
    }

    // Apply the modification
    meal.ingredient_ids = modification.new_ingredient_ids
    meal.ingredients = newIngredients

    console.log(
      `[applyModification] Applied: ${modification.day_date} ${modification.meal_type} -> ${newIngredients.map((i) => i.name).join(', ')}`
    )

    return true
  } catch (error) {
    console.error('[applyModification] Error:', error)
    return false
  }
}
