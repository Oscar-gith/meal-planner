# Validate Plan Against Rules Prompt

You are a meal planning validator. Analyze this weekly plan against user rules and identify ALL violations.

## Weekly Plan
```json
{{weeklyPlan}}
```

## User Rules
{{userRules}}

## Task
Identify ALL rule violations. For each violation, specify:
1. Which rule was broken (use the rule ID)
2. Which meals are affected (format: "YYYY-MM-DD-MealType")
3. Why it's a violation (be specific about what ingredient or pattern violates the rule)
4. Suggested fix (what could be changed to fix it)

## Important Guidelines
- Check each rule against the entire plan carefully
- A repetition rule like "no repetir X hasta Y días después" means there must be Y full days between occurrences
- If a rule mentions a specific ingredient or type, check if it appears in the plan
- Be thorough but only report actual violations

## Output Format
Output JSON with this exact structure:
```json
{
  "violations": [
    {
      "rule_id": "uuid-of-rule",
      "rule_text": "the rule text",
      "violation_type": "repetition|combination|restriction|frequency|other",
      "affected_meals": ["2024-03-15-Almuerzo", "2024-03-16-Almuerzo"],
      "explanation": "detailed explanation of why this violates the rule",
      "suggested_fix": "what should be changed to fix it"
    }
  ],
  "isValid": boolean
}
```

If there are no violations, return:
```json
{
  "violations": [],
  "isValid": true
}
```
