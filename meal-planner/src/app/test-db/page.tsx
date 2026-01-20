'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TestResult {
  success: boolean
  error?: {
    message: string
    details: string
    hint: string
    code: string
  } | null
  data?: unknown
  envURL?: string
  envKeyPreview?: string
  exception?: string
  stack?: string
}

export default function TestDBPage() {
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function testConnection() {
    setLoading(true)
    setResult(null)

    try {
      console.log('Testing Supabase connection...')
      console.log('URL from env:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Key from env:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')

      // Test 1: Simple query
      const { data, error } = await supabase
        .from('food_ingredients')
        .select('count')
        .limit(1)

      setResult({
        success: !error,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : null,
        data: data,
        envURL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        envKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...'
      })

      console.log('Result:', { data, error })
    } catch (err) {
      console.error('Exception:', err)
      setResult({
        success: false,
        exception: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Test Database Connection
        </h1>
        <p className="text-gray-600">
          Prueba de conexión a Supabase
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Result: {result.success ? '✅ Success' : '❌ Failed'}
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-700">Environment Variables:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify({
                  url: result.envURL,
                  keyPreview: result.envKeyPreview
                }, null, 2)}
              </pre>
            </div>

            {result.error && (
              <div>
                <h3 className="font-semibold text-sm text-red-700">Error:</h3>
                <pre className="bg-red-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(result.error, null, 2)}
                </pre>
              </div>
            )}

            {result.exception && (
              <div>
                <h3 className="font-semibold text-sm text-red-700">Exception:</h3>
                <pre className="bg-red-50 p-3 rounded text-xs overflow-auto">
                  {result.exception}
                </pre>
              </div>
            )}

            {result.data !== undefined && (
              <div>
                <h3 className="font-semibold text-sm text-green-700">Data:</h3>
                <pre className="bg-green-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm text-gray-700">Full Result:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
