/**
 * Script to create test users in Supabase
 * Run with: npx tsx tests/scripts/create-test-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testUser1Email = process.env.TEST_USER_EMAIL!
const testUser1Password = process.env.TEST_USER_PASSWORD!
const testUser2Email = process.env.TEST_USER_2_EMAIL!
const testUser2Password = process.env.TEST_USER_2_PASSWORD!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUsers() {
  console.log('🔧 Creating test users in Supabase...\n')

  // Create User 1
  console.log(`Creating user 1: ${testUser1Email}`)
  try {
    const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
      email: testUser1Email,
      password: testUser1Password,
      email_confirm: true
    })

    if (error1) {
      if (error1.message.includes('already been registered')) {
        console.log('  ⚠️  User 1 already exists, deleting and recreating...')

        // Find user by email
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === testUser1Email)

        if (existingUser) {
          await supabase.auth.admin.deleteUser(existingUser.id)
          console.log('  ✅ Deleted existing user')

          // Recreate
          const { data: newUser, error: recreateError } = await supabase.auth.admin.createUser({
            email: testUser1Email,
            password: testUser1Password,
            email_confirm: true
          })

          if (recreateError) throw recreateError
          console.log(`  ✅ User 1 created: ${newUser.user?.id}`)
        }
      } else {
        throw error1
      }
    } else {
      console.log(`  ✅ User 1 created: ${user1.user?.id}`)
    }
  } catch (error: any) {
    console.error(`  ❌ Failed to create user 1: ${error.message}`)
  }

  console.log()

  // Create User 2
  console.log(`Creating user 2: ${testUser2Email}`)
  try {
    const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
      email: testUser2Email,
      password: testUser2Password,
      email_confirm: true
    })

    if (error2) {
      if (error2.message.includes('already been registered')) {
        console.log('  ⚠️  User 2 already exists, deleting and recreating...')

        // Find user by email
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === testUser2Email)

        if (existingUser) {
          await supabase.auth.admin.deleteUser(existingUser.id)
          console.log('  ✅ Deleted existing user')

          // Recreate
          const { data: newUser, error: recreateError } = await supabase.auth.admin.createUser({
            email: testUser2Email,
            password: testUser2Password,
            email_confirm: true
          })

          if (recreateError) throw recreateError
          console.log(`  ✅ User 2 created: ${newUser.user?.id}`)
        }
      } else {
        throw error2
      }
    } else {
      console.log(`  ✅ User 2 created: ${user2.user?.id}`)
    }
  } catch (error: any) {
    console.error(`  ❌ Failed to create user 2: ${error.message}`)
  }

  console.log('\n✅ Done! Test users are ready.')
}

createTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
