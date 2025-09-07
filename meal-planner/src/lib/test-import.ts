// Test script to import CSV data to Supabase
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DataImporter } from './utils/import-data'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

// Temporary user ID for testing (in real app, this comes from auth)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

async function testImport() {
  console.log('🚀 Starting data import test...')
  
  try {
    const importer = new DataImporter()
    
    // Read CSV files
    const foodCSV = readFileSync(join(process.cwd(), '../Temp/Comida semanal - DB.csv'), 'utf-8')
    const rulesCSV = readFileSync(join(process.cwd(), '../Temp/Comida semanal - Reglas.csv'), 'utf-8')
    
    console.log('📄 CSV files loaded successfully')
    
    // Parse data
    const foodItems = importer.parseFoodCSV(foodCSV, TEST_USER_ID)
    const rules = importer.parseRulesCSV(rulesCSV, TEST_USER_ID)
    
    console.log(`📊 Parsed ${foodItems.length} food items`)
    console.log(`📋 Parsed ${rules.length} rules`)
    
    // Show sample data
    console.log('\n🥘 Sample food items:')
    foodItems.slice(0, 3).forEach(item => {
      console.log(`  ${item.meal_type} > ${item.subtype} > ${item.name}`)
    })
    
    console.log('\n📝 Sample rules:')
    rules.forEach(rule => {
      console.log(`  ${rule.meal_type || 'General'}: ${rule.rule_text}`)
    })
    
    // Clear existing data (for testing)
    console.log('\n🧹 Clearing existing data...')
    await importer.clearUserData(TEST_USER_ID)
    
    // Import food items
    console.log('📥 Importing food items...')
    const foodResult = await importer.importFoodItems(foodItems)
    console.log(`✅ Food items: ${foodResult.success} imported, ${foodResult.errors.length} errors`)
    
    if (foodResult.errors.length > 0) {
      console.log('❌ Food import errors:', foodResult.errors)
    }
    
    // Import rules
    console.log('📥 Importing rules...')
    const rulesResult = await importer.importRules(rules)
    console.log(`✅ Rules: ${rulesResult.success} imported, ${rulesResult.errors.length} errors`)
    
    if (rulesResult.errors.length > 0) {
      console.log('❌ Rules import errors:', rulesResult.errors)
    }
    
    console.log('\n🎉 Import completed!')
    
  } catch (error) {
    console.error('💥 Import failed:', error)
  }
}

// Run if called directly
if (require.main === module) {
  testImport()
}

export { testImport }