create table if not exists business_model_canvases (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities on delete cascade not null unique,
  value_propositions text[] default '{}',
  customer_segments text[] default '{}',
  customer_relationships text[] default '{}',
  channels text[] default '{}',
  key_activities text[] default '{}',
  key_resources text[] default '{}',
  key_partners text[] default '{}',
  revenue_streams text[] default '{}',
  cost_structure text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table business_model_canvases enable row level security;

create policy "bmc_own" on business_model_canvases
  for all using (
    exists (
      select 1 from opportunities
      join projects on projects.id = opportunities.project_id
      where opportunities.id = business_model_canvases.opportunity_id
        and projects.user_id = auth.uid()
    )
  );
