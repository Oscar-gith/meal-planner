/**
 * Node 1: Generate Base Plan
 * Uses the existing WeeklyPlanningEngine to create an algorithmic plan
 */

import { PlanningAgentState, AgentLogEntry } from '@/types/agent'
import { WeeklyPlanningEngine } from '@/lib/weekly-planner'

export async function generateBasePlanNode(
  state: PlanningAgentState
): Promise<Partial<PlanningAgentState>> {
  const startTime = Date.now()

  try {
    // Use existing planning engine
    const engine = new WeeklyPlanningEngine(
      state.ingredients,
      state.patterns,
      state.config
    )

    const result = engine.generatePlan()

    const logEntry: AgentLogEntry = {
      step: 'generate_base_plan',
      message: `Generated base plan with ${result.plan.days.length} days`,
      timestamp: new Date().toISOString(),
      data: {
        total_meals: result.stats.total_meals,
        patterns_used: result.stats.patterns_used,
        ingredients_used: result.stats.ingredients_used,
        duration_ms: Date.now() - startTime,
      },
    }

    return {
      currentPlan: result.plan,
      warnings: result.warnings,
      agentLog: [...state.agentLog, logEntry],
    }
  } catch (error) {
    // Log detailed error information
    console.error('[generateBasePlan] Error generating plan:', error)
    console.error('[generateBasePlan] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ingredientsCount: state.ingredients.length,
      patternsCount: state.patterns.length,
      config: state.config,
    })

    // Propagate error instead of returning null state
    throw new Error(
      `Failed to generate base plan: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
