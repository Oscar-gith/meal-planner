// Type definitions for Meal Planner V3
// Three-level architecture: Ingredients → Dishes → Menus

// ============================================================================
// LEVEL 1: INGREDIENTS (atomic units)
// ============================================================================

export interface FoodIngredient {
  id: string
  name: string
  type: string  // Dynamic: 'Proteína', 'Carb', 'Ensalada', 'Fruta', etc.
  description?: string
  tags: string[]
  user_id: string
  created_at?: string
}

// Form type for creating/editing ingredients
export interface CreateIngredientForm {
  name: string
  type: string
  description?: string
  tags?: string[]
}

// ============================================================================
// LEVEL 2: DISHES (combinations of ingredients)
// ============================================================================

// Dish pattern types
export type DishPattern = 'simple' | 'compound' | 'complete'

/**
 * Dish patterns explained:
 *
 * - simple: A single ingredient or simple preparation
 *   Example: "Papa salada" (just potato), "Ensalada verde" (lettuce + tomato)
 *
 * - compound: Multiple ingredients forming one dish
 *   Already combines protein + carb (or variations)
 *   Example: "Arroz con pollo", "Pasta con carne"
 *
 * - complete: A dish that is a complete meal by itself
 *   Doesn't need accompaniments
 *   Example: "Ensalada de conchitas con atún", "Bowl de quinoa con pollo"
 */

export interface FoodDish {
  id: string
  name: string
  dish_pattern: DishPattern
  ingredient_ids: string[]
  description?: string
  tags: string[]
  user_id: string
  created_at?: string
}

// Extended type with populated ingredients
export interface FoodDishWithIngredients extends FoodDish {
  ingredients: FoodIngredient[]
}

// Form type for creating/editing dishes
export interface CreateDishForm {
  name: string
  dish_pattern: DishPattern
  ingredient_ids: string[]
  description?: string
  tags?: string[]
}

// ============================================================================
// LEVEL 3: MENUS (combinations of dishes)
// ============================================================================

// Menu template types
export type MenuTemplate = 'protein-carb-salad' | 'main-salad' | 'complete' | 'flexible'

/**
 * Menu templates explained:
 *
 * - protein-carb-salad: Traditional separated components
 *   3 simple dishes: protein + carb + salad
 *   Example: [Carne asada, Papa salada, Ensalada verde]
 *
 * - main-salad: Main dish with accompaniment
 *   1 compound dish + 1 simple dish (salad)
 *   Example: [Arroz con pollo, Ensalada de tomate]
 *
 * - complete: Single complete dish
 *   1 complete dish that needs no accompaniments
 *   Example: [Ensalada de conchitas con atún]
 *
 * - flexible: No specific pattern
 *   Any combination of dishes
 *   Example: [Huevos, Arepas, Café] for breakfast
 */

export interface MealMenu {
  id: string
  name?: string  // Optional, can be auto-generated
  meal_type: string  // Dynamic: 'Desayuno', 'Almuerzo', 'Onces', etc.
  dish_ids: string[]
  meal_template: MenuTemplate
  notes?: string
  is_favorite: boolean
  user_id: string
  created_at?: string
}

// Extended type with populated dishes
export interface MealMenuWithDishes extends MealMenu {
  dishes: FoodDishWithIngredients[]
}

// Form type for creating/editing menus
export interface CreateMenuForm {
  name?: string
  meal_type: string
  dish_ids: string[]
  meal_template: MenuTemplate
  notes?: string
  is_favorite?: boolean
}

// ============================================================================
// WEEKLY PLANS (composed of menus)
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
    [mealType: string]: string  // menu_id
  }
}

// Extended type with populated menus
export interface DayPlanWithMenus {
  date: string
  day_name: string
  meals: {
    [mealType: string]: MealMenuWithDishes
  }
}

export interface WeeklyPlanDetailed extends Omit<WeeklyPlan, 'plan_data'> {
  days: DayPlanWithMenus[]
}

// Form type for creating weekly plans
export interface CreateWeeklyPlanForm {
  name: string
  start_date: string
  days: number  // 5 or 7
  include_weekends: boolean
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface DishValidationRules {
  simple: {
    minIngredients: number
    maxIngredients?: number
    description: string
  }
  compound: {
    minIngredients: number
    requiresDifferentTypes: boolean
    description: string
  }
  complete: {
    minIngredients: number
    minDifferentTypes: number
    description: string
  }
}

export const DISH_VALIDATION_RULES: DishValidationRules = {
  simple: {
    minIngredients: 1,
    description: 'Puede tener 1 o más ingredientes del mismo tipo general'
  },
  compound: {
    minIngredients: 2,
    requiresDifferentTypes: true,
    description: 'Debe tener al menos 2 ingredientes de tipos diferentes'
  },
  complete: {
    minIngredients: 3,
    minDifferentTypes: 2,
    description: 'Debe tener ingredientes de al menos 2-3 tipos diferentes'
  }
}

export interface MenuValidationRules {
  'protein-carb-salad': {
    requiredDishes: number
    requiredPatterns: DishPattern[]
    description: string
  }
  'main-salad': {
    requiredDishes: number
    requiredPatterns: DishPattern[]
    description: string
  }
  complete: {
    requiredDishes: number
    requiredPatterns: DishPattern[]
    description: string
  }
  flexible: {
    description: string
  }
}

export const MENU_VALIDATION_RULES: MenuValidationRules = {
  'protein-carb-salad': {
    requiredDishes: 3,
    requiredPatterns: ['simple', 'simple', 'simple'],
    description: 'Debe tener exactamente 3 platos simples'
  },
  'main-salad': {
    requiredDishes: 2,
    requiredPatterns: ['compound', 'simple'],
    description: 'Debe tener 1 plato compuesto + 1 plato simple'
  },
  complete: {
    requiredDishes: 1,
    requiredPatterns: ['complete'],
    description: 'Debe tener exactamente 1 plato completo'
  },
  flexible: {
    description: 'Sin restricciones de cantidad o tipo de platos'
  }
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

export interface IngredientTypeCount {
  type: string
  count: number
}

export interface DishPatternInfo {
  pattern: DishPattern
  label: string
  description: string
  icon: string
}

export const DISH_PATTERN_INFO: Record<DishPattern, DishPatternInfo> = {
  simple: {
    pattern: 'simple',
    label: 'Simple',
    description: 'Un ingrediente o preparación simple',
    icon: '🥗'
  },
  compound: {
    pattern: 'compound',
    label: 'Compuesto',
    description: 'Múltiples ingredientes formando un plato',
    icon: '🍲'
  },
  complete: {
    pattern: 'complete',
    label: 'Completo',
    description: 'Plato que es un menú completo',
    icon: '🍱'
  }
}

export interface MenuTemplateInfo {
  template: MenuTemplate
  label: string
  description: string
  icon: string
}

export const MENU_TEMPLATE_INFO: Record<MenuTemplate, MenuTemplateInfo> = {
  'protein-carb-salad': {
    template: 'protein-carb-salad',
    label: 'Componentes Separados',
    description: 'Proteína + Carb + Ensalada',
    icon: '🥩🥔🥗'
  },
  'main-salad': {
    template: 'main-salad',
    label: 'Principal + Acompañamiento',
    description: 'Plato principal + Ensalada',
    icon: '🍲🥗'
  },
  complete: {
    template: 'complete',
    label: 'Plato Único',
    description: 'Un solo plato completo',
    icon: '🍱'
  },
  flexible: {
    template: 'flexible',
    label: 'Flexible',
    description: 'Cualquier combinación',
    icon: '🍽️'
  }
}
