/**
 * Prompt Loader and Template Processor
 * Loads prompts from external files and processes template variables
 */

import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Cache for loaded prompts (in production, avoid reading files on every request)
 */
const promptCache = new Map<string, string>()

/**
 * Template variables that can be used in prompts
 */
export type PromptVariables = Record<string, string | boolean | undefined>

/**
 * Load a prompt from file
 * @param filename - Name of the prompt file (without .md extension)
 * @returns The raw prompt template
 */
export function loadPromptTemplate(filename: string): string {
  // Check cache first
  if (promptCache.has(filename)) {
    return promptCache.get(filename)!
  }

  try {
    const promptPath = join(process.cwd(), 'src', 'lib', 'prompts', `${filename}.md`)
    const template = readFileSync(promptPath, 'utf-8')

    // Cache the template
    promptCache.set(filename, template)

    return template
  } catch (error) {
    throw new Error(`Failed to load prompt template: ${filename}. Error: ${error}`)
  }
}

/**
 * Process template variables in a prompt
 * Supports:
 * - Simple variables: {{variableName}}
 * - Conditionals: {{#if variableName}}...{{/if}}
 *
 * @param template - The prompt template string
 * @param variables - Object with variable values
 * @returns Processed prompt string
 */
export function processTemplate(template: string, variables: PromptVariables): string {
  let processed = template

  // Process conditionals first: {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  processed = processed.replace(conditionalRegex, (match, varName, content) => {
    const value = variables[varName]
    // Show content if variable is truthy (exists and not false/empty)
    return value ? content : ''
  })

  // Process simple variable replacements: {{variable}}
  const variableRegex = /\{\{(\w+)\}\}/g
  processed = processed.replace(variableRegex, (match, varName) => {
    const value = variables[varName]
    // Convert to string, or empty string if undefined
    return value !== undefined ? String(value) : ''
  })

  return processed
}

/**
 * Load and process a prompt template in one step
 * @param filename - Name of the prompt file (without .md extension)
 * @param variables - Variables to inject into the template
 * @returns Fully processed prompt ready to send to LLM
 */
export function getPrompt(filename: string, variables: PromptVariables): string {
  const template = loadPromptTemplate(filename)
  return processTemplate(template, variables)
}

/**
 * Clear the prompt cache (useful for development/testing)
 */
export function clearPromptCache(): void {
  promptCache.clear()
}
