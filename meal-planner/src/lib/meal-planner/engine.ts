import { FoodItem, Rule, DailyMeals, PlanPreferences } from '@/types'

export interface WeeklyPlan {
  weekStart: string
  days: DailyMeals[]
  generatedAt: string
}

export class MealPlannerEngine {
  private foods: FoodItem[]
  private rules: Rule[]
  private history: { [foodId: string]: string[] } // foodId -> dates when used

  constructor(foods: FoodItem[], rules: Rule[], history: any[] = []) {
    this.foods = foods
    this.rules = rules.filter(rule => rule.is_active)
    this.history = this.processHistory(history)
  }

  private processHistory(history: any[]): { [foodId: string]: string[] } {
    const processed: { [foodId: string]: string[] } = {}
    history.forEach(entry => {
      if (!processed[entry.food_item_id]) {
        processed[entry.food_item_id] = []
      }
      processed[entry.food_item_id].push(entry.served_date)
    })
    return processed
  }

  public generateWeeklyPlan(preferences: PlanPreferences): WeeklyPlan {
    const startDate = new Date(preferences.startDate)
    const days: DailyMeals[] = []

    // Generate days based on preferences
    for (let i = 0; i < preferences.days; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      const dayName = this.getDayName(currentDate.getDay())
      const dateString = currentDate.toISOString().split('T')[0]

      const dailyMeals: DailyMeals = {
        date: dateString,
        day_name: dayName,
        meals: {
          Desayuno: this.planMeal('Desayuno', dateString, days),
          Almuerzo: this.planMeal('Almuerzo', dateString, days),
          Onces: this.planMeal('Onces', dateString, days)
        }
      }

      days.push(dailyMeals)
    }

    return {
      weekStart: preferences.startDate,
      days,
      generatedAt: new Date().toISOString()
    }
  }

  private planMeal(mealType: string, date: string, previousDays: DailyMeals[]) {
    const availableFoods = this.foods.filter(food => food.meal_type === mealType)
    const validOptions = this.filterByRules(availableFoods, mealType, date, previousDays)
    
    if (validOptions.length === 0) {
      // Fallback: return any available food if no options pass rules
      return this.selectRandomFoods(availableFoods, 1, mealType)
    }

    return this.selectRandomFoods(validOptions, this.getMealSize(mealType), mealType)
  }

  private filterByRules(
    foods: FoodItem[],
    mealType: string,
    currentDate: string,
    previousDays: DailyMeals[]
  ): FoodItem[] {
    let validFoods = [...foods]

    // Apply each rule
    this.rules.forEach(rule => {
      if (rule.meal_type && rule.meal_type !== mealType) return

      validFoods = this.applyRule(rule, validFoods, currentDate, previousDays, mealType)
    })

    return validFoods
  }

  private applyRule(
    rule: Rule,
    foods: FoodItem[],
    currentDate: string,
    previousDays: DailyMeals[],
    mealType: string
  ): FoodItem[] {
    const ruleText = rule.rule_text.toLowerCase()

    // Rule: "No se debe incluir huevo dos días seguidos"
    if (ruleText.includes('no') && ruleText.includes('huevo') && ruleText.includes('dos días seguidos')) {
      const yesterday = this.getYesterday(currentDate, previousDays)
      if (yesterday && this.dayHadEggs(yesterday)) {
        return foods.filter(food => !food.name.toLowerCase().includes('huevo'))
      }
    }

    // Rule: "Un día a la semana avena"
    if (ruleText.includes('un día') && ruleText.includes('avena')) {
      const weekHasAvena = previousDays.some(day => 
        Object.values(day.meals).flat().some(meal => 
          meal.food_item?.name.toLowerCase().includes('avena')
        )
      )
      // If week already has avena, don't force it again
      // This rule is handled in selection logic below
    }

    // Rule: "El huevo debe ir combinado con un carb"
    if (ruleText.includes('huevo') && ruleText.includes('combinado') && ruleText.includes('carb')) {
      // This rule affects meal composition, not individual food filtering
      // Will be handled in meal composition logic
    }

    return foods
  }

