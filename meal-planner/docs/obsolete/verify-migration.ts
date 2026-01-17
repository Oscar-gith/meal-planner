/**
 * Verify database migration was successful
 *
 * Usage:
 *   npx tsx src/scripts/verify-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log('🔍 Verifying Database Migration')
  console.log('================================\n')

  try {
    // Check food_ingredients
    const { data: ingredients, error: ingredientsError, count: ingredientsCount } = await supabase
      .from('food_ingredients')
      .select('*', { count: 'exact', head: false })

    if (ingredientsError) {
      console.error('❌ food_ingredients table:', ingredientsError.message)
      console.log('   → Table might not exist yet. Run schema-v2.sql first.')
    } else {
      console.log(`✅ food_ingredients: ${ingredientsCount || 0} records`)

      if (ingredients && ingredients.length > 0) {
        console.log('   Sample data:')
        ingredients.slice(0, 5).forEach((ing: any) => {
          console.log(`   - ${ing.name} (${ing.type})`)
        })
      }
    }

    // Check meal_combinations
    const { error: combinationsError, count: combinationsCount } = await supabase
      .from('meal_combinations')
      .select('*', { count: 'exact', head: true })

    if (combinationsError) {
      console.error('\n❌ meal_combinations table:', combinationsError.message)
    } else {
      console.log(`\n✅ meal_combinations: ${combinationsCount || 0} records`)
    }

    // Check weekly_plans
    const { error: plansError, count: plansCount } = await supabase
      .from('weekly_plans')
      .select('*', { count: 'exact', head: true })

    if (plansError) {
      console.error('\n❌ weekly_plans table:', plansError.message)
    } else {
      console.log(`✅ weekly_plans: ${plansCount || 0} records`)
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    if (!ingredientsError && !combinationsError && !plansError) {
      console.log('✅ Migration verified successfully!')
      console.log('\nNext steps:')
      console.log('1. Start implementing CRUD for food_ingredients')
      console.log('2. Build UI for meal_combinations')
      console.log('3. Create weekly plan generator')
    } else {
      console.log('⚠️  Some tables are missing. Please run:')
      console.log('   - schema-v2.sql in Supabase SQL Editor')
      console.log('   - migration-v2.sql to migrate data')
      console.log('\nSee MIGRATION_GUIDE.md for instructions')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
