/**
 * Gemini AI Client for Meal Planner
 * Handles all LLM interactions using Gemini 3 Flash
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { WeeklyPlan } from '@/lib/weekly-planner'
import { MealPattern } from '@/lib/meal-patterns'
import { Rule, FoodIngredient } from '@/types'
import { RuleViolation, PlanModification, RuleValidationResult } from '@/types/agent'

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

  const ingredientNames = availableIngredients
    ? availableIngredients.map((i) => i.name).join(', ')
    : 'N/A'

  const prompt = `You are a meal planning rules validator. Validate if a user-created rule is relevant and applicable to meal planning.

USER RULE:
"${ruleText}"

AVAILABLE INGREDIENT TYPES:
${ingredientTypes.join(', ')}

${availableIngredients ? `AVAILABLE INGREDIENT NAMES:\n${ingredientNames}` : ''}

MEAL TYPES:
- Desayuno (breakfast)
- Almuerzo (lunch)
- Onces (afternoon snack)

VALID rules talk about:
- Food ingredients or ingredient types (e.g., "huevos", "arroz", "Proteína", "Carb")
- Meal patterns or combinations
- Repetition/frequency of foods (e.g., "no repetir X hasta Y días después", "máximo N veces por semana")
- Days of the week (e.g., "no pescado los viernes")
- Nutritional concerns (e.g., "evitar mucho carb")
- Specific meals (e.g., "no huevos en el almuerzo")

INVALID rules talk about:
- Non-food items (plutonio, metal, plastic, cars, etc.)
- Unrelated topics (traffic rules like "no adelantar por la derecha", sports, politics)
- Impossible or nonsensical constraints
- Vague statements without actionable meaning

Task: Determine if this rule is valid for meal planning.

Output JSON with this exact structure:
{
  "is_valid": boolean,
  "reason": "detailed explanation of why it's valid or invalid",
  "suggestion": "if invalid, suggest a corrected version or similar valid rule (optional)",
  "inferred_meal_type": "Desayuno|Almuerzo|Onces|null (null if applies to all meals)",
  "inferred_ingredients": ["array of ingredient names mentioned in the rule"]
}

Examples:
- "no agregar plutonio al almuerzo" → is_valid: false, reason: "Plutonio is not a food ingredient"
- "no adelantar por la derecha" → is_valid: false, reason: "This is a traffic rule, not related to meal planning"
- "no repetir huevos hasta 2 días después" → is_valid: true, reason: "Valid repetition rule for eggs"
- "máximo 2 veces arroz por semana" → is_valid: true, reason: "Valid frequency limit for rice"
`

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

  const prompt = `You are a meal planning validator. Analyze this weekly plan against user rules and identify ALL violations.

WEEKLY PLAN:
${JSON.stringify(plan, null, 2)}

USER RULES:
${rules.map((r, i) => `${i + 1}. [${r.id}] ${r.rule_text}${r.meal_type ? ` (applies to: ${r.meal_type})` : ' (applies to all meals)'}`).join('\n')}

Task: Identify ALL rule violations. For each violation, specify:
1. Which rule was broken (use the rule ID)
2. Which meals are affected (format: "YYYY-MM-DD-MealType")
3. Why it's a violation (be specific about what ingredient or pattern violates the rule)
4. Suggested fix (what could be changed to fix it)

IMPORTANT:
- Check each rule against the entire plan carefully
- A repetition rule like "no repetir X hasta Y días después" means there must be Y full days between occurrences
- If a rule mentions a specific ingredient or type, check if it appears in the plan
- Be thorough but only report actual violations

Output JSON with this exact structure:
{
  "violations": [
    {
      "rule_id": "uuid-of-rule",
      "rule_text": "the rule text",
      "violation_type": "repetition|combination|restriction|frequency|other",
      "affected_meals": ["2024-03-15-Almuerzo", "2024-03-16-Almuerzo"],
      "explanation": "detailed explanation of why this violates the rule",
      "suggested_fix": "what should be changed to fix it"
    }
  ],
  "isValid": boolean (true if no violations, false if any violations found)
}

If there are no violations, return:
{
  "violations": [],
  "isValid": true
}
`

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

  const prompt = `You are a meal planning assistant. Fix these rule violations by suggesting specific ingredient replacements.

VIOLATIONS TO FIX:
${JSON.stringify(violations, null, 2)}

CURRENT PLAN:
${JSON.stringify(currentPlan, null, 2)}

AVAILABLE INGREDIENTS:
${JSON.stringify(ingredients, null, 2)}

AVAILABLE PATTERNS:
${JSON.stringify(patterns, null, 2)}

Task: For each violation, suggest specific ingredient replacements that:
1. Fix the rule violation
2. Use ONLY available ingredients from the provided list (match by exact ID)
3. Match the meal pattern requirements for that meal type
4. Maintain variety (don't just use the same replacement everywhere)

Output JSON with this exact structure:
{
  "modifications": [
    {
      "day_date": "YYYY-MM-DD",
      "meal_type": "Desayuno|Almuerzo|Onces",
      "old_ingredient_ids": ["uuid1", "uuid2"],
      "new_ingredient_ids": ["uuid3", "uuid4"],
      "reason": "explanation of why this change fixes the violation"
    }
  ]
}

IMPORTANT:
- new_ingredient_ids must be actual UUIDs from the available ingredients list
- Make sure the number and types of new ingredients match the pattern requirements
- If you can't find a suitable replacement, skip that violation (don't include it in modifications)
`

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
