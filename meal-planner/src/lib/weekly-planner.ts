// Weekly Meal Planning Engine
// Generates meal plans based on available patterns and ingredients

import {
  MealPattern,
  MealPatternComponent,
  PatternDistribution,
  checkPatternAvailability,
  getAvailablePatterns,
  countIngredientsByType,
  calculatePatternOccurrences,
  normalizeDistribution,
  DEFAULT_PATTERN_DISTRIBUTIONS
} from './meal-patterns'

// ============================================
// Types
// ============================================

export interface FoodIngredient {
  id: string
  name: string
  type: string
  user_id: string
}

export interface DayMeal {
  date: string  // ISO date string
  day_name: string  // 'Lunes', 'Martes', etc.
  meal_type: string  // 'Desayuno', 'Almuerzo', 'Onces'
  pattern_id: string
  pattern_name: string
  ingredient_ids: string[]
  ingredients: FoodIngredient[]
}

export interface WeeklyPlan {
  id?: string
  name: string
  start_date: string  // ISO date string
  end_date: string  // ISO date string
  days: DayPlan[]
  user_id?: string
  created_at?: string
}

export interface DayPlan {
  date: string
  day_name: string
  meals: DayMeal[]
}

export interface PlanningConfig {
  start_date: Date
  num_days: number  // 5 or 7
  meal_types: string[]  // ['Desayuno', 'Almuerzo', 'Onces']
  distributions: Record<string, PatternDistribution[]>  // meal_type → distributions
  avoid_repeating_ingredients: boolean
  max_repetitions_per_week: number  // How many times same ingredient can appear
}

export interface PlanningResult {
  plan: WeeklyPlan
  warnings: string[]
  stats: PlanningStats
}

export interface PlanningStats {
  total_meals: number
  patterns_used: Record<string, number>  // pattern_id → count
  ingredients_used: Record<string, number>  // ingredient_id → count
  unavailable_patterns: string[]
}

// ============================================
// Weekly Planning Engine
// ============================================

export class WeeklyPlanningEngine {
  private ingredients: FoodIngredient[]
  private patterns: MealPattern[]
  private ingredientsByType: Record<string, FoodIngredient[]>
  private ingredientUsageCount: Map<string, number>
  private config: PlanningConfig

  constructor(
    ingredients: FoodIngredient[],
    patterns: MealPattern[],
    config: PlanningConfig
  ) {
    this.ingredients = ingredients
    this.patterns = patterns
    this.config = config
    this.ingredientsByType = this.groupIngredientsByType(ingredients)
    this.ingredientUsageCount = new Map()
  }

  /**
   * Generate a complete weekly meal plan
   */
  public generatePlan(): PlanningResult {
    const warnings: string[] = []
    const days: DayPlan[] = []
    const stats: PlanningStats = {
      total_meals: 0,
      patterns_used: {},
      ingredients_used: {},
      unavailable_patterns: []
    }

    // Reset usage tracking
    this.ingredientUsageCount.clear()

    // Generate days
    const startDate = this.config.start_date
    for (let i = 0; i < this.config.num_days; i++) {
      // Create date for this day by adding i days to start date
      // Use date components to avoid timezone issues
      const date = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i,
        12, 0, 0  // Noon to avoid DST issues
      )

      const dayPlan = this.generateDayPlan(date, warnings, stats)
      days.push(dayPlan)
    }

    const plan: WeeklyPlan = {
      name: this.generatePlanName(startDate),
      start_date: this.formatDate(startDate),
      end_date: this.formatDate(new Date(startDate.getTime() + (this.config.num_days - 1) * 24 * 60 * 60 * 1000)),
      days
    }

