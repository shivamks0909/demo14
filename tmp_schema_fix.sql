-- Add missing columns to responses table
ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS supplier_uid TEXT,
  ADD COLUMN IF NOT EXISTS client_uid_sent TEXT,
  ADD COLUMN IF NOT EXISTS client_pid TEXT,
  ADD COLUMN IF NOT EXISTS hash_identifier TEXT,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geo_country TEXT;

-- Add missing columns to projects table 
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pid_prefix TEXT,
  ADD COLUMN IF NOT EXISTS pid_counter INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pid_padding INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS force_pid_as_uid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_uid TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
