-- Add pursue_now_opportunity_ids array to strategies.
-- Replaces the single primary_opportunity_id constraint with a multi-select approach.
-- primary_opportunity_id is kept for backward compatibility (sidebar uses it).

alter table strategies
  add column if not exists pursue_now_opportunity_ids uuid[] default '{}';
