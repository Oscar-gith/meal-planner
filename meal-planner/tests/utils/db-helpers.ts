import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (error) throw error
  return data.user
}

export async function deleteTestUser(userId: string) {
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error
}

export async function cleanupUserData(userId: string) {
  // Delete in order due to foreign keys
  await supabase.from('plan_collaborators').delete().eq('user_id', userId)
  await supabase.from('weekly_plans').delete().eq('user_id', userId)
  await supabase.from('food_ingredients').delete().eq('user_id', userId)
}

export async function createTestPlan(userId: string, name: string) {
  const { data, error } = await supabase
    .from('weekly_plans')
    .insert({
      name,
      start_date: '2026-01-20',
      end_date: '2026-01-26',
      plan_data: { days: [] },
      user_id: userId
    })
    .select()
    .single()

  if (error) throw error
  return data
}
