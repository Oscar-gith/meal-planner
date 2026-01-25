/**
 * LangGraph State Definition for Planning Agent
 */

import { PlanningAgentState } from '@/types/agent'

/**
 * Initial state factory
 */
export function createInitialState(partial: Partial<PlanningAgentState>): PlanningAgentState {
  return {
    config: partial.config!,
    ingredients: partial.ingredients || [],
    patterns: partial.patterns || [],
    activeRules: partial.activeRules || [],
    currentPlan: null,
    violations: [],
    iterationCount: 0,
    modifications: [],
    finalPlan: null,
    warnings: [],
    agentLog: [],
  }
}