    return { plan, warnings, stats }
  }

  /**
   * Generate meals for a single day
   */
  private generateDayPlan(date: Date, warnings: string[], stats: PlanningStats): DayPlan {
    const dayName = this.getDayName(date)
    const meals: DayMeal[] = []

    for (const mealType of this.config.meal_types) {
      const meal = this.generateMeal(date, dayName, mealType, warnings, stats)
      if (meal) {
        meals.push(meal)
      }
    }

    return {
      date: this.formatDate(date),
      day_name: dayName,
      meals
    }
  }

  /**
   * Generate a single meal using pattern-based selection
   */
  private generateMeal(
    date: Date,
    dayName: string,
    mealType: string,
    warnings: string[],
    stats: PlanningStats
  ): DayMeal | null {
    // Get available patterns for this meal type
    const ingredientTypeCount = countIngredientsByType(this.ingredients)
    const availablePatterns = getAvailablePatterns(mealType, this.patterns, ingredientTypeCount)
      .filter(pa => pa.available)
      .map(pa => pa.pattern)

    if (availablePatterns.length === 0) {
      warnings.push(`No hay patrones disponibles para ${mealType} en ${dayName}`)
      return null
    }

    // Get distribution for this meal type
    const distributions = this.config.distributions[mealType] || []
    const availablePatternIds = new Set(availablePatterns.map(p => p.id))

    // Normalize distribution based on available patterns
    const normalizedDist = normalizeDistribution(distributions, availablePatternIds)

    if (normalizedDist.length === 0) {
      // Use first available pattern as fallback
      const pattern = availablePatterns[0]
      return this.generateMealFromPattern(date, dayName, mealType, pattern, warnings, stats)
    }

    // Select pattern based on distribution
    const selectedPattern = this.selectPatternByDistribution(
      availablePatterns,
      normalizedDist,
      stats
    )

    return this.generateMealFromPattern(date, dayName, mealType, selectedPattern, warnings, stats)
  }

  /**
   * Generate a meal from a specific pattern
   */
  private generateMealFromPattern(
    date: Date,
    dayName: string,
    mealType: string,
    pattern: MealPattern,
    warnings: string[],
    stats: PlanningStats
  ): DayMeal {
    const selectedIngredients: FoodIngredient[] = []

    // Select ingredients for each required component
    for (const component of pattern.required_components) {
      const ingredientsOfType = this.ingredientsByType[component.type] || []

      if (ingredientsOfType.length === 0) {
        warnings.push(
          `No hay ingredientes de tipo "${component.type}" para ${mealType} en ${dayName}`
        )
        continue
      }

      // Select ingredient(s) with least usage
      const selected = this.selectIngredientsWithLeastUsage(
        ingredientsOfType,
        component.quantity
      )

      selectedIngredients.push(...selected)
    }

    // Update usage counts
    for (const ingredient of selectedIngredients) {
      const currentCount = this.ingredientUsageCount.get(ingredient.id) || 0
      this.ingredientUsageCount.set(ingredient.id, currentCount + 1)

      stats.ingredients_used[ingredient.id] = (stats.ingredients_used[ingredient.id] || 0) + 1
    }

    // Update pattern usage
    stats.patterns_used[pattern.id] = (stats.patterns_used[pattern.id] || 0) + 1
    stats.total_meals++

    return {
      date: this.formatDate(date),
      day_name: dayName,
      meal_type: mealType,
      pattern_id: pattern.id,
      pattern_name: pattern.name,
      ingredient_ids: selectedIngredients.map(i => i.id),
      ingredients: selectedIngredients
    }
  }

  /**
   * Select a pattern based on distribution percentages
   */
  private selectPatternByDistribution(
    availablePatterns: MealPattern[],
    distributions: PatternDistribution[],
    stats: PlanningStats
  ): MealPattern {
    // Calculate target occurrences for each pattern
    const targetOccurrences = calculatePatternOccurrences(distributions, this.config.num_days)

    // Find pattern that is furthest behind its target
    let bestPattern = availablePatterns[0]
    let maxDeficit = -Infinity

    for (const pattern of availablePatterns) {
      const target = targetOccurrences[pattern.id] || 0
      const current = stats.patterns_used[pattern.id] || 0
      const deficit = target - current

      if (deficit > maxDeficit) {
        maxDeficit = deficit
        bestPattern = pattern
      }
    }

    return bestPattern
  }

  /**
   * Select ingredients with least usage to maximize variety
   */
  private selectIngredientsWithLeastUsage(
    ingredients: FoodIngredient[],
    quantity: number
  ): FoodIngredient[] {
    // Sort by usage count (least used first)
    const sorted = [...ingredients].sort((a, b) => {
      const usageA = this.ingredientUsageCount.get(a.id) || 0
      const usageB = this.ingredientUsageCount.get(b.id) || 0
      return usageA - usageB
    })

    // Apply max repetitions constraint if enabled
    if (this.config.avoid_repeating_ingredients) {
      const filtered = sorted.filter(ingredient => {
        const usage = this.ingredientUsageCount.get(ingredient.id) || 0
        return usage < this.config.max_repetitions_per_week
      })

      // If all ingredients are at max, use least used anyway
      const candidates = filtered.length > 0 ? filtered : sorted

      // Add randomization: shuffle candidates and take random selection
      return this.selectRandomSubset(candidates, quantity)
    }

    // Add randomization for non-constrained selection
    return this.selectRandomSubset(sorted, quantity)
  }

  /**
   * Select random subset from candidates, preferring earlier items
   * (which are less used) but adding some randomness
   */
  private selectRandomSubset(
    candidates: FoodIngredient[],
    quantity: number
  ): FoodIngredient[] {
    if (candidates.length <= quantity) {
      return candidates
    }

    // Take a larger pool from least used items (3x the needed quantity or all candidates)
    const poolSize = Math.min(quantity * 3, candidates.length)
    const pool = candidates.slice(0, poolSize)

    // Shuffle the pool and take the needed quantity
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, quantity)
  }

  /**
   * Group ingredients by type for fast lookup
   */
  private groupIngredientsByType(
    ingredients: FoodIngredient[]
  ): Record<string, FoodIngredient[]> {
    return ingredients.reduce((acc, ingredient) => {
      if (!acc[ingredient.type]) {
        acc[ingredient.type] = []
      }
      acc[ingredient.type].push(ingredient)
      return acc
    }, {} as Record<string, FoodIngredient[]>)
  }

  /**
   * Generate a name for the plan
   */
  private generatePlanName(startDate: Date): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const day = startDate.getDate()
    const month = monthNames[startDate.getMonth()]
    const year = startDate.getFullYear()

    return `Semana del ${day} de ${month} ${year}`
  }

  /**
   * Get day name in Spanish using pure date arithmetic (no timezone)
   * Uses Zeller's congruence algorithm
   */
  private getDayName(date: Date): string {
    const dayNames = ['Sábado', 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

    let year = date.getFullYear()
    let month = date.getMonth() + 1  // JS months are 0-indexed
    const day = date.getDate()

    // Zeller's algorithm: January and February are counted as months 13 and 14 of previous year
    if (month < 3) {
      month += 12
      year -= 1
    }

    // Zeller's formula
    const q = day
    const m = month
    const k = year % 100
    const j = Math.floor(year / 100)

    const h = (q + Math.floor(13 * (m + 1) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7

    return dayNames[h]
  }

  /**
   * Format date as YYYY-MM-DD in local timezone
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create default planning configuration with pattern distributions
 */
export function createDefaultConfig(startDate: Date): PlanningConfig {
  // Convert DEFAULT_PATTERN_DISTRIBUTIONS to the format expected by config
  // Format: { 'Desayuno': [{pattern_id: 'xxx', percentage: 70}, ...], ... }
  const distributions: Record<string, PatternDistribution[]> = {
    'Desayuno': [
      { pattern_id: 'Desayuno-1', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Desayuno-1'] || 70 },
      { pattern_id: 'Desayuno-2', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Desayuno-2'] || 30 }
    ],
    'Almuerzo': [
      { pattern_id: 'Almuerzo-1', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Almuerzo-1'] || 60 },
      { pattern_id: 'Almuerzo-2', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Almuerzo-2'] || 30 },
      { pattern_id: 'Almuerzo-3', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Almuerzo-3'] || 10 }
    ],
    'Onces': [
      { pattern_id: 'Onces-1', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Onces-1'] || 60 },
      { pattern_id: 'Onces-2', percentage: DEFAULT_PATTERN_DISTRIBUTIONS['Onces-2'] || 40 }
    ]
  }

  return {
    start_date: startDate,
    num_days: 7,
    meal_types: ['Desayuno', 'Almuerzo', 'Onces'],
    distributions,
    avoid_repeating_ingredients: true,
    max_repetitions_per_week: 2
  }
}

/**
 * Validate that a plan can be generated
 */
export function validatePlanningPrerequisites(
  ingredients: FoodIngredient[],
  patterns: MealPattern[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (ingredients.length === 0) {
    errors.push('No hay ingredientes disponibles')
  }

  if (patterns.length === 0) {
    errors.push('No hay patrones de comida configurados')
  }

  // Check if at least one pattern is available for each meal type
  const mealTypes = ['Desayuno', 'Almuerzo', 'Onces']
  const ingredientTypeCount = countIngredientsByType(ingredients)

  for (const mealType of mealTypes) {
    const available = getAvailablePatterns(mealType, patterns, ingredientTypeCount)
      .filter(pa => pa.available)

    if (available.length === 0) {
      errors.push(`No hay patrones disponibles para ${mealType}. Verifica que tengas ingredientes de todos los tipos necesarios.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
