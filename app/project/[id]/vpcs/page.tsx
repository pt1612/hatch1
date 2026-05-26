import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VPCDashboardClient from './VPCDashboardClient'

export const dynamic = 'force-dynamic'

export default async function VPCDashboardPage({
  params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!project) redirect('/dashboard')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, name')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // Load VPCs with new schema fields only
  const { data: vpcsData, error: vpcsErr } = await supabase
    .from('vpcs')
    .select('id, customer_profile_name, source_type, customer_profile, value_map, is_aggregate, created_at, interview_attachment')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  if (vpcsErr) {
    console.error('[vpcs/page] load error:', vpcsErr)
  }

  const vpcs = vpcsData ?? []
  const vpcIds = vpcs.map((v) => v.id)

  // Load opportunity links via junction table
  const { data: vpcOppLinks } = vpcIds.length > 0
    ? await supabase
        .from('vpc_opportunities')
        .select('vpc_id, opportunity_id')
        .in('vpc_id', vpcIds)
    : { data: [] }

  // Load aggregate source links
  const aggregateVpcIds = vpcs.filter((v) => v.is_aggregate).map((v) => v.id)
  const { data: aggregateLinks } = aggregateVpcIds.length > 0
    ? await supabase
        .from('vpc_aggregates')
        .select('aggregate_vpc_id, source_vpc_id')
        .in('aggregate_vpc_id', aggregateVpcIds)
    : { data: [] }

  return (
    <VPCDashboardClient
      project={project}
      opportunities={opportunities ?? []}
      vpcs={vpcs}
      vpcOpportunities={vpcOppLinks ?? []}
      aggregateLinks={aggregateLinks ?? []}
    />
  )
}
