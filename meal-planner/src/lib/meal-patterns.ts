// Meal Pattern System - Core Definitions
// Based on docs/MEAL-PATTERNS-FINAL.md

// ============================================
// Types
// ============================================

export interface MealPatternComponent {
  type: string  // e.g., "Proteína Almuerzo", "Carb Desayuno", etc.
  quantity: number  // How many ingredients of this type are required
}

export interface MealPattern {
  id: string
  meal_type: string  // 'Desayuno', 'Almuerzo', 'Onces'
  name: string  // Human-readable name
  description: string
  required_components: MealPatternComponent[]
  is_system: boolean  // System patterns can't be deleted
  display_order: number
}

export interface PatternAvailability {
  pattern: MealPattern
  available: boolean
  missingTypes: string[]
  availableCount: Record<string, number>  // Type → count of available ingredients
}

// ============================================
// System Patterns Definition
// ============================================

export const SYSTEM_MEAL_PATTERNS: Omit<MealPattern, 'id'>[] = [
  // DESAYUNO
  {
    meal_type: 'Desayuno',
    name: 'Tradicional con Fruta',
    description: 'Proteína + Carb + Fruta',
    required_components: [
      { type: 'Proteína Desayuno', quantity: 1 },
      { type: 'Carb Desayuno', quantity: 1 },
      { type: 'Fruta', quantity: 1 }
    ],
    is_system: true,
    display_order: 1
  },
  {
    meal_type: 'Desayuno',
    name: 'Compuesto',
    description: 'Plato compuesto único',
    required_components: [
      { type: 'Compuesto Desayuno', quantity: 1 }
    ],
    is_system: true,
    display_order: 2
  },

  // ALMUERZO
  {
    meal_type: 'Almuerzo',
    name: 'Tradicional',
    description: 'Proteína + Carb + Verdura',
    required_components: [
      { type: 'Proteína Almuerzo', quantity: 1 },
      { type: 'Carb Almuerzo', quantity: 1 },
      { type: 'Verdura', quantity: 1 }
    ],
    is_system: true,
    display_order: 1
  },
  {
    meal_type: 'Almuerzo',
    name: 'Compuesto + Verdura',
    description: 'Plato compuesto con acompañamiento',
    required_components: [
      { type: 'Compuesto Almuerzo', quantity: 1 },
      { type: 'Verdura', quantity: 1 }
    ],
    is_system: true,
    display_order: 2
  },
  {
    meal_type: 'Almuerzo',
    name: 'Completo',
    description: 'Plato completo único',
    required_components: [
      { type: 'Completo Almuerzo', quantity: 1 }
    ],
    is_system: true,
    display_order: 3
  },

  // ONCES
  {
    meal_type: 'Onces',
    name: 'Tradicional',
    description: 'Carb + Bebida + Fruta',
    required_components: [
      { type: 'Carb Onces', quantity: 1 },
      { type: 'Bebida', quantity: 1 },
      { type: 'Fruta', quantity: 1 }
    ],
    is_system: true,
    display_order: 1
  },
  {
    meal_type: 'Onces',
    name: 'Compuesto + Fruta',
    description: 'Plato compuesto con fruta',
    required_components: [
      { type: 'Compuesto Onces', quantity: 1 },
      { type: 'Fruta', quantity: 1 }
    ],
    is_system: true,
    display_order: 2
  }
]

// ============================================
// Pattern Validation Logic
// ============================================

/**
 * Check if a pattern is available based on existing ingredients
 * A pattern is available if ALL required component types have at least one ingredient
 */
export function checkPatternAvailability(
  pattern: MealPattern,
  ingredientsByType: Record<string, number>
): PatternAvailability {
  const missingTypes: string[] = []
  const availableCount: Record<string, number> = {}

  for (const component of pattern.required_components) {
    const count = ingredientsByType[component.type] || 0
    availableCount[component.type] = count

    if (count === 0) {
      missingTypes.push(component.type)
    }
  }

  return {
    pattern,
    available: missingTypes.length === 0,
    missingTypes,
    availableCount
  }
}

