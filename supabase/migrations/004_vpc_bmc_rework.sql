-- Add per-twin value map and BMC data to twin_interviews
ALTER TABLE twin_interviews ADD COLUMN IF NOT EXISTS value_map jsonb DEFAULT '{}';
ALTER TABLE twin_interviews ADD COLUMN IF NOT EXISTS bmc_data  jsonb DEFAULT '{}';
