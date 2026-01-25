/**
 * API Route: POST /api/planning/generate
 * AI-powered meal plan generation with rule validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPlanningAgent } from '@/lib/agents/planning-agent'
import { WeeklyPlanningEngine, PlanningConfig } from '@/lib/weekly-planner'
import { FoodIngredient, Rule } from '@/types'
import { MealPattern } from '@/lib/meal-patterns'
import { PlanningAgentResult, SSEEvent } from '@/types/agent'

// Rate limiting (simple in-memory for now)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10 // Max 10 requests
const RATE_WINDOW = 3600 * 1000 // 1 hour

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let parsedBody: {
    config: PlanningConfig
    familyId: string
    stream?: boolean
    existingPlan?: unknown
  } | null = null

  try {
    console.log('[API] Planning generation started')

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('[API] User authenticated:', user?.id)

    if (!user) {
      console.error('[API] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting check
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    parsedBody = body as {
      config: PlanningConfig
      familyId: string
      stream?: boolean
      existingPlan?: unknown // For retry functionality
    }
    const { config, familyId, stream = false, existingPlan } = parsedBody

    // Convert start_date from ISO string to Date object
    // This is necessary because Date objects are serialized to strings when sent via JSON
    if (config && typeof config.start_date === 'string') {
      config.start_date = new Date(config.start_date)
    }

    console.log('[API] Request body parsed:', { familyId, hasConfig: !!config })

    // Validate required fields
    if (!familyId) {
      console.error('[API] Missing familyId')
      return NextResponse.json(
        { error: 'familyId is required. Please join or create a family first.' },
        { status: 400 }
      )
    }

    if (!config) {
      console.error('[API] Missing config')
      return NextResponse.json(
        { error: 'config is required' },
        { status: 400 }
      )
    }

    console.log('[API] Fetching rules for family:', familyId)

    // Fetch active LLM rules for this family
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .eq('validation_method', 'llm')

    if (rulesError) {
      console.error('Error fetching rules:', rulesError)
    }

    // Fetch ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('food_ingredients')
      .select('*')
      .eq('family_id', familyId)

    if (ingredientsError || !ingredients) {
      return NextResponse.json(
        { error: 'Failed to fetch ingredients' },
        { status: 500 }
      )
    }

    // Fetch patterns
    const { data: patterns, error: patternsError } = await supabase
      .from('meal_patterns')
      .select('*')
      .or('is_system.eq.true,user_id.eq.' + user.id)
      .order('display_order')

    if (patternsError || !patterns) {
      return NextResponse.json(
        { error: 'Failed to fetch patterns' },
        { status: 500 }
      )
    }

    // If no active LLM rules, use traditional planning
    if (!rules || rules.length === 0) {
      console.log('[API] No active rules, using traditional planning')
      const result = generateTraditionalPlan(
        config,
        ingredients as FoodIngredient[],
        patterns as MealPattern[]
      )

      return NextResponse.json({
        ...result,
        agentLog: null,
      })
    }

    console.log(`[API] Found ${rules.length} active rules, using AI agent`)

    // If streaming mode requested, use SSE
    if (stream) {
      console.log('[API] Using SSE streaming mode')
      return streamPlanningProgress(
        config,
        ingredients as FoodIngredient[],
        patterns as MealPattern[],
        rules as Rule[],
        user.id,
        familyId,
        existingPlan,
        supabase,
        startTime
      )
    }

    // Otherwise, use traditional JSON response
    // Run AI-powered planning with timeout (60s for 3 iterations with LLM calls)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 60000)
    )

    console.log('[API] Starting AI planning agent...')

    const planningPromise = runPlanningAgent(
      config,
      ingredients as FoodIngredient[],
      patterns as MealPattern[],
      rules as Rule[],
      user.id,
      familyId
    )

    const result = (await Promise.race([
      planningPromise,
      timeoutPromise,
    ])) as PlanningAgentResult

    console.log('[API] AI planning agent completed successfully')

    // Store agent log in database
    const totalDuration = Date.now() - startTime

    const { error: logError } = await supabase.from('agent_logs').insert({
      user_id: user.id,
      family_id: familyId,
      iteration_count: result.agentLog.iteration_count,
      total_duration_ms: totalDuration,
      llm_provider: 'gemini',
      total_tokens_used: 0, // TODO: implement token counting
      violations_found: result.agentLog.violations_found,
      modifications_applied: result.agentLog.modifications_applied,
      final_status: result.agentLog.final_status,
    })

    if (logError) {
      console.error('Error storing agent log:', logError)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] AI planning failed with error:', error)
    console.error('[API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Fallback to traditional planning
    try {
      console.log('[API] Attempting fallback to traditional planning')

      // Use parsedBody from earlier instead of re-reading request
      if (!parsedBody) {
        console.error('[API] parsedBody not available for fallback')
        throw new Error('Request body not available for fallback')
      }

      const { config } = parsedBody

      // Re-fetch data for fallback
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: ingredients } = await supabase
        .from('food_ingredients')
        .select('*')

      const { data: patterns } = await supabase
        .from('meal_patterns')
        .select('*')
        .or('is_system.eq.true,user_id.eq.' + user.id)

      if (!ingredients || !patterns) {
        throw new Error('Failed to fetch data for fallback')
      }

      const fallbackResult = generateTraditionalPlan(
        config,
        ingredients as FoodIngredient[],
        patterns as MealPattern[]
      )

      return NextResponse.json({
        ...fallbackResult,
        planningResult: {
          ...fallbackResult.planningResult,
          warnings: [
            ...fallbackResult.planningResult.warnings,
            'No se pudo validar reglas con IA. Plan generado sin validación.',
          ],
        },
        agentLog: {
          iteration_count: 0,
          total_duration_ms: Date.now() - startTime,
          violations_found: [],
          modifications_applied: [],
          final_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } catch (fallbackError) {
      console.error('[API] Fallback also failed:', fallbackError)
      return NextResponse.json(
        {
          error: 'Failed to generate plan',
          details:
            fallbackError instanceof Error
              ? fallbackError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Stream planning progress using Server-Sent Events (SSE)
 */
