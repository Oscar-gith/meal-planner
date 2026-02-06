/**
 * Planning Agent (Phase 2: Iterative Modifications)
 * Orchestrates AI-powered meal plan validation with automatic violation fixing
 *
 * Workflow:
 * - Generate base plan → Validate rules
 * - If violations: Suggest modifications → Apply → Loop back (max 3 iterations)
 * - If no violations or max iterations: Finalize
 */

import { FoodIngredient, Rule } from '@/types'
import { MealPattern } from '@/lib/meal-patterns'
import {
  PlanningAgentResult,
  PlanningAgentState,
  SSEEvent,
} from '@/types/agent'
import { PlanningConfig, WeeklyPlan } from '@/lib/weekly-planner'
import { createInitialState } from './state'
import {
  generateBasePlanNode,
  validateRulesNode,
  suggestModificationsNode,
  applyModificationsNode,
  finalizeNode,
} from './nodes'

/**
 * Run the planning agent (Phase 2: Iterative with auto-fixing)
 * Returns a complete planning result with violations automatically fixed
 *
 * @param existingPlan - Optional existing plan to start from (for retries)
 * @param onProgress - Optional callback for SSE progress updates
 */
export async function runPlanningAgent(
  config: PlanningConfig,
  ingredients: FoodIngredient[],
  patterns: MealPattern[],
  rules: Rule[],
  _userId: string,
  _familyId: string | null,
  existingPlan?: unknown,
  onProgress?: (event: SSEEvent) => void
): Promise<PlanningAgentResult> {
  const startTime = Date.now()

  // Create initial state
  let state: PlanningAgentState = createInitialState({
    config,
    ingredients,
    patterns,
    activeRules: rules,
  })

  console.log('[PlanningAgent] Starting workflow with', {
    rules: rules.length,
    ingredients: ingredients.length,
    patterns: patterns.length,
  })

  // Step 1: Generate base plan (or use existing plan for retries)
  if (existingPlan) {
    console.log('[PlanningAgent] Using existing plan (retry mode)')
    state.currentPlan = existingPlan as WeeklyPlan
    onProgress?.({ type: 'generating', message: 'Ajustando plan existente...' })
  } else {
    onProgress?.({ type: 'generating', message: 'Generando tu plan semanal...' })
    state = { ...state, ...(await generateBasePlanNode(state)) }
  }

  // Step 2-4: Validation loop (max 3 iterations)
  const MAX_ITERATIONS = 3

  while (state.iterationCount < MAX_ITERATIONS) {
    // Validate rules against current plan
    onProgress?.({
      type: 'validating',
      activeRulesCount: rules.length,
    })
    state = { ...state, ...(await validateRulesNode(state)) }

    // Check if we should continue fixing
    if (state.violations.length === 0) {
      console.log('[PlanningAgent] No violations found, stopping')
      break
    }

    console.log(
      `[PlanningAgent] Iteration ${state.iterationCount + 1}: Found ${state.violations.length} violations`
    )

    // Suggest modifications to fix violations
    state = { ...state, ...(await suggestModificationsNode(state)) }

    // If no modifications suggested, stop trying
    if (state.modifications.length === 0) {
      console.log('[PlanningAgent] No modifications suggested, stopping')
      break
    }

    // Apply modifications
    onProgress?.({
      type: 'fixing',
      changesCount: state.modifications.length,
      iteration: state.iterationCount + 1,
    })
    state = { ...state, ...(await applyModificationsNode(state)) }
  }

  // Final validation (if we haven't done it yet)
  if (state.iterationCount >= MAX_ITERATIONS && state.violations.length > 0) {
    console.log('[PlanningAgent] Max iterations reached')
    state = { ...state, ...(await validateRulesNode(state)) }
  }

  // Step 5: Finalize
  state = { ...state, ...(await finalizeNode(state)) }

  const totalDuration = Date.now() - startTime

  console.log('[PlanningAgent] Workflow complete:', {
    iterations: state.iterationCount,
    violations: state.violations?.length || 0,
    modifications: state.modifications?.length || 0,
    duration: totalDuration,
  })

  // Validate that we have a final plan
  if (!state.finalPlan) {
    throw new Error('Planning agent failed: no final plan generated')
  }

  // Calculate stats from final plan
  const stats = {
    total_meals: state.finalPlan.days.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, day: any) => sum + day.meals.length,
      0
    ),
    patterns_used: new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state.finalPlan.days.flatMap((day: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        day.meals.map((m: any) => m.pattern_id)
      )
    ).size,
    ingredients_used: new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state.finalPlan.days.flatMap((day: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        day.meals.flatMap((m: any) => m.ingredient_ids)
      )
    ).size,
  }

  // Build result
  const agentResult: PlanningAgentResult = {
    planningResult: {
      plan: state.finalPlan,
      warnings: state.warnings,
      stats,
    },
    agentLog: {
      iteration_count: state.iterationCount,
      total_duration_ms: totalDuration,
      violations_found: state.violations,
      modifications_applied: state.modifications,
      final_status: state.violations.length === 0 ? 'success' : 'max_iterations',
    },
  }

  return agentResult
}
