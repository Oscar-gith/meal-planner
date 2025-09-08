'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Test 1: Basic connection
      const { data: testData, error: testError } = await supabase
        .from('food_items')
        .select('count(*)')
        .single()
      
      let output = '=== TEST RESULTS ===\n'
      output += `1. Connection: ${testError ? 'FAILED' : 'SUCCESS'}\n`
      if (testError) output += `   Error: ${testError.message}\n`
      if (testData) output += `   Count: ${testData.count}\n`
      
      // Test 2: Simple select
      const { data: simpleData, error: simpleError } = await supabase
        .from('food_items')
        .select('id, meal_type, subtype, name')
        .limit(5)
      
      output += `\n2. Simple select: ${simpleError ? 'FAILED' : 'SUCCESS'}\n`
      if (simpleError) output += `   Error: ${simpleError.message}\n`
      if (simpleData) {
        output += `   Results: ${simpleData.length} items\n`
        simpleData.forEach(item => {
          output += `   - ${item.meal_type} > ${item.subtype} > ${item.name}\n`
        })
      }
      
      // Test 3: Rules table
      const { data: rulesData, error: rulesError } = await supabase
        .from('rules')
        .select('*')
        .limit(3)
        
      output += `\n3. Rules table: ${rulesError ? 'FAILED' : 'SUCCESS'}\n`
      if (rulesError) output += `   Error: ${rulesError.message}\n`
      if (rulesData) {
        output += `   Rules: ${rulesData.length} found\n`
        rulesData.forEach(rule => {
          output += `   - ${rule.meal_type || 'General'}: ${rule.rule_text}\n`
        })
      }
      
      setResult(output)
    } catch (err) {
      setResult(`EXCEPTION: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Debug Database Connection
        </h1>
        <p className="text-gray-600">
          Test connection to Supabase database
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {loading ? '🔄 Testing...' : '🧪 Run Tests'}
        </button>
        
        {result && (
          <div className="bg-gray-100 rounded-md p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}