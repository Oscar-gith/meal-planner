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

  constructor(foods: FoodItem[], rules: Rule[], history: Array<{food_item_id: string, served_date: string}> = []) {
    this.foods = foods
    this.rules = rules.filter(rule => rule.is_active)
    this.history = this.processHistory(history)
  }

  private processHistory(history: Array<{food_item_id: string, served_date: string}>): { [foodId: string]: string[] } {
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
    let daysGenerated = 0
    let dayOffset = 0
    
    while (daysGenerated < preferences.days) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      
      const dayOfWeek = currentDate.getDay() // 0 = Sunday, 6 = Saturday
      
      // Skip weekends if not included
      if (!preferences.includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        dayOffset++
        continue
      }
      
      const dayName = this.getDayName(dayOfWeek)
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
      daysGenerated++
      dayOffset++
    }

    return {
      weekStart: preferences.startDate,
      days,
      generatedAt: new Date().toISOString()
    }
  }

  private planMeal(mealType: string, date: string, previousDays: DailyMeals[]) {
    const availableFoods = this.foods.filter(food => food.meal_type === mealType)
    
    // Apply egg rule specifically for breakfast
    let validOptions = availableFoods
    if (mealType === 'Desayuno') {
      // Check if previous day had eggs in any meal
      const previousDay = this.getPreviousDay(previousDays)
      if (previousDay && this.dayHadEggs(previousDay)) {
        validOptions = availableFoods.filter(food => 
          !food.name.toLowerCase().includes('huevo') && 
          food.subtype !== 'Huevos'
        )
      }
    }
    
    // Apply other rules
    validOptions = this.filterByRules(validOptions, mealType, date, previousDays)
    
    if (validOptions.length === 0) {
      // Fallback: return any available food if no options pass rules
      return this.selectRandomFoods(availableFoods, 1, mealType)
    }

    return this.selectRandomFoods(validOptions, this.getMealSize(mealType), mealType, previousDays)
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

      validFoods = this.applyRule(rule, validFoods, currentDate, previousDays)
    })

    return validFoods
  }

  private applyRule(
    rule: Rule,
    foods: FoodItem[],
    currentDate: string,
    previousDays: DailyMeals[]
  ): FoodItem[] {
    const ruleText = rule.rule_text.toLowerCase()

    // Rule: "No se debe incluir huevo dos días seguidos"
    if (ruleText.includes('no') && ruleText.includes('huevo') && ruleText.includes('dos días seguidos')) {
      // Check if previous day (in the plan) had eggs
      const previousDay = this.getPreviousDay(previousDays)
      
      if (previousDay && this.dayHadEggs(previousDay)) {
        return foods.filter(food => !food.name.toLowerCase().includes('huevo'))
      }
    }

    // Rule: "Un día a la semana avena"
    if (ruleText.includes('un día') && ruleText.includes('avena')) {
      // This rule is handled in selection logic
      // Could add avena preference logic here if needed
    }

    // Rule: "El huevo debe ir combinado con un carb"
    if (ruleText.includes('huevo') && ruleText.includes('combinado') && ruleText.includes('carb')) {
      // This rule affects meal composition, not individual food filtering
      // Will be handled in meal composition logic
    }

    return foods
  }

  private selectRandomFoods(foods: FoodItem[], count: number, mealType: string, previousDays: DailyMeals[] = []) {
    if (foods.length === 0) return []

    // Apply intelligent selection based on meal type
    let selectedFoods: FoodItem[] = []

    if (mealType === 'Desayuno') {
      selectedFoods = this.selectBreakfast(foods, count)
    } else if (mealType === 'Almuerzo') {
      selectedFoods = this.selectLunch(foods, count)
    } else if (mealType === 'Onces') {
      selectedFoods = this.selectSnack(foods, count, previousDays)
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

    // Rule: No more than one carbohydrate per breakfast
    const selected: FoodItem[] = []
    
    // Prefer complete meals (they are balanced)
    if (completeFoods.length > 0 && Math.random() > 0.5) {
      return this.randomSelect(completeFoods, 1)
    } 
    // Egg + single carb combination
    else if (eggFoods.length > 0 && carbFoods.length > 0) {
      selected.push(...this.randomSelect(eggFoods, 1))
      selected.push(...this.randomSelect(carbFoods, 1)) // Only 1 carb
    } 
    // If only carbs available, limit to 1
    else if (carbFoods.length > 0) {
      selected.push(...this.randomSelect(carbFoods, 1)) // Only 1 carb
    } 
    // Fallback
    else {
      return this.randomSelect(foods, Math.min(count, 1))
    }

    return selected.slice(0, count)
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

  private selectSnack(foods: FoodItem[], count: number, previousDays: DailyMeals[] = []) {
    const drinkFoods = foods.filter(f => f.subtype === 'Beber')
    const carbFoods = foods.filter(f => f.subtype === 'Carb') 
    const fruitFoods = foods.filter(f => f.subtype === 'Fruta')
    const proteinFoods = foods.filter(f => f.subtype === 'Proteina')

    const selected: FoodItem[] = []

    // Check if hummus was selected
    const hummusFood = proteinFoods.find(f => f.name.toLowerCase().includes('hummus'))
    const cheeseFood = proteinFoods.find(f => f.name.toLowerCase().includes('queso'))
    
    // Special rule: Hummus + chips only goes with fruit
    if (hummusFood && Math.random() > 0.7) { // 30% chance for hummus
      selected.push(hummusFood)
      if (fruitFoods.length > 0) selected.push(...this.randomSelect(fruitFoods, 1))
      return selected
    }
    
    // Special rule: Cheese + carb maximum 1 day per week
    const weekHadCheese = this.weekHadCheeseCarb(previousDays)
    if (cheeseFood && !weekHadCheese && Math.random() > 0.8) { // 20% chance for cheese
      selected.push(cheeseFood)
      if (carbFoods.length > 0) selected.push(...this.randomSelect(carbFoods, 1))
      return selected
    }

    // Regular rule: drink + carb + fruit (avoiding 2-day repetition)
    const filteredDrinks = this.filterRecentlyUsed(drinkFoods, previousDays, 'Onces', 2)
    const filteredCarbs = this.filterRecentlyUsed(carbFoods, previousDays, 'Onces', 2)
    const filteredFruits = this.filterRecentlyUsed(fruitFoods, previousDays, 'Onces', 2)

    if (filteredDrinks.length > 0) selected.push(...this.randomSelect(filteredDrinks, 1))
    if (filteredCarbs.length > 0) selected.push(...this.randomSelect(filteredCarbs, 1))
    if (filteredFruits.length > 0) selected.push(...this.randomSelect(filteredFruits, 1))

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

  private getPreviousDay(previousDays: DailyMeals[]): DailyMeals | null {
    // Simply return the last day in the plan (most recently added)
    return previousDays.length > 0 ? previousDays[previousDays.length - 1] : null
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
      meal.food_item?.name.toLowerCase().includes('huevo') ||
      meal.food_item?.subtype === 'Huevos'
    )
  }

  private weekHadCheeseCarb(previousDays: DailyMeals[]): boolean {
    return previousDays.some(day => 
      day.meals.Onces?.some(meal => 
        meal.food_item?.name.toLowerCase().includes('queso')
      )
    )
  }

  private filterRecentlyUsed(foods: FoodItem[], previousDays: DailyMeals[], mealType: string, dayGap: number): FoodItem[] {
    if (previousDays.length < dayGap) return foods

    const recentlyUsed = new Set<string>()
    
    // Get foods used in the last 'dayGap' days for this meal type
    previousDays.slice(-dayGap).forEach(day => {
      const meals = day.meals[mealType as keyof typeof day.meals]
      if (meals) {
        meals.forEach(meal => {
          recentlyUsed.add(meal.food_item.name)
        })
      }
    })

    return foods.filter(food => !recentlyUsed.has(food.name))
  }
}