import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!
const TEST_USER_2_EMAIL = process.env.TEST_USER_2_EMAIL!
const TEST_USER_2_PASSWORD = process.env.TEST_USER_2_PASSWORD!

// Helper to create Supabase client for a specific user
async function createAuthenticatedClient(email: string, password: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return { supabase, user: data.user }
}

/**
 * CRITICAL TEST: Data Isolation Between Users
 *
 * This test validates that Row Level Security (RLS) policies are working correctly
 * and that users can ONLY see their own data.
 *
 * Test flow:
 * 1. User 1 creates a plan
 * 2. User 2 logs in
 * 3. Verify User 2 CANNOT see User 1's plan
 * 4. User 2 creates their own plan
 * 5. Verify User 2 only sees their own plan
 */
test.describe('CRITICAL: Data Isolation Between Users (RLS Validation)', () => {
  test('should enforce complete data isolation between users', async () => {
    // ============================================================
    // PHASE 1: User 1 creates a plan via API
    // ============================================================
    console.log('\n🔧 Phase 1: User 1 creates plan via API')

    const { supabase: supabase1, user: user1 } = await createAuthenticatedClient(
      TEST_USER_EMAIL,
      TEST_USER_PASSWORD
    )

    // Create a plan as User 1
    const { data: user1Plan, error: createError } = await supabase1
      .from('weekly_plans')
      .insert({
        name: 'Plan Secreto de User 1 - RLS Test',
        start_date: '2026-01-20',
        end_date: '2026-01-26',
        plan_data: { days: [] },
        user_id: user1!.id
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(user1Plan).toBeTruthy()
    console.log(`✅ User 1 created plan: ${user1Plan?.id}`)

    // Verify User 1 can read their own plan
    const { data: user1Plans, error: readError1 } = await supabase1
      .from('weekly_plans')
      .select('*')

    expect(readError1).toBeNull()
    expect(user1Plans).toHaveLength(1)
    expect(user1Plans![0].name).toBe('Plan Secreto de User 1 - RLS Test')
    console.log(`✅ User 1 can read their own plan`)

    await supabase1.auth.signOut()

    // ============================================================
    // PHASE 2: User 2 tries to access User 1's plan
    // ============================================================
    console.log('\n🔧 Phase 2: User 2 attempts to access User 1\'s data')

    const { supabase: supabase2, user: user2 } = await createAuthenticatedClient(
      TEST_USER_2_EMAIL,
      TEST_USER_2_PASSWORD
    )

    // CRITICAL TEST: User 2 queries all plans (should NOT see User 1's plan)
    const { data: user2ViewOfAllPlans, error: user2QueryError } = await supabase2
      .from('weekly_plans')
      .select('*')

    expect(user2QueryError).toBeNull()
    expect(user2ViewOfAllPlans).toHaveLength(0) // Should be empty due to RLS
    console.log(`✅ CRITICAL: User 2 sees ${user2ViewOfAllPlans!.length} plans (RLS blocks User 1's data)`)

    // CRITICAL TEST: User 2 tries to directly access User 1's plan by ID
    const { data: directAccess } = await supabase2
      .from('weekly_plans')
      .select('*')
      .eq('id', user1Plan!.id)
      .single()

    expect(directAccess).toBeNull() // Should be null due to RLS
    console.log(`✅ CRITICAL: User 2 CANNOT directly access User 1's plan by ID (RLS working)`)

    // ============================================================
    // PHASE 3: User 2 creates their own plan
    // ============================================================
    console.log('\n🔧 Phase 3: User 2 creates their own plan')

    const { data: user2Plan, error: user2CreateError } = await supabase2
      .from('weekly_plans')
      .insert({
        name: 'Plan de User 2 - RLS Test',
        start_date: '2026-01-27',
        end_date: '2026-02-02',
        plan_data: { days: [] },
        user_id: user2!.id
      })
      .select()
      .single()

    expect(user2CreateError).toBeNull()
    expect(user2Plan).toBeTruthy()
    console.log(`✅ User 2 created plan: ${user2Plan?.id}`)

    // Verify User 2 can read ONLY their own plan
    const { data: user2OwnPlans } = await supabase2
      .from('weekly_plans')
      .select('*')

    expect(user2OwnPlans).toHaveLength(1)
    expect(user2OwnPlans![0].name).toBe('Plan de User 2 - RLS Test')
    expect(user2OwnPlans![0].user_id).toBe(user2!.id)
    console.log(`✅ User 2 sees only their own plan (not User 1's plan)`)

    await supabase2.auth.signOut()

    // ============================================================
    // PHASE 4: User 1 verifies they don't see User 2's plan
    // ============================================================
    console.log('\n🔧 Phase 4: User 1 verifies bidirectional isolation')

    const { supabase: supabase1Again } = await createAuthenticatedClient(
      TEST_USER_EMAIL,
      TEST_USER_PASSWORD
    )

    const { data: user1FinalView } = await supabase1Again
      .from('weekly_plans')
      .select('*')

    expect(user1FinalView).toHaveLength(1)
    expect(user1FinalView![0].name).toBe('Plan Secreto de User 1 - RLS Test')
    console.log(`✅ CRITICAL: User 1 still sees only their own plan (bidirectional RLS)`)

    // CRITICAL TEST: User 1 tries to access User 2's plan by ID
    const { data: user1AccessUser2 } = await supabase1Again
      .from('weekly_plans')
      .select('*')
      .eq('id', user2Plan!.id)
      .single()

    expect(user1AccessUser2).toBeNull()
    console.log(`✅ CRITICAL: User 1 CANNOT access User 2's plan by ID`)

    await supabase1Again.auth.signOut()

    // ============================================================
    // Cleanup
    // ============================================================
    console.log('\n🧹 Cleanup: Deleting test plans')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabaseAdmin.from('weekly_plans').delete().eq('id', user1Plan!.id)
    await supabaseAdmin.from('weekly_plans').delete().eq('id', user2Plan!.id)

    console.log('\n🎉 RLS VALIDATION SUCCESSFUL: Complete data isolation confirmed')
  })
})

test.describe('Data Isolation - Edge Cases', () => {
  test('should handle simultaneous users without data leakage', async ({ browser }) => {
    // Create two independent browser contexts (simulating two different browsers)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login both users simultaneously
    await Promise.all([
      (async () => {
        await page1.goto('/login')
        await page1.getByLabel(/email/i).fill(TEST_USER_EMAIL)
        await page1.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD)
        await page1.getByRole('button', { name: /iniciar sesión/i }).click()
        await page1.waitForURL('/planes')
      })(),
      (async () => {
        await page2.goto('/login')
        await page2.getByLabel(/email/i).fill(TEST_USER_2_EMAIL)
        await page2.getByLabel(/contraseña/i).fill(TEST_USER_2_PASSWORD)
        await page2.getByRole('button', { name: /iniciar sesión/i }).click()
        await page2.waitForURL('/planes')
      })()
    ])

    console.log('✅ Both users logged in simultaneously')

    // Both navigate to plans page
    await Promise.all([
      page1.goto('/planes'),
      page2.goto('/planes')
    ])

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ])

    // Verify isolation even with simultaneous access
    const user1SeesUser2Data = await page1.getByText(/plan de user 2/i).isVisible().catch(() => false)
    const user2SeesUser1Data = await page2.getByText(/plan secreto de user 1/i).isVisible().catch(() => false)

    expect(user1SeesUser2Data).toBe(false)
    expect(user2SeesUser1Data).toBe(false)

    console.log('✅ No data leakage with simultaneous users')

    await context1.close()
    await context2.close()
  })
})
