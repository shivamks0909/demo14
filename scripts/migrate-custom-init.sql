-- Migration: Add custom fields for TrustSample integration
-- Adds transaction_id and is_manual columns to responses table

-- Add transaction_id column (for custom transaction tracking)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Add is_manual flag (to track manual vs automated entries)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

-- Create index for transaction_id lookups
CREATE INDEX IF NOT EXISTS idx_responses_transaction_id ON responses(transaction_id);

-- Create index for is_manual queries
CREATE INDEX IF NOT EXISTS idx_responses_is_manual ON responses(is_manual);

-- Update existing responses to have NULL transaction_id and FALSE is_manual
-- (default values are already set, but this ensures consistency)
UPDATE responses SET transaction_id = NULL WHERE transaction_id IS NULL;
UPDATE responses SET is_manual = FALSE WHERE is_manual IS NULL;