/**
 * Get all available patterns for a specific meal type
 */
export function getAvailablePatterns(
  mealType: string,
  allPatterns: MealPattern[],
  ingredientsByType: Record<string, number>
): PatternAvailability[] {
  const patternsForMealType = allPatterns.filter(p => p.meal_type === mealType)

  return patternsForMealType
    .map(pattern => checkPatternAvailability(pattern, ingredientsByType))
    .sort((a, b) => a.pattern.display_order - b.pattern.display_order)
}

/**
 * Count ingredients by type from a list of ingredients
 */
export function countIngredientsByType(
  ingredients: Array<{ type: string }>
): Record<string, number> {
  return ingredients.reduce((acc, ingredient) => {
    acc[ingredient.type] = (acc[ingredient.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

// ============================================
// Pattern Distribution Logic
// ============================================

export interface PatternDistribution {
  pattern_id: string
  percentage: number
}

export interface MealTypeDistribution {
  meal_type: string
  distributions: PatternDistribution[]
}

/**
 * Calculate how many times each pattern should appear in a plan
 * based on percentage distribution
 */
export function calculatePatternOccurrences(
  distributions: PatternDistribution[],
  totalDays: number
): Record<string, number> {
  // Filter only available patterns (percentage > 0)
  const activeDistributions = distributions.filter(d => d.percentage > 0)

  if (activeDistributions.length === 0) {
    return {}
  }

  // Calculate occurrences for each pattern
  const occurrences: Record<string, number> = {}
  let assignedDays = 0

  // Sort by percentage descending to assign larger percentages first
  const sorted = [...activeDistributions].sort((a, b) => b.percentage - a.percentage)

  for (const dist of sorted) {
    const targetDays = Math.round((dist.percentage / 100) * totalDays)
    occurrences[dist.pattern_id] = targetDays
    assignedDays += targetDays
  }

  // Adjust if rounding caused mismatch
  if (assignedDays !== totalDays) {
    const diff = totalDays - assignedDays
    // Add/subtract from the pattern with highest percentage
    const mainPatternId = sorted[0].pattern_id
    occurrences[mainPatternId] += diff
  }

  return occurrences
}

/**
 * Normalize distribution percentages when some patterns are unavailable
 */
export function normalizeDistribution(
  distributions: PatternDistribution[],
  availablePatternIds: Set<string>
): PatternDistribution[] {
  // Filter only available patterns
  const available = distributions.filter(d => availablePatternIds.has(d.pattern_id))

  if (available.length === 0) {
    return []
  }

  // Calculate total percentage of available patterns
  const totalPercentage = available.reduce((sum, d) => sum + d.percentage, 0)

  if (totalPercentage === 0) {
    // Distribute equally if all percentages are 0
    const equalPercentage = 100 / available.length
    return available.map(d => ({ ...d, percentage: equalPercentage }))
  }

  // Normalize to 100%
  return available.map(d => ({
    ...d,
    percentage: (d.percentage / totalPercentage) * 100
  }))
}

// ============================================
// Default Distributions
// ============================================

export const DEFAULT_PATTERN_DISTRIBUTIONS: Record<string, number> = {
  // Desayuno: Equal distribution between available patterns
  'Desayuno-1': 70,  // Tradicional con Fruta
  'Desayuno-2': 30,  // Compuesto

  // Almuerzo: Prefer traditional, then compound, occasionally complete
  'Almuerzo-1': 60,  // Tradicional
  'Almuerzo-2': 30,  // Compuesto + Verdura
  'Almuerzo-3': 10,  // Completo

  // Onces: Equal distribution between traditional and compound+fruit
  'Onces-1': 60,  // Tradicional
  'Onces-2': 40   // Compuesto + Fruta
}
