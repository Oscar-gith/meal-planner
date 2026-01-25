/**
 * Types for AI Agent system
 * Used by LangGraph workflows for meal planning rule validation
 */

import { FoodIngredient, Rule } from './index'
import { WeeklyPlan, PlanningConfig } from '@/lib/weekly-planner'
import { MealPattern } from '@/lib/meal-patterns'

/**
 * Rule violation detected by the AI agent
 */
export interface RuleViolation {
  rule_id: string
  rule_text: string
  violation_type: 'repetition' | 'combination' | 'restriction' | 'frequency' | 'other'
  affected_meals: string[] // Format: "YYYY-MM-DD-MealType" (e.g., "2024-03-15-Almuerzo")
  explanation: string
  suggested_fix?: string
}

/**
 * Plan modification suggested/applied by the AI agent
 */
export interface PlanModification {
  day_date: string // ISO date string
  meal_type: string // 'Desayuno' | 'Almuerzo' | 'Onces'
  old_ingredient_ids: string[]
  new_ingredient_ids: string[]
  reason: string
}

/**
 * Agent execution log entry
 */
export interface AgentLogEntry {
  step: string
  message: string
  timestamp?: string
  data?: Record<string, unknown>
}

/**
 * Agent execution log stored in database
 */
export interface AgentLog {
  id: string
  user_id: string
  family_id?: string
  plan_id?: string

  // Execution metadata
  iteration_count: number
  total_duration_ms: number
  llm_provider: 'gemini' | 'openai'
  total_tokens_used: number

  // Agent state
  violations_found: RuleViolation[]
  modifications_applied: PlanModification[]
  final_status: 'success' | 'max_iterations' | 'error'
  error_message?: string

  created_at: string
}

/**
 * State for the LangGraph planning agent
 */
export interface PlanningAgentState {
  // Input
  config: PlanningConfig
  ingredients: FoodIngredient[]
  patterns: MealPattern[]
  activeRules: Rule[]

  // Working state
  currentPlan: WeeklyPlan | null
  violations: RuleViolation[]
  iterationCount: number
  modifications: PlanModification[]

  // Output
  finalPlan: WeeklyPlan | null
  warnings: string[]
  agentLog: AgentLogEntry[]
}

/**
 * Result from the planning agent
 */
export interface PlanningAgentResult {
  planningResult: {
    plan: WeeklyPlan
    warnings: string[]
    stats: {
      total_meals: number
      patterns_used: number
      ingredients_used: number
    }
  }
  agentLog: {
    iteration_count: number
    total_duration_ms: number
    violations_found: RuleViolation[]
    modifications_applied: PlanModification[]
    final_status: 'success' | 'max_iterations' | 'error'
    error_message?: string
  }
}

/**
 * Rule validation result (for validating rules when created)
 */
export interface RuleValidationResult {
  is_valid: boolean
  reason: string
  suggestion?: string
  inferred_meal_type?: string | null
  inferred_ingredients?: string[]
}

/**
 * Status of AI-powered planning process (for UI)
 */
export interface PlanningStatus {
  stage: 'idle' | 'generating' | 'validating' | 'adjusting' | 'complete' | 'error'
  message: string
  iteration?: number
}

/**
 * Conflict detail for user-friendly display
 * Similar to RuleViolation but formatted for end users
 */
export interface ConflictDetail {
  rule_text: string
  affected_meals: Array<{
    day: string // Day name (e.g., "Lunes", "Martes")
    meal_type: string // "Desayuno", "Almuerzo", "Onces"
    explanation: string // User-friendly explanation
  }>
  suggestion: string // What the user should do manually
}

/**
 * Server-Sent Events for real-time progress updates
 */

export interface SSEGeneratingEvent {
  type: 'generating'
  message: string
}

export interface SSEValidatingEvent {
  type: 'validating'
  activeRulesCount: number
}

export interface SSEFixingEvent {
  type: 'fixing'
  changesCount: number
  iteration: number
}

export interface SSESuccessEvent {
  type: 'success'
}

export interface SSEPartialSuccessEvent {
  type: 'partial_success'
  conflicts: ConflictDetail[]
}

export interface SSEErrorEvent {
  type: 'error'
  message: string
}

export type SSEEvent =
  | SSEGeneratingEvent
  | SSEValidatingEvent
  | SSEFixingEvent
  | SSESuccessEvent
  | SSEPartialSuccessEvent
  | SSEErrorEvent
