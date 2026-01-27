# Prompts Directory

This directory contains all LLM prompts used by the Meal Planner AI system. Prompts are stored as external Markdown files to separate content from code logic.

## Benefits of External Prompts

✅ **Easy to edit** - Modify prompts without touching TypeScript code
✅ **Version control** - See prompt changes independently in git history
✅ **Collaboration** - Non-developers can edit prompts
✅ **A/B testing** - Easy to create and test prompt variants
✅ **Clean code** - Separation of concerns (logic vs content)

## Available Prompts

### 1. validate-rule.md
**Purpose:** Validates if a user-created rule is relevant to meal planning

**Variables:**
- `ruleText` (string) - The rule text to validate
- `ingredientTypes` (string) - Comma-separated list of ingredient types
- `availableIngredients` (string, optional) - Comma-separated list of ingredient names

**Usage:**
```typescript
import { getPrompt } from '@/lib/prompts/prompt-loader'

const prompt = getPrompt('validate-rule', {
  ruleText: 'no repetir huevos hasta 2 días después',
  ingredientTypes: 'Proteína, Carb, Fruta',
  availableIngredients: 'huevos, arroz, manzana',
})
```

**Expected Output:** JSON with `{ is_valid, reason, suggestion, inferred_meal_type, inferred_ingredients }`

---

### 2. validate-plan.md
**Purpose:** Validates a weekly plan against active user rules

**Variables:**
- `weeklyPlan` (string) - JSON string of the WeeklyPlan object
- `userRules` (string) - Formatted list of rules with IDs

**Usage:**
```typescript
const prompt = getPrompt('validate-plan', {
  weeklyPlan: JSON.stringify(plan, null, 2),
  userRules: '1. [uuid] no repetir huevos...\n2. [uuid2] máximo 2 veces arroz...',
})
```

**Expected Output:** JSON with `{ violations: [...], isValid: boolean }`

---

### 3. suggest-modifications.md
**Purpose:** Suggests ingredient replacements to fix rule violations

**Variables:**
- `violations` (string) - JSON string of RuleViolation array
- `currentPlan` (string) - JSON string of the WeeklyPlan object
- `availableIngredients` (string) - JSON string of FoodIngredient array
- `availablePatterns` (string) - JSON string of MealPattern array

**Usage:**
```typescript
const prompt = getPrompt('suggest-modifications', {
  violations: JSON.stringify(violations, null, 2),
  currentPlan: JSON.stringify(plan, null, 2),
  availableIngredients: JSON.stringify(ingredients, null, 2),
  availablePatterns: JSON.stringify(patterns, null, 2),
})
```

**Expected Output:** JSON with `{ modifications: [...] }`

---

## Template Syntax

### Simple Variables
Replace with actual value:
```markdown
The rule is: {{ruleText}}
```

### Conditionals
Show content only if variable is truthy:
```markdown
{{#if availableIngredients}}
## Available Ingredients
{{availableIngredients}}
{{/if}}
```

## Editing Prompts

1. Open the relevant `.md` file in this directory
2. Edit the prompt text directly
3. Keep variable names consistent (use existing `{{variableName}}` syntax)
4. Test changes by running the application
5. Commit changes with descriptive message

**Note:** The prompt loader caches templates in production. Restart the server to see changes.

## Adding New Prompts

1. Create a new `.md` file in this directory
2. Use template syntax for variables: `{{variableName}}`
3. Add documentation to this README
4. Use in code:
   ```typescript
   import { getPrompt } from '@/lib/prompts/prompt-loader'
   const prompt = getPrompt('your-new-prompt', { variableName: 'value' })
   ```

## Technical Details

**Prompt Loader:** [prompt-loader.ts](./prompt-loader.ts)
**Used by:** [gemini-client.ts](../llm/gemini-client.ts)

**Features:**
- File-based template loading
- Variable interpolation (`{{var}}`)
- Conditional sections (`{{#if var}}...{{/if}}`)
- In-memory caching for performance
- Clear error messages if template not found

## Recent Improvements

### ✅ suggest-modifications.md - Pattern Validation (2026-01-26)
**Fixed:** Prompt now explicitly validates that suggested ingredients match pattern requirements.

**Improvements added:**
- ✅ "Pattern Validation Rules" section with step-by-step guide
- ✅ Example pattern structure showing `required_components`
- ✅ Concrete examples (valid ✅ and invalid ❌) for each meal type
- ✅ Validation checklist for the LLM to self-verify
- ✅ Clear count and type verification guidelines

**Result:** AI should now suggest complete, valid ingredient sets that match pattern requirements exactly.

---

**Last updated:** 2026-01-26
**Maintained by:** Development team
