/**
 * Node 5: Finalize
 * Packages the final result with warnings from violations
 */

import { PlanningAgentState, AgentLogEntry } from '@/types/agent'

export async function finalizeNode(
  state: PlanningAgentState
): Promise<Partial<PlanningAgentState>> {
  const finalWarnings: string[] = [...state.warnings]

  // Add violations as warnings (Phase 1: we show violations but don't fix them)
  if (state.violations.length > 0) {
    finalWarnings.push(
      `Se encontraron ${state.violations.length} violaciones de reglas:`
    )

    state.violations.forEach((v, i) => {
      finalWarnings.push(
        `${i + 1}. ${v.rule_text}: ${v.explanation} (afecta: ${v.affected_meals.join(', ')})`
      )
    })
  }

  const logEntry: AgentLogEntry = {
    step: 'finalize',
    message: state.violations.length > 0
      ? `Plan finalized with ${state.violations.length} violations`
      : 'Plan finalized successfully',
    timestamp: new Date().toISOString(),
    data: {
      violations_count: state.violations.length,
      warnings_count: finalWarnings.length,
      iteration_count: state.iterationCount,
    },
  }

  return {
    finalPlan: state.currentPlan,
    warnings: finalWarnings,
    agentLog: [...state.agentLog, logEntry],
  }
}
