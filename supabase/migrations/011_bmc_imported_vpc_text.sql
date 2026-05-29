-- BMC: store free-text VPC descriptions imported via the "Import VPC as text" entry path.
-- Array of { segment: string, text: string }.
alter table business_model_canvases
  add column if not exists imported_vpc_text jsonb default '[]';
