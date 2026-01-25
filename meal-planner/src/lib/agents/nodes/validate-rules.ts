/**
 * Node 2: Validate Rules
 * Uses Gemini AI to check if the plan violates any active rules
 */

import { PlanningAgentState, AgentLogEntry } from '@/types/agent'
import { validatePlanAgainstRules } from '@/lib/llm/gemini-client'

export async function validateRulesNode(
  state: PlanningAgentState
): Promise<Partial<PlanningAgentState>> {
  const startTime = Date.now()

  // No plan or no rules to validate
  if (!state.currentPlan || state.activeRules.length === 0) {
    const logEntry: AgentLogEntry = {
      step: 'validate_rules',
      message: 'No rules to validate or no plan available',
      timestamp: new Date().toISOString(),
      data: {
        has_plan: !!state.currentPlan,
        rules_count: state.activeRules.length,
      },
    }

    return {
      violations: [],
      agentLog: [...state.agentLog, logEntry],
    }
  }

  try {
    // Validate plan against all active rules
    const { violations, isValid } = await validatePlanAgainstRules(
      state.currentPlan,
      state.activeRules
    )

    const logEntry: AgentLogEntry = {
      step: 'validate_rules',
      message: `Found ${violations.length} rule violations`,
      timestamp: new Date().toISOString(),
      data: {
        violations_count: violations.length,
        is_valid: isValid,
        duration_ms: Date.now() - startTime,
        rules_checked: state.activeRules.length,
      },
    }

    return {
      violations,
      agentLog: [...state.agentLog, logEntry],
    }
  } catch (error) {
    const errorLog: AgentLogEntry = {
      step: 'validate_rules',
      message: 'Error validating rules with AI',
      timestamp: new Date().toISOString(),
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }

    // On error, return no violations (fail open)
    return {
      violations: [],
      warnings: [...state.warnings, 'Could not validate rules with AI'],
      agentLog: [...state.agentLog, errorLog],
    }
  }
}
