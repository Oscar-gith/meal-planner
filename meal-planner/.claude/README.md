# Claude Code Configuration

This directory contains Claude Code hooks and configuration for the Meal Planner project.

## What are Hooks?

Hooks are shell scripts that run automatically when certain events occur in Claude Code (session start, session end, tool usage, etc.). They help automate repetitive tasks and add context to your sessions.

## Configured Hooks

### SessionStart Hook

**Location:** `.claude/hooks/session-start.sh`

**Runs:** Every time you start or resume a Claude Code session

**Purpose:** Adds a friendly reminder to Claude's context about reading BACKLOG.md before starting work

**What it does:**
- Displays a message in Claude's context with key documentation files
- Reminds Claude to present options before starting work

### SessionEnd Hook

**Location:** `.claude/hooks/session-end.sh`

**Runs:** When you end a Claude Code session

**Purpose:** Logs session end time and reminds you to update documentation

**What it does:**
- Logs session end time to `.claude/session-log.txt`
- Shows a reminder message about running the session close prompt
- Does NOT automatically update docs (you still need to run the close prompt)

## How to Activate Hooks

The hooks are already configured in `.claude/settings.json`. To activate them:

1. **Make scripts executable:**
   ```bash
   chmod +x .claude/hooks/*.sh
   ```

2. **Verify configuration:**
   ```bash
   /hooks
   ```
   This opens an interactive interface to view/edit hooks.

3. **Test the hooks:**
   - Start a new Claude Code session - you should see the SessionStart message
   - End a session - you should see the SessionEnd reminder

## Customizing Hooks

### Add More Context on SessionStart

Edit `.claude/hooks/session-start.sh` to add more information. For example:

```bash
# Show recent git commits
echo "Recent commits:"
git log --oneline -3

# Show current branch
echo "Current branch: $(git branch --show-current)"
```

### Add Validation on SessionEnd

Edit `.claude/hooks/session-end.sh` to check if docs were updated:

```bash
# Check if BACKLOG.md was modified today
if [ "$(git diff --name-only docs/BACKLOG.md)" ]; then
  echo "⚠️  BACKLOG.md has uncommitted changes - remember to commit!"
fi
```

### Add PreToolUse Hooks

Add to `.claude/settings.json` to validate commands before execution:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Running bash command...'"
          }
        ]
      }
    ]
  }
}
```

## Session Log

The SessionEnd hook logs session information to `.claude/session-log.txt`. You can review this file to see your session history:

```bash
cat .claude/session-log.txt
```

**Note:** This file is gitignored (add it to `.gitignore` if needed).

## Best Practices

1. **Keep hooks fast:** SessionStart runs every time, so keep scripts under 5 seconds
2. **Don't auto-commit:** Hooks should remind, not auto-commit docs
3. **Test changes:** Test hook scripts manually before adding them to config
4. **Use absolute paths:** When possible, use `$CLAUDE_PROJECT_DIR` for portability

## Troubleshooting

### Hooks not running?

1. Check scripts are executable: `ls -la .claude/hooks/`
2. Check for syntax errors: `bash -n .claude/hooks/session-start.sh`
3. Run script manually: `.claude/hooks/session-start.sh`

### Want to disable hooks temporarily?

Rename `.claude/settings.json` to `.claude/settings.json.disabled`

## Learn More

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide.md)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks.md)
- Project session workflow: See [CLAUDE.md](../CLAUDE.md#session-workflow)