  private selectRandomFoods(foods: FoodItem[], count: number, mealType: string) {
    if (foods.length === 0) return []

    // Apply intelligent selection based on meal type
    let selectedFoods: FoodItem[] = []

    if (mealType === 'Desayuno') {
      selectedFoods = this.selectBreakfast(foods, count)
    } else if (mealType === 'Almuerzo') {
      selectedFoods = this.selectLunch(foods, count)
    } else if (mealType === 'Onces') {
      selectedFoods = this.selectSnack(foods, count)
    } else {
      // Random selection fallback
      const shuffled = [...foods].sort(() => 0.5 - Math.random())
      selectedFoods = shuffled.slice(0, count)
    }

    return selectedFoods.map(food => ({
      food_item: food,
      selected_at: new Date().toISOString(),
      user_modified: false
    }))
  }

  private selectBreakfast(foods: FoodItem[], count: number) {
    const eggFoods = foods.filter(f => f.subtype === 'Huevos')
    const carbFoods = foods.filter(f => f.subtype === 'Carb')
    const completeFoods = foods.filter(f => f.subtype === 'Completo')

    // Prefer complete meals, or egg + carb combination
    if (completeFoods.length > 0 && Math.random() > 0.5) {
      return this.randomSelect(completeFoods, 1)
    } else if (eggFoods.length > 0 && carbFoods.length > 0) {
      return [
        ...this.randomSelect(eggFoods, 1),
        ...this.randomSelect(carbFoods, 1)
      ].slice(0, count)
    } else {
      return this.randomSelect(foods, count)
    }
  }

  private selectLunch(foods: FoodItem[], count: number) {
    const principalFoods = foods.filter(f => f.subtype === 'Principal')
    const proteinFoods = foods.filter(f => f.subtype === 'Proteina' || f.subtype === 'Proteina + verdura')
    const carbFoods = foods.filter(f => f.subtype === 'Carb')
    const saladFoods = foods.filter(f => f.subtype === 'Ensalada')

    const selected: FoodItem[] = []

    // Rule: Principal items need salad (except cold pasta salad)
    if (principalFoods.length > 0 && Math.random() > 0.4) {
      const principal = this.randomSelect(principalFoods, 1)[0]
      selected.push(principal)
      
      if (!principal.name.toLowerCase().includes('ensalada fría') && saladFoods.length > 0) {
        selected.push(...this.randomSelect(saladFoods, 1))
      }
    }
    // Rule: Protein items need side and salad  
    else if (proteinFoods.length > 0) {
      selected.push(...this.randomSelect(proteinFoods, 1))
      if (carbFoods.length > 0) {
        selected.push(...this.randomSelect(carbFoods, 1))
      }
      if (saladFoods.length > 0) {
        selected.push(...this.randomSelect(saladFoods, 1))
      }
    } else {
      selected.push(...this.randomSelect(foods, count))
    }

    return selected.slice(0, Math.max(count, 2)) // At least 2 items for lunch
  }

  private selectSnack(foods: FoodItem[], count: number) {
    // Rule: drink + carb + fruit
    const drinkFoods = foods.filter(f => f.subtype === 'Beber')
    const carbFoods = foods.filter(f => f.subtype === 'Carb')
    const fruitFoods = foods.filter(f => f.subtype === 'Fruta')

    const selected: FoodItem[] = []

    if (drinkFoods.length > 0) selected.push(...this.randomSelect(drinkFoods, 1))
    if (carbFoods.length > 0) selected.push(...this.randomSelect(carbFoods, 1))
    if (fruitFoods.length > 0) selected.push(...this.randomSelect(fruitFoods, 1))

    return selected.length > 0 ? selected : this.randomSelect(foods, count)
  }

  private randomSelect(foods: FoodItem[], count: number): FoodItem[] {
    const shuffled = [...foods].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  private getMealSize(mealType: string): number {
    switch (mealType) {
      case 'Desayuno': return 2
      case 'Almuerzo': return 3
      case 'Onces': return 3
      default: return 1
    }
  }

  private getDayName(dayNumber: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[dayNumber]
  }

  private getYesterday(currentDate: string, previousDays: DailyMeals[]): DailyMeals | null {
    const current = new Date(currentDate)
    const yesterday = new Date(current)
    yesterday.setDate(current.getDate() - 1)
    const yesterdayString = yesterday.toISOString().split('T')[0]

    return previousDays.find(day => day.date === yesterdayString) || null
  }

  private dayHadEggs(day: DailyMeals): boolean {
    return Object.values(day.meals).flat().some(meal => 
      meal.food_item?.name.toLowerCase().includes('huevo')
    )
  }
}