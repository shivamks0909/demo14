-- ===================================================================
-- PHASE 1: ADD MISSING FIELDS FOR S2S VERIFICATION & FRAUD DETECTION
-- ===================================================================
-- This script adds ONLY the minimal required fields to match spec
-- Safe to run on production - adds columns, doesn't modify data
-- ===================================================================

-- 1. Add s2s_token to responses
ALTER TABLE responses ADD COLUMN IF NOT EXISTS s2s_token TEXT;

-- 2. Add is_fake_suspected flag to responses
ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_fake_suspected BOOLEAN DEFAULT FALSE;

-- 3. Add unverified_action to s2s_config
ALTER TABLE s2s_config ADD COLUMN IF NOT EXISTS unverified_action TEXT DEFAULT 'terminate' CHECK (unverified_action IN ('terminate', 'allow', 'flag'));

-- ===================================================================
-- Indexes for performance (safe to add)
-- ===================================================================

-- Index for s2s_token lookups
CREATE INDEX IF NOT EXISTS idx_responses_s2s_token ON responses(s2s_token);

-- Index for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_responses_fake_suspected ON responses(is_fake_suspected);

-- ===================================================================
-- MIGRATION COMPLETE
-- ===================================================================

SELECT
    'Schema migration complete:' as message,
    '  • responses.s2s_token added' as item1,
    '  • responses.is_fake_suspected added' as item2,
    '  • s2s_config.unverified_action added' as item3,
    '  • Indexes created' as item4;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('responses', 's2s_config')
    AND column_name IN ('s2s_token', 'is_fake_suspected', 'unverified_action')
ORDER BY table_name, column_name;
