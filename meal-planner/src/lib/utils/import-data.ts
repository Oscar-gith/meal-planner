import { FoodItem, Rule } from '@/types'
import { createClient } from '@/lib/supabase/client'

// Removed unused interfaces

export class DataImporter {
  private supabase = createClient()

  /**
   * Parse CSV content to food items
   */
  parseFoodCSV(csvContent: string, userId: string): FoodItem[] {
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map((line, index) => {
      const values = this.parseCSVLine(line)
      const row: Record<string, string> = {}
      
      headers.forEach((header, i) => {
        row[header] = values[i]?.trim() || ''
      })
      
      return {
        id: `import-${Date.now()}-${index}`,
        meal_type: row.Tipo || '',
        subtype: row.Subtipo || '',
        name: row.Concepto || '',
        user_id: userId
      }
    }).filter(item => item.meal_type && item.name) // Filter out empty rows
  }

  /**
   * Parse CSV content to rules
   */
  parseRulesCSV(csvContent: string, userId: string): Rule[] {
    const lines = csvContent.trim().split('\n')
    const rules: Rule[] = []
    
    lines.forEach((line, index) => {
      if (!line.trim()) return
      
      const values = this.parseCSVLine(line)
      const mealType = values[0]?.trim() || null
      const ruleText = values[1]?.trim() || ''
      
      if (ruleText) {
        rules.push({
          id: `rule-import-${Date.now()}-${index}`,
          meal_type: mealType || null,
          rule_text: ruleText,
          validation_method: 'pattern',
          is_active: true,
          user_id: userId
        })
      }
    })
    
    return rules
  }

  /**
   * Parse a single CSV line, handling quotes and commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  }

  /**
   * Import food items to Supabase
   */
  async importFoodItems(foodItems: FoodItem[]): Promise<{ success: number, errors: unknown[] }> {
    const errors: unknown[] = []
    let success = 0

    // Insert in batches to avoid limits
    const batchSize = 100
    for (let i = 0; i < foodItems.length; i += batchSize) {
      const batch = foodItems.slice(i, i + batchSize)
      
      try {
        const { error } = await this.supabase
          .from('food_items')
          .insert(batch.map(item => ({
            meal_type: item.meal_type,
            subtype: item.subtype,
            name: item.name,
            user_id: item.user_id
          })))
        
        if (error) {
          errors.push({ batch: i / batchSize, error })
        } else {
          success += batch.length
        }
      } catch (err) {
        errors.push({ batch: i / batchSize, error: err })
      }
    }

    return { success, errors }
  }

  /**
   * Import rules to Supabase
   */
  async importRules(rules: Rule[]): Promise<{ success: number, errors: unknown[] }> {
    const errors: unknown[] = []
    let success = 0

    try {
      const { error } = await this.supabase
        .from('rules')
        .insert(rules.map(rule => ({
          meal_type: rule.meal_type,
          rule_text: rule.rule_text,
          validation_method: rule.validation_method,
          is_active: rule.is_active,
          user_id: rule.user_id
        })))
      
      if (error) {
        errors.push(error)
      } else {
        success = rules.length
      }
    } catch (err) {
      errors.push(err)
    }

    return { success, errors }
  }

  /**
   * Clear all user data (for reimporting)
   */
  async clearUserData(userId: string): Promise<void> {
    await Promise.all([
      this.supabase.from('food_items').delete().eq('user_id', userId),
      this.supabase.from('rules').delete().eq('user_id', userId)
    ])
  }
}