function streamPlanningProgress(
  config: PlanningConfig,
  ingredients: FoodIngredient[],
  patterns: MealPattern[],
  rules: Rule[],
  userId: string,
  familyId: string,
  existingPlan: unknown,
  supabase: Awaited<ReturnType<typeof createClient>>,
  startTime: number
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to emit SSE events
      const emitEvent = (event: SSEEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      try {
        // Run the planning agent with progress callback
        const result = await runPlanningAgent(
          config,
          ingredients,
          patterns,
          rules,
          userId,
          familyId,
          existingPlan,
          emitEvent // Pass the event emitter as callback
        )

        // Emit final result based on status
        if (result.agentLog.final_status === 'success') {
          emitEvent({ type: 'success' })
        } else if (result.agentLog.violations_found.length > 0) {
          // Map violations to conflict details for user-friendly display
          const conflicts = mapViolationsToConflicts(result.agentLog.violations_found)
          emitEvent({
            type: 'partial_success',
            conflicts,
          })
        }

        // Emit the complete result data
        const resultData = `data: ${JSON.stringify({ type: 'result', data: result })}\n\n`
        controller.enqueue(encoder.encode(resultData))

        // Store agent log in database
        const totalDuration = Date.now() - startTime
        await supabase.from('agent_logs').insert({
          user_id: userId,
          family_id: familyId,
          iteration_count: result.agentLog.iteration_count,
          total_duration_ms: totalDuration,
          llm_provider: 'gemini',
          total_tokens_used: 0, // TODO: implement token counting
          violations_found: result.agentLog.violations_found,
          modifications_applied: result.agentLog.modifications_applied,
          final_status: result.agentLog.final_status,
        })

        controller.close()
      } catch (error) {
        console.error('[SSE] Planning failed:', error)
        emitEvent({
          type: 'error',
          message:
            error instanceof Error ? error.message : 'Error desconocido al generar el plan',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Map violations to user-friendly conflict details
 */
function mapViolationsToConflicts(
  violations: PlanningAgentResult['agentLog']['violations_found']
) {
  // Group violations by rule
  const violationsByRule = new Map<string, typeof violations>()

  for (const violation of violations) {
    const existing = violationsByRule.get(violation.rule_id) || []
    existing.push(violation)
    violationsByRule.set(violation.rule_id, existing)
  }

  // Convert to conflict details
  return Array.from(violationsByRule.entries()).map(([, ruleViolations]) => {
    const firstViolation = ruleViolations[0]

    return {
      rule_text: firstViolation.rule_text,
      affected_meals: ruleViolations.flatMap((v) =>
        v.affected_meals.map((mealKey) => {
          // Parse "YYYY-MM-DD-MealType" format
          const [dateStr, mealType] = mealKey.split('-').slice(0, 3).join('-').split(/-(Desayuno|Almuerzo|Onces)/)
          const date = new Date(dateStr)
          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
          const day = dayNames[date.getDay()]

          return {
            day,
            meal_type: mealType || 'Comida',
            explanation: v.explanation,
          }
        })
      ),
      suggestion: firstViolation.suggested_fix || 'Cambia estos ingredientes manualmente',
    }
  })
}

/**
 * Generate traditional plan without AI validation
 */
function generateTraditionalPlan(
  config: PlanningConfig,
  ingredients: FoodIngredient[],
  patterns: MealPattern[]
) {
  const engine = new WeeklyPlanningEngine(ingredients, patterns, config)
  const result = engine.generatePlan()

  return {
    planningResult: result,
    agentLog: null,
  }
}

/**
 * Simple rate limiting check
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = rateLimitMap.get(userId) || []

  // Filter out old requests outside the window
  const recentRequests = userRequests.filter((time) => now - time < RATE_WINDOW)

  if (recentRequests.length >= RATE_LIMIT) {
    return false
  }

  // Add current request
  recentRequests.push(now)
  rateLimitMap.set(userId, recentRequests)

  return true
}
