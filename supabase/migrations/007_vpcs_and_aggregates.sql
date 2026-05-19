-- vpcs: standalone VPC records per twin (leaf) or aggregate
CREATE TABLE vpcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  opportunity_id uuid REFERENCES opportunities ON DELETE SET NULL,
  twin_id uuid REFERENCES twins ON DELETE SET NULL,
  name text NOT NULL,
  is_aggregate boolean DEFAULT false NOT NULL,
  customer_profile jsonb DEFAULT '{"jobs": [], "pains": [], "gains": []}' NOT NULL,
  value_map jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One VPC per twin (for leaf VPCs only)
CREATE UNIQUE INDEX vpcs_twin_unique ON vpcs(twin_id) WHERE twin_id IS NOT NULL AND NOT is_aggregate;

-- vpc_aggregates: links an aggregate VPC to its sources
CREATE TABLE vpc_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_vpc_id uuid REFERENCES vpcs(id) ON DELETE CASCADE NOT NULL,
  source_vpc_id uuid REFERENCES vpcs(id) ON DELETE CASCADE NOT NULL
);

-- RLS
ALTER TABLE vpcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpc_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpcs_own" ON vpcs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = vpcs.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "vpc_aggregates_own" ON vpc_aggregates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vpcs
      JOIN projects ON projects.id = vpcs.project_id
      WHERE vpcs.id = vpc_aggregates.aggregate_vpc_id
        AND projects.user_id = auth.uid()
    )
  );
