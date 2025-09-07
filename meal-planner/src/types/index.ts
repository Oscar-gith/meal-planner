// Core types for the meal planner application

export interface FoodItem {
  id: string
  meal_type: string  // 'Desayuno', 'Almuerzo', 'Onces', etc.
  subtype: string   // 'Huevos', 'Carb', 'Proteina', etc.
  name: string      // 'Huevos fritos', 'Pasta con pollo', etc.
  user_id: string
  created_at?: string
  updated_at?: string
}

export interface Rule {
  id: string
  meal_type?: string | null  // null = applies to all meal types
  rule_text: string         // Natural language rule
  parsed_rule?: ParsedRule | null
  validation_method: 'pattern' | 'llm' | 'manual'
  llm_interpretation?: string | null
  is_active: boolean
  user_id: string
  created_at?: string
  updated_at?: string
}

export interface ParsedRule {
  type: 'frequency' | 'combination' | 'restriction' | 'requirement' | 'day_restriction'
  conditions: Record<string, string | number | boolean>
  action: 'allow' | 'forbid' | 'require'
}

export interface MealPlan {
  id: string
  user_id: string
  week_start: string  // ISO date string
  plan_data: DailyMeals[]
  created_at?: string
}

export interface DailyMeals {
  date: string  // ISO date string
  day_name: string  // 'Lunes', 'Martes', etc.
  meals: {
    [mealType: string]: SelectedMeal[]
  }
}

export interface SelectedMeal {
  food_item: FoodItem
  selected_at: string
  user_modified?: boolean
}

export interface MealHistory {
  id: string
  user_id: string
  food_item_id: string
  meal_type: string
  served_date: string
  week_start: string
  user_rating?: number  // 1-5 scale
}

export interface PlanPreferences {
  days: number  // 5 for weekdays, 7 for full week
  includeWeekends: boolean
  includeMeriendas?: boolean  // afternoon snacks
  startDate: string  // ISO date string
}