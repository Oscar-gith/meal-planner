-- Migration: Create agent_logs table for AI agent execution tracking
-- This table stores logs of LangGraph agent executions for debugging and transparency

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context: who and what
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,

  -- Execution metadata
  iteration_count INT NOT NULL DEFAULT 0,
  total_duration_ms INT NOT NULL DEFAULT 0,
  llm_provider TEXT NOT NULL DEFAULT 'gemini', -- 'gemini' | 'openai'
  total_tokens_used INT NOT NULL DEFAULT 0,

  -- Agent state and results
  violations_found JSONB NOT NULL DEFAULT '[]'::jsonb,
  modifications_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_status TEXT NOT NULL, -- 'success' | 'max_iterations' | 'error'
  error_message TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own agent logs
DROP POLICY IF EXISTS "Users can view their own agent logs" ON agent_logs;
CREATE POLICY "Users can view their own agent logs" ON agent_logs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Policy: Allow system to insert logs (no user restriction for INSERT)
DROP POLICY IF EXISTS "System can insert agent logs" ON agent_logs;
CREATE POLICY "System can insert agent logs" ON agent_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_family_id ON agent_logs(family_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_plan_id ON agent_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_final_status ON agent_logs(final_status);

-- Comment for documentation
COMMENT ON TABLE agent_logs IS 'Stores execution logs from LangGraph AI agents for meal planning rule validation';
COMMENT ON COLUMN agent_logs.violations_found IS 'Array of rule violations detected by the agent (JSON array)';
COMMENT ON COLUMN agent_logs.modifications_applied IS 'Array of modifications made by the agent to fix violations (JSON array)';
COMMENT ON COLUMN agent_logs.final_status IS 'Final status of agent execution: success (no violations), max_iterations (stopped after 3 tries), or error (exception occurred)';
