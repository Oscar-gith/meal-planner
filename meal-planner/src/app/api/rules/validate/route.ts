/**
 * API Route: POST /api/rules/validate
 * Validates a user-created rule using Gemini AI
 * Rejects nonsense rules (e.g., "no plutonio", "no adelantar por la derecha")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRuleText } from '@/lib/llm/gemini-client'
import { FoodIngredient } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { rule_text } = body

    if (!rule_text || typeof rule_text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid rule_text' },
        { status: 400 }
      )
    }

    // Sanitize input
    const sanitized = sanitizeRuleText(rule_text)

    // Get user's family to fetch available ingredients
    const { data: familyMember } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single()

    // Fetch available ingredients for context (optional but helpful)
    // Note: We only select name which is what validateRuleText uses
    let availableIngredients: { id: string; name: string; type: string }[] | undefined
    if (familyMember?.family_id) {
      const { data: ingredients } = await supabase
        .from('food_ingredients')
        .select('id, name, type')
        .eq('family_id', familyMember.family_id)
        .limit(100) // Limit to avoid huge context

      availableIngredients = ingredients || undefined
    }

    // Validate with Gemini
    // Note: type assertion is safe because validateRuleText only uses .name property
    const validation = await validateRuleText(
      sanitized,
      availableIngredients as unknown as FoodIngredient[] | undefined
    )

    return NextResponse.json(validation)
  } catch (error) {
    console.error('Error validating rule:', error)
    return NextResponse.json(
      {
        error: 'Failed to validate rule',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Sanitize rule text to prevent prompt injection
 */
function sanitizeRuleText(text: string): string {
  return (
    text
      .trim()
      // Remove code blocks
      .replace(/```/g, '')
      // Remove script tags
      .replace(/<script>/gi, '')
      .replace(/<\/script>/gi, '')
      // Limit length
      .slice(0, 500)
  )
}
