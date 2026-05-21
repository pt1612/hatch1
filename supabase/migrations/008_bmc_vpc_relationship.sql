-- Business Model Canvas as Level 3:
-- one primary VPC per BMC, optional secondary VPCs over time.

alter table business_model_canvases
  add column if not exists project_id uuid references projects on delete cascade;

update business_model_canvases bmc
set project_id = opportunities.project_id
from opportunities
where bmc.opportunity_id = opportunities.id
  and bmc.project_id is null;

alter table business_model_canvases
  alter column project_id set not null;

alter table business_model_canvases
  alter column opportunity_id drop not null;

alter table business_model_canvases
  add column if not exists title text;

update business_model_canvases
set title = coalesce(title, 'Business Model Canvas')
where title is null;

create table if not exists bmc_vpcs (
  bmc_id uuid references business_model_canvases on delete cascade not null,
  vpc_id uuid references vpcs on delete restrict not null,
  role text not null check (role in ('primary', 'secondary')),
  created_at timestamptz default now(),
  primary key (bmc_id, vpc_id)
);

create unique index if not exists bmc_vpcs_one_primary_idx
  on bmc_vpcs (bmc_id)
  where role = 'primary';

create index if not exists bmc_vpcs_vpc_id_idx on bmc_vpcs(vpc_id);

alter table bmc_vpcs enable row level security;

drop policy if exists "bmc_vpcs_own" on bmc_vpcs;
create policy "bmc_vpcs_own" on bmc_vpcs
  for all using (
    exists (
      select 1 from business_model_canvases
      join projects on projects.id = business_model_canvases.project_id
      where business_model_canvases.id = bmc_vpcs.bmc_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "bmc_own" on business_model_canvases;
create policy "bmc_own" on business_model_canvases
  for all using (
    exists (
      select 1 from projects
      where projects.id = business_model_canvases.project_id
        and projects.user_id = auth.uid()
    )
  );

-- Backfill a primary VPC for legacy BMCs.
insert into vpcs (
  project_id,
  customer_profile_name,
  source_type,
  customer_profile,
  value_map,
  final_canvas
)
select
  bmc.project_id,
  coalesce(nullif(opportunities.customer_segment, ''), opportunities.name, 'Primary segment'),
  'legacy_bmc',
  jsonb_build_object(
    'jobs', '[]'::jsonb,
    'pains', '[]'::jsonb,
    'gains', to_jsonb(coalesce(bmc.customer_segments, '{}'))
  ),
  jsonb_build_object(
    'productsAndServices', to_jsonb(coalesce(bmc.value_propositions, '{}')),
    'painRelievers', '[]'::jsonb,
    'gainCreators', '[]'::jsonb
  ),
  jsonb_build_object(
    'productsAndServices', to_jsonb(coalesce(bmc.value_propositions, '{}')),
    'painRelievers', '[]'::jsonb,
    'gainCreators', '[]'::jsonb,
    'jobs', '[]'::jsonb,
    'pains', '[]'::jsonb,
    'gains', to_jsonb(coalesce(bmc.customer_segments, '{}'))
  )
from business_model_canvases bmc
left join opportunities on opportunities.id = bmc.opportunity_id
where not exists (
  select 1 from bmc_vpcs
  where bmc_vpcs.bmc_id = bmc.id
    and bmc_vpcs.role = 'primary'
)
and not exists (
  select 1
  from vpc_opportunities
  join vpcs on vpcs.id = vpc_opportunities.vpc_id
  where vpc_opportunities.opportunity_id = bmc.opportunity_id
    and vpcs.project_id = bmc.project_id
);

insert into vpc_opportunities (vpc_id, opportunity_id)
select vpcs.id, bmc.opportunity_id
from business_model_canvases bmc
join opportunities on opportunities.id = bmc.opportunity_id
join vpcs on vpcs.project_id = bmc.project_id
  and vpcs.source_type = 'legacy_bmc'
  and vpcs.customer_profile_name = coalesce(nullif(opportunities.customer_segment, ''), opportunities.name, 'Primary segment')
where bmc.opportunity_id is not null
on conflict (vpc_id, opportunity_id) do nothing;

insert into bmc_vpcs (bmc_id, vpc_id, role)
select distinct on (bmc.id)
  bmc.id,
  vpcs.id,
  'primary'
from business_model_canvases bmc
join vpc_opportunities on vpc_opportunities.opportunity_id = bmc.opportunity_id
join vpcs on vpcs.id = vpc_opportunities.vpc_id and vpcs.project_id = bmc.project_id
where bmc.opportunity_id is not null
  and not exists (
    select 1 from bmc_vpcs
    where bmc_vpcs.bmc_id = bmc.id
      and bmc_vpcs.role = 'primary'
  )
order by bmc.id, vpcs.created_at asc;
