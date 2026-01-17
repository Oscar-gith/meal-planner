/**
 * Script to run database migration from V1 to V2
 *
 * Usage:
 *   npx tsx src/scripts/run-migration.ts
 *
 * This script will:
 * 1. Create new tables (food_ingredients, meal_combinations, weekly_plans)
 * 2. Migrate existing food_items data
 * 3. Verify migration success
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQL(sqlContent: string, description: string) {
  console.log(`\n🔄 ${description}...`)

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })

    if (error) {
      console.error(`❌ Error: ${error.message}`)
      return false
    }

    console.log(`✅ ${description} - Success!`)
    return true
  } catch (err: any) {
    console.error(`❌ Error: ${err.message}`)
    return false
  }
}

async function verifyMigration() {
  console.log('\n📊 Verifying migration...')

  // Check food_ingredients count
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('food_ingredients')
    .select('*', { count: 'exact', head: true })

  if (ingredientsError) {
    console.error('❌ Could not verify food_ingredients:', ingredientsError.message)
    return
  }

  // Check meal_combinations count
  const { data: combinations, error: combinationsError } = await supabase
    .from('meal_combinations')
    .select('*', { count: 'exact', head: true })

  // Check weekly_plans count
  const { data: plans, error: plansError } = await supabase
    .from('weekly_plans')
    .select('*', { count: 'exact', head: true })

  console.log('\n📈 Migration Results:')
  console.log(`   food_ingredients:  ${ingredients?.length || 0} records`)
  console.log(`   meal_combinations: ${combinations?.length || 0} records`)
  console.log(`   weekly_plans:      ${plans?.length || 0} records`)

  // Sample data
  const { data: sampleIngredients } = await supabase
    .from('food_ingredients')
    .select('name, type')
    .limit(5)

  if (sampleIngredients && sampleIngredients.length > 0) {
    console.log('\n📝 Sample migrated ingredients:')
    sampleIngredients.forEach((ing: any) => {
      console.log(`   - ${ing.name} (${ing.type})`)
    })
  }
}

async function main() {
  console.log('🚀 Starting Database Migration V1 → V2')
  console.log('=====================================')

  // Read SQL files
  const schemaPath = path.join(__dirname, '../lib/database/schema-v2.sql')
  const migrationPath = path.join(__dirname, '../lib/database/migration-v2.sql')

  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}`)
    process.exit(1)
  }

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('\n⚠️  WARNING: This will create new tables and migrate existing data.')
  console.log('   Make sure you have a backup of your database!')
  console.log('\n   Tables to be created:')
  console.log('   - food_ingredients')
  console.log('   - meal_combinations')
  console.log('   - weekly_plans')

  // Note: Since Supabase doesn't support direct SQL execution via client,
  // we'll need to use the SQL Editor in the dashboard
  console.log('\n📋 MANUAL STEPS REQUIRED:')
  console.log('\n1. Go to Supabase Dashboard → SQL Editor')
  console.log('2. Copy and run the contents of: src/lib/database/schema-v2.sql')
  console.log('3. Then copy and run: src/lib/database/migration-v2.sql')
  console.log('\n📖 See MIGRATION_GUIDE.md for detailed instructions')

  console.log('\n✅ After running the SQL scripts manually, run this command to verify:')
  console.log('   npx tsx src/scripts/verify-migration.ts')
}

main()
