/**
 * Node 3: Suggest Modifications
 * Uses Gemini AI to suggest specific ingredient replacements to fix rule violations
 */

import { PlanningAgentState, AgentLogEntry } from '@/types/agent'
import { suggestPlanModifications } from '@/lib/llm/gemini-client'

export async function suggestModificationsNode(
  state: PlanningAgentState
): Promise<Partial<PlanningAgentState>> {
  const startTime = Date.now()

  // No violations to fix
  if (state.violations.length === 0) {
    const logEntry: AgentLogEntry = {
      step: 'suggest_modifications',
      message: 'No violations to fix',
      timestamp: new Date().toISOString(),
      data: {
        violations_count: 0,
      },
    }

    return {
      modifications: [],
      agentLog: [...state.agentLog, logEntry],
    }
  }

  // Check if we should stop (max iterations reached)
  if (state.iterationCount >= 3) {
    const logEntry: AgentLogEntry = {
      step: 'suggest_modifications',
      message: 'Max iterations reached, stopping',
      timestamp: new Date().toISOString(),
      data: {
        iterations: state.iterationCount,
      },
    }

    return {
      agentLog: [...state.agentLog, logEntry],
    }
  }

  try {
    // Use Gemini to suggest modifications
    const modifications = await suggestPlanModifications(
      state.violations,
      state.currentPlan!,
      state.ingredients,
      state.patterns
    )

    const logEntry: AgentLogEntry = {
      step: 'suggest_modifications',
      message: `Suggested ${modifications.length} modifications`,
      timestamp: new Date().toISOString(),
      data: {
        modifications_count: modifications.length,
        violations_addressed: state.violations.length,
        duration_ms: Date.now() - startTime,
      },
    }

    return {
      modifications,
      agentLog: [...state.agentLog, logEntry],
    }
  } catch (error) {
    const errorLog: AgentLogEntry = {
      step: 'suggest_modifications',
      message: 'Error suggesting modifications with AI',
      timestamp: new Date().toISOString(),
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }

    // On error, return no modifications (stop trying to fix)
    return {
      modifications: [],
      warnings: [
        ...state.warnings,
        'Could not suggest modifications with AI. Plan returned with violations.',
      ],
      agentLog: [...state.agentLog, errorLog],
    }
  }
}
