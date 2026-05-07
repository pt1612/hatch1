-- Add aggregate BMC attribution column to store which twins' VPC elements
-- inspired each generated item. Shape: { blockKey: { itemText: twinIndices[] } }
ALTER TABLE business_model_canvases
  ADD COLUMN IF NOT EXISTS agg_attribution jsonb DEFAULT '{}';
