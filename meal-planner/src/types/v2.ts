// Type definitions for Meal Planner
// Current architecture: Ingredients → Patterns → Weekly Plans

// ============================================================================
// FOOD INGREDIENTS (Individual items)
// ============================================================================
export interface FoodIngredient {
  id: string
  name: string
  type: IngredientType
  description?: string
  tags?: string[]
  user_id: string
  created_at?: string
  updated_at?: string
}

export type IngredientType =
  | 'Fruta'
  | 'Carb'
  | 'Bebida'
  | 'Proteina'
  | 'Verdura'
  | 'Lacteo'
  | 'Huevos'
  | 'Granos'
  | 'Otro'

// ============================================================================
// MEAL COMBINATIONS (DEPRECATED - Not used in current pattern-based system)
// ============================================================================
// These types are kept for backwards compatibility with old code but are NOT
// part of the current architecture. The system now uses meal_patterns instead.

/** @deprecated Use meal_patterns system instead */
export interface MealCombination {
  id: string
  name: string
  meal_type: MealType
  ingredient_ids: string[]
  ingredients?: FoodIngredient[]  // Populated when fetched with join
  notes?: string
  is_favorite: boolean
  user_id: string
  created_at?: string
  updated_at?: string
}

export type MealType = 'Desayuno' | 'Almuerzo' | 'Onces' | 'Merienda'

// ============================================================================
// WEEKLY PLANS
// ============================================================================
export interface WeeklyPlan {
  id: string
  name: string
  start_date: string  // ISO date string
  end_date: string    // ISO date string
  include_weekends: boolean
  plan_data: PlanData
  user_id: string
  created_at?: string
  updated_at?: string
}

export interface PlanData {
  days: DayPlan[]
}

export interface DayPlan {
  date: string  // ISO date string
  day_name: string  // 'Lunes', 'Martes', etc.
  meals: {
    Desayuno?: string  // combination_id
    Almuerzo?: string  // combination_id
    Onces?: string     // combination_id
  }
}

// ============================================================================
// UI/Form types
// ============================================================================
export interface CreateIngredientForm {
  name: string
  type: IngredientType
  description?: string
  tags?: string[]
}

/** @deprecated Not used in current pattern-based system */
export interface CreateCombinationForm {
  name: string
  meal_type: MealType
  ingredient_ids: string[]
  notes?: string
  is_favorite?: boolean
}

export interface CreateWeeklyPlanForm {
  name: string
  start_date: string
  days: number  // 5 or 7
  include_weekends: boolean
}

// ============================================================================
// Extended types for UI (with populated relationships)
// ============================================================================

/** @deprecated Not used in current pattern-based system */
export interface MealCombinationWithIngredients extends MealCombination {
  ingredients: FoodIngredient[]
}

/** @deprecated Not used in current pattern-based system */
export interface DayPlanWithMeals {
  date: string
  day_name: string
  meals: {
    Desayuno?: MealCombinationWithIngredients
    Almuerzo?: MealCombinationWithIngredients
    Onces?: MealCombinationWithIngredients
  }
}

/** @deprecated Not used in current pattern-based system */
export interface WeeklyPlanDetailed extends Omit<WeeklyPlan, 'plan_data'> {
  days: DayPlanWithMeals[]
}
