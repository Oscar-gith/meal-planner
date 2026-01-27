/**
 * Gemini AI Client for Meal Planner
 * Handles all LLM interactions using Gemini 3 Flash
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { WeeklyPlan } from '@/lib/weekly-planner'
import { MealPattern } from '@/lib/meal-patterns'
import { Rule, FoodIngredient } from '@/types'
import { RuleViolation, PlanModification, RuleValidationResult } from '@/types/agent'
import { getPrompt } from '@/lib/prompts/prompt-loader'

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

// Gemini Flash model with JSON output
// Configurable via GEMINI_MODEL env var
// - gemini-2.5-flash: Latest free tier model (best performance) - for testing
// - gemini-2.0-flash-exp: Experimental, good reasoning - for production
// - gemini-flash-latest: Alias for latest stable flash model
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const model = genAI.getGenerativeModel({
  model: modelName,
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1, // Low temperature for consistent, factual responses
  },
})

/**
 * Validate a user-created rule to ensure it's relevant to meal planning
 * Rejects nonsense rules like "no plutonio" or "no adelantar por la derecha"
 */
export async function validateRuleText(
  ruleText: string,
  availableIngredients?: FoodIngredient[]
): Promise<RuleValidationResult> {
  const ingredientTypes = [
    'Proteína Desayuno',
    'Proteína Almuerzo',
    'Carb Desayuno',
    'Carb Almuerzo',
    'Verdura',
    'Ensalada',
    'Fruta',
    'Bebida',
    'Compuesto Desayuno',
    'Compuesto',
    'Completo Almuerzo',
  ]

  const prompt = getPrompt('validate-rule', {
    ruleText: ruleText,
    ingredientTypes: ingredientTypes.join(', '),
    availableIngredients: availableIngredients
      ? availableIngredients.map((i) => i.name).join(', ')
      : undefined,
  })

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text) as RuleValidationResult

    return {
      is_valid: parsed.is_valid || false,
      reason: parsed.reason || 'Unknown validation result',
      suggestion: parsed.suggestion,
      inferred_meal_type: parsed.inferred_meal_type,
      inferred_ingredients: parsed.inferred_ingredients || [],
    }
  } catch (error) {
    console.error('Error validating rule with Gemini:', error)
    // Fallback: accept the rule if LLM fails (fail open)
    return {
      is_valid: true,
      reason: 'Could not validate with AI, rule accepted by default',
    }
  }
}

/**
 * Validate a weekly plan against active user rules
 * Returns violations found
 */
export async function validatePlanAgainstRules(
  plan: WeeklyPlan,
  rules: Rule[]
): Promise<{ violations: RuleViolation[]; isValid: boolean }> {
  if (rules.length === 0) {
    return { violations: [], isValid: true }
  }

  const userRules = rules
    .map((r, i) => `${i + 1}. [${r.id}] ${r.rule_text}${r.meal_type ? ` (applies to: ${r.meal_type})` : ' (applies to all meals)'}`)
    .join('\n')

  const prompt = getPrompt('validate-plan', {
    weeklyPlan: JSON.stringify(plan, null, 2),
    userRules: userRules,
  })

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text) as { violations: RuleViolation[]; isValid: boolean }

    return {
      violations: parsed.violations || [],
      isValid: parsed.isValid !== false, // Default to true if not explicitly false
    }
  } catch (error) {
    console.error('Error validating plan with Gemini:', error)
    throw new Error('Failed to validate plan against rules')
  }
}

/**
 * Suggest plan modifications to fix rule violations
 * This is used in Phase 2 when implementing automatic modifications
 */
export async function suggestPlanModifications(
  violations: RuleViolation[],
  currentPlan: WeeklyPlan,
  ingredients: FoodIngredient[],
  patterns: MealPattern[]
): Promise<PlanModification[]> {
  if (violations.length === 0) {
    return []
  }

  const prompt = getPrompt('suggest-modifications', {
    violations: JSON.stringify(violations, null, 2),
    currentPlan: JSON.stringify(currentPlan, null, 2),
    availableIngredients: JSON.stringify(ingredients, null, 2),
    availablePatterns: JSON.stringify(patterns, null, 2),
  })

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text) as { modifications: PlanModification[] }

    return parsed.modifications || []
  } catch (error) {
    console.error('Error suggesting modifications with Gemini:', error)
    throw new Error('Failed to suggest plan modifications')
  }
}

/**
 * Count tokens used in a prompt (estimation)
 * Used for cost tracking
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token on average
  return Math.ceil(text.length / 4)
}